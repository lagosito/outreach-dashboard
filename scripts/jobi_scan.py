#!/usr/bin/env python3
"""JOBI daily LinkedIn scan: keywords (treg) + optional feed dump -> score -> linkedin_engagements.

Usage:
  python3 jobi_scan.py [--feed-dump FILE] [--dry-run] [--json]

Exit 0 always prints a JSON digest:
  {"scanned": N, "new": N, "inserted": N, "rows": [{score, author, url, draft}], "errors": [...]}

Keyword search goes through treg (anyapi.linkedin.search.posts, ~$0.002/call).
Scoring: gpt-4o-mini via OrcaRouter (~$0.005/day at 40 posts).
Feed dumps: JSON file saved by the LinkedIn MCP get_feed call (needs references.feed_post /posts/ links).
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

QUERIES = ["AI visibility GEO", "KI Marketing Automation"]
DATE_WINDOW = "last-week"  # fallback "last-day" not verified
THRESHOLD = 75
MAX_CANDIDATES = 40
CHUNK = 15
LI_HOME = "https://www.linkedin.com"

PROMPT_RULES = """Eres el filtro de oportunidades de engagement de JOBI (Gabriel Lagos, Make Happen GmbH / El Kiosk, DACH).
Para cada post, devuelve un objeto con:
- "score" (0-100): oportunidad real de aportar valor a la conversacion. Alto = el post trata temas donde Gabriel tiene experiencia genuina (Generative Engine Optimization / AI visibility / SEO, KI-Marketing-automation, contenido, growth, agencias B2B, hiring de creativos/tech en DACH) Y hay hueco para un comentario sustantivo. Bajo = spam, promotion pura, off-topic, ya con 50+ comentarios de respuesta, o conversacion cerrada.
- "is_relevant": true solo si score >= 70.
- "reason": una linea en espanol (max 120 caracteres).
- "comment_draft": si is_relevant, borrador de comentario (matchea el idioma del post: aleman con aleman, ingles con ingles). Reglas duras: 1) empieza con valor concreto real (dato, matiz, experiencia), 2) nunca suena a marketing, 3) menciona GEO-Check / El Kiosk SOLO si encaja de forma natural y casi nunca (max 1 de cada 5 borradores), 4) sin em dash ni en dash, 5) 150-350 caracteres, 6) termina con una pregunta corta o un punto fuerte.
Devuelve SOLO un array JSON con EXACTAMENTE un objeto por post, en el mismo orden de entrada, y en cada objeto incluye "url" con la URL tal cual la recibiste. Sin markdown."""


def env(path, key):
    try:
        with open(os.path.expanduser(path)) as f:
            for line in f:
                line = line.strip()
                if line.startswith(key + "=") and not line.startswith("#"):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError:
        return None
    return None


def keys():
    supa_url = (env("~/outreach-dashboard/.env.local", "SUPABASE_URL") or "").rstrip("/")
    supa_key = env("~/outreach-dashboard/.env.local", "SUPABASE_SERVICE_ROLE_KEY")
    orca = env("~/.hermes/.env", "ORCAROUTER_API_KEY") or env(
        "~/.hermes/CREDENTIALS_MASTER.env", "ORCAROUTER_API_KEY"
    )
    return supa_url, supa_key, orca


def http_json(url, headers, data=None, tries=3, timeout=90):
    body = None if data is None else json.dumps(data).encode()
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=body, headers=headers, method="POST" if body else "GET")
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read().decode()
                return json.loads(raw) if raw else {}
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    raise last if last else RuntimeError("request failed")


# ---------------- candidates: keyword search via treg ----------------

def fetch_keyword_posts(errors):
    candidates = []
    for q in QUERIES:
        try:
            r = subprocess.run(
                ["treg", "call", "anyapi.linkedin.search.posts", "--data", json.dumps({"query": q, "datePosted": DATE_WINDOW}), "--json"],
                capture_output=True, text=True, timeout=120,
            )
            d = json.loads(r.stdout)
            posts = (d.get("output") or {}).get("data", {}).get("posts", [])
        except Exception as e:
            errors.append(f"treg '{q}': {e}")
            continue
        for p in posts:
            if not p.get("url"):
                continue
            candidates.append({
                "url": p["url"],
                "author": p.get("authorName") or "",
                "role": "",
                "text": (p.get("text") or "")[:8000],
                "source": "keyword",
                "keyword": q,
                "posted_at": epoch_to_iso(p.get("createdUtc")),
            })
    return candidates


def epoch_to_iso(ts):
    if not ts:
        return None
    try:
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(ts)))
    except Exception:
        return None


# ---------------- candidates: feed dump from LinkedIn MCP ----------------

TIME_RE = re.compile(r"^\s*(\d+)([hdw])\s*•")
DEGREE_RE = re.compile(r"•\s*(2nd|3rd\+?|1st)")


def _norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _common_prefix(a, b):
    n = 0
    for x, y in zip(a, b):
        if x != y:
            break
        n += 1
    return n


def _slug_author(slug):
    # slug like 'firstname-lastname_topic-words-share-123-abc'
    body = slug.split("?")[0]
    core = re.split(r"-(?:share|ugcPost|activity)-\d+", body)[0]
    if "_" in core:
        return core.split("_")[0]
    return core


def parse_feed_dump(path, errors):
    try:
        with open(os.path.expanduser(path)) as f:
            d = json.load(f)
        if isinstance(d.get("result"), str):
            d = json.loads(d["result"])
        feed = d["sections"]["feed"]
        refs = [
            r["url"].split("/posts/", 1)[1]
            for r in (d.get("references", {}).get("feed") or [])
            if r.get("kind") == "feed_post" and str(r.get("url", "")).startswith("/posts/")
        ]
    except Exception as e:
        errors.append(f"feed dump: {e}")
        return []

    blocks = re.split(r"(?:^|\n)Feed post\n", feed)
    candidates = []
    used = set()

    def pick_ref(author, text):
        head = text[:250].lower()
        words = re.findall(r"[a-z\u00e0-\u00ff]{5,}", head)
        best, best_score = None, 0
        for idx, slug in enumerate(refs):
            if idx in used:
                continue
            s = 0
            a, sa = _norm(author), _norm(_slug_author(slug))
            if a and sa and _common_prefix(a, sa) >= 7:
                s += 3
            if a and sa and (a in sa or sa in a) and min(len(a), len(sa)) >= 7:
                s += 3
            sn = _norm(slug)
            hits = sum(1 for w in set(words) if w and w in sn)
            if hits >= 2:
                s += 2 + min(hits, 4)
            if s > best_score:
                best, best_score = idx, s
        if best is not None and best_score >= 3:
            used.add(best)
            return refs[best]
        return None

    for block in blocks:
        lines = block.split("\n")
        t_idx = None
        for j, ln in enumerate(lines):
            if TIME_RE.match(ln):
                t_idx = j
                break
        if t_idx is None or t_idx == 0:
            continue  # promoted/junk without a timestamp
        author = ""
        degree_idx = None
        for j2 in range(t_idx):
            if DEGREE_RE.search(lines[j2]):
                degree_idx = j2
                break
        JUNK_RE = re.compile(r"(likes this|loves this|commented|reposted|^Suggested$|^Promoted$|^Follow$|^Send$)")
        if degree_idx:
            for j2 in range(degree_idx - 1, -1, -1):
                s = lines[j2].strip()
                if s and not JUNK_RE.search(s) and not TIME_RE.match(s):
                    author = s
                    break
        if not author:
            for ln in lines[:t_idx]:
                s = ln.strip()
                if s and not JUNK_RE.search(s) and not TIME_RE.match(s) and not DEGREE_RE.search(s):
                    author = s
                    break
        role_parts = []
        for ln in lines[1:t_idx]:
            s = ln.strip()
            if not s or DEGREE_RE.search(s) or JUNK_RE.search(s) or s in ("Follow", "Promoted") or s == author:
                continue
            role_parts.append(s)
        m = TIME_RE.match(lines[t_idx])
        if not m:
            continue
        posted_at = rel_to_iso(m.group(1), m.group(2))
        start_ln = None
        for k in range(t_idx + 1, min(t_idx + 4, len(lines))):
            if lines[k].strip() == "Follow":
                start_ln = k + 1
                break
        if start_ln is None:
            start_ln = t_idx + 1
        text_lines = []
        for ln in lines[start_ln:]:
            s = ln.strip()
            if s == "Like" or re.match(r"^\d+\s*(reactions?|comments?|reposts?)$", s) or s.startswith("Are these results helpful?"):
                break
            text_lines.append(ln)
        text = "\n".join(text_lines).replace("\u2026 more", "").strip()
        if not text:
            continue
        slug = pick_ref(author, text)
        if not slug:
            continue  # no verified permalink: drop
        candidates.append({
            "url": LI_HOME + "/posts/" + slug,
            "author": author,
            "role": " ".join(role_parts)[:300],
            "text": text[:8000],
            "source": "feed",
            "keyword": None,
            "posted_at": posted_at,
        })
    return candidates


def rel_to_iso(n, unit):
    n = int(n)
    delta = {"h": 3600, "d": 86400, "w": 604800}[unit] * n
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - delta))


# ---------------- scoring ----------------

def llm_score(candidates, api_key, errors):
    results = {}
    for i in range(0, len(candidates), CHUNK):
        chunk = candidates[i : i + CHUNK]
        posts = "\n\n".join(
            f"URL: {c['url']}\nAutor: {c.get('author','')} {c.get('role','')}\nPost:\n{c['text'][:3000]}"
            for c in chunk
        )
        try:
            resp = http_json(
                "https://api.orcarouter.ai/v1/chat/completions",
                {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
                data={
                    "model": "openai/gpt-4o-mini",
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": PROMPT_RULES},
                        {"role": "user", "content": f"Posts:\n{posts}"},
                    ],
                },
            )
            content = resp["choices"][0]["message"]["content"]
        except Exception as e:
            errors.append(f"llm chunk {i}: {e}")
            continue
        try:
            items = json.loads(content)
        except json.JSONDecodeError:
            m = re.search(r"\[.*\]", content, re.S)
            try:
                items = json.loads(m.group(0)) if m else []
            except Exception:
                items = []
        if isinstance(items, dict):
            items = [items]
        input_urls = [c["url"] for c in chunk]
        for idx, it in enumerate(items):
            if not isinstance(it, dict):
                continue
            url = it.get("url")
            if url not in input_urls:
                url = input_urls[idx] if idx < len(input_urls) else None
            if url:
                results[url] = it
    return results


# ---------------- main ----------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--feed-dump", default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    errors = []
    supa_url, supa_key, orca = keys()
    if not (supa_url and supa_key and orca):
        print(json.dumps({"error": "missing env"}))
        sys.exit(1)

    candidates = fetch_keyword_posts(errors)
    if args.feed_dump:
        candidates += parse_feed_dump(args.feed_dump, errors)

    # dedupe among themselves
    seen, uniq = set(), []
    for c in candidates:
        if c["url"] not in seen:
            seen.add(c["url"])
            uniq.append(c)
    candidates = uniq[:MAX_CANDIDATES]

    # dedupe against DB
    def supa_get(path):
        req = urllib.request.Request(
            supa_url + path, headers={"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)

    existing_rows = supa_get("/rest/v1/linkedin_engagements?select=post_url,dedupe_key")
    existing = set()
    for r in existing_rows:
        for k in (r.get("post_url"), r.get("dedupe_key")):
            if k:
                existing.add(k)
    fresh = [c for c in candidates if c["url"] not in existing]

    digest = {
        "scanned": len(candidates),
        "already_in_db": len(candidates) - len(fresh),
        "new": len(fresh),
        "inserted": 0,
        "dry_run": args.dry_run,
        "errors": errors,
        "rows": [],
    }
    if not fresh:
        print(json.dumps(digest, ensure_ascii=False))
        return

    scores = llm_score(fresh, orca, errors)
    to_insert = []
    for c in fresh:
        s = scores.get(c["url"])
        if not s:
            continue
        score = int(s.get("score") or 0)
        if score >= THRESHOLD and s.get("is_relevant") and s.get("comment_draft"):
            to_insert.append({
                "author_name": (c.get("author") or "")[:200],
                "author_role": (c.get("role") or "")[:300],
                "post_url": c["url"],
                "dedupe_key": c["url"],
                "post_text": (c.get("text") or "")[:20000],
                "post_summary": (s.get("reason") or "")[:500],
                "source": c.get("source") or "keyword",
                "keyword": c.get("keyword"),
                "score": max(0, min(100, score)),
                "status": "pending_approval",
                "comment_draft": s["comment_draft"][:2000],
                "posted_at": c.get("posted_at"),
            })

    inserted = []
    if to_insert and not args.dry_run:
        req = urllib.request.Request(
            supa_url + "/rest/v1/linkedin_engagements?on_conflict=dedupe_key",
            data=json.dumps(to_insert).encode(),
            headers={
                "apikey": supa_key,
                "Authorization": f"Bearer {supa_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation,resolution=ignore-duplicates",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read().decode()
                inserted = json.loads(raw) if raw else []
        except urllib.error.HTTPError as e:
            errors.append(f"insert HTTP {e.code}: {e.read().decode()[:500]}")
        except Exception as e:
            errors.append(f"insert: {e}")

    digest["inserted"] = len(inserted)
    digest["errors"] = errors
    digest["rows"] = [
        {"score": row["score"], "author": row["author_name"], "url": row["post_url"], "draft": row["comment_draft"]}
        for row in (inserted or to_insert)
    ]
    print(json.dumps(digest, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
