#!/usr/bin/env python3
"""JOBI LinkedIn scan v2 (brief Oct 2026) — DACH.

Flujo (cron 08:45):
  keywords activas (tabla linkedin_keywords) + feed dump opcional
  -> dedupe URL -> filtro antiguedad (7d) -> dedupe DB (post + autor 7d)
  -> Prompt A clasificador (lotes) -> descarta: other / no-DACH / score < umbral
  -> conversation -> Prompt B comentario -> linkedin_engagements (status pending)
  -> hiring -> Prompt C x2 (candidate/partner) -> outreach_contacts (fuente linkedin)
  -> stats por keyword (linkedin_keyword_stats) -> digest JSON

Salida: siempre JSON en stdout, exit 0.
Modelo: gpt-4o-mini via OrcaRouter. response_format NO soportado -> parse con fences.

treg anyapi.linkedin.search.posts -> output.data.posts[]:
  {authorName, authorUrl, url, text, createdUtc (unix secs), reactionCount, commentCount, id}
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

DEFAULT_QUERIES = ["KI Sichtbarkeit ChatGPT", "Generative Engine Optimization", "KI Marketing Automation", "AI Visibility Agentur"]
DATE_WINDOW = "last-week"
THRESHOLD = int(os.environ.get("JOBI_SCORE_THRESHOLD", "75"))
MAX_CANDIDATES = 300  # clasificar casi todo: evita sesgo de stats (passed_dach) por cap
JEV_URL = "https://api.typesafe.ai/v1/systemone"
JEV_MODEL = "jev-1.13.0"  # fijado, NO jev-latest
MIN_REACTIONS = int(os.environ.get("JOBI_MIN_REACTIONS", "5"))
MIN_COMMENTS = int(os.environ.get("JOBI_MIN_COMMENTS", "1"))
MAX_PAGES = int(os.environ.get("JOBI_MAX_PAGES", "3"))
SCORE_ANCHORS = ["0 gar nicht geeignet", "1", "2", "3", "4 mittel", "5", "6", "7", "8", "9 perfekt geeignet"]
BUYER_BONUS = {"kmu_entscheider": 1, "marketing_lead": 1, "agentur_berater": 0.5, "recruiter_hr": 0, "sonstige": 0}
ANGLE_BY_AUTHOR = {"kmu_entscheider": "buyer", "marketing_lead": "buyer", "agentur_berater": "expert", "recruiter_hr": "none", "sonstige": "none"}

JEV_QUESTIONS = {
    "post_type": {"type": "choice",
        "instructions": "Ist der Post eine inhaltliche Diskussion, eine Stellenanzeige/Suche nach Personen, oder etwas anderes (Werbung, Event, Glueckwunsch, Firmennews)?",
        "criteria": {"conversation": "Inhaltliche Diskussion mit Fragen oder Meinungen",
                     "hiring": "Stellenanzeige oder Suche nach Personen",
                     "other": "Werbung, Event, Glueckwunsch, Firmennews"}},
    "geo_topic": {"type": "noul",
        "instructions": "Geht es im Post explizit um die Sichtbarkeit von Marken oder Unternehmen in KI-Antworten (ChatGPT, Perplexity, Gemini, AI Overviews) oder um GEO (Generative Engine Optimization)?"},
    "adjacent_topic": {"type": "noul",
        "instructions": "Geht es explizit um KI im Marketing, Content-Erstellung mit KI oder Marketing-Automatisierung?"},
    "author_type": {"type": "choice", "instructions": "Welcher Autortyp?",
        "criteria": {"kmu_entscheider": "Inhaber, Gesellschafter, Entscheider eines KMU",
                     "marketing_lead": "Marketing-Lead oder Marketing-Verantwortlicher",
                     "agentur_berater": "Agentur oder Berater mit aehnlichem Angebot",
                     "recruiter_hr": "Recruiter oder HR", "sonstige": "Sonstige"}},
    "region_dach": {"type": "noul",
        "instructions": "Stammt Autor oder Unternehmen klar aus Deutschland, Oesterreich oder der Schweiz? Hinweis: Der Posttext kann Sprachhinweise liefern."},
    "language": {"type": "choice", "instructions": "Sprache des Post-Textes?",
        "criteria": {"de": "Deutsch", "en": "Englisch", "other": "Andere"}},
    "register": {"type": "choice", "instructions": "Welche Anrede passt zum Autor?",
        "criteria": {"du": "Du-Form", "sie": "Sie-Form", "neutral": "Keine direkte Anrede"}},
    "discussion": {"type": "score",
        "instructions": "Wie gut eignet sich der Post fuer einen fachlichen Kommentar mit eigener Meinung? Skala 0-100.",
        "criteria": SCORE_ANCHORS},
    "hiring_fit": {"type": "score",
        "instructions": "Wie gut passt die Rolle zu: KI-Automatisierung, GEO/SEO, Content, Creative Direction? Skala 0-100.",
        "criteria": SCORE_ANCHORS},
    "hiring_angle": {"type": "choice", "instructions": "Welcher Winkel passt besser?",
        "criteria": {"candidate": "Gabriel passt als Person (Freelance/Teilzeit)",
                     "partner": "Projektbasierte Unterstuetzung durch make happen"}},
}
CHUNK = 8
LI_HOME = "https://www.linkedin.com"
CONV_MAX_AGE_H = 36
HIRE_MAX_AGE_H = 7 * 24
MENTION_POOL = 4

# ---------------- lang helpers (guardia de codigo, no prompt) ----------------

DE_WORDS = {"der","die","das","und","ist","nicht","mit","fur","auf","auch","noch","mehr","werden","eine","sich","uber","zur","zum","dem","den","bei","vom","kann","wie","wir","sie","sind","hat","f\u00fcr","\u00fcber"}
EN_WORDS = {"the","and","is","are","not","with","for","on","also","more","will","can","how","this","that","you","your","from","our","what","when"}
ES_MARK = re.compile(r"[\u00bf\u00a1]|\b(cion|est\u00e1|c\u00f3mo|qu\u00e9|fascinante|interesante|tambi\u00e9n|empresa|marca|contenido|b\u00fasqueda)\b", re.I)


def detect_lang(text):
    text = (text or "").strip()
    if len(text) < 40:
        return "unknown"
    t = " " + re.sub(r"[^a-zA-Z\u00e4\u00f6\u00fc\u00df ]", " ", text.lower()) + " "
    es = len(ES_MARK.findall(text))
    de = sum(t.count(" " + w + " ") for w in DE_WORDS) + sum(text.lower().count(ch) for ch in "\u00e4\u00f6\u00fc\u00df")
    en = sum(t.count(" " + w + " ") for w in EN_WORDS)
    if es >= 2 and es >= de and es >= en:
        return "es"
    if de > 0 and de >= en:
        return "de"
    if en > 0 and en > de:
        return "en"
    return "unknown"


TOPIC_RE = re.compile(r"chatgpt|\bki\b|\bai\b|\bllm\b|geo|generative|perplexity|gemini|ai overviews|sichtbarkeit|visibility|content|automatisierung|automation", re.I)
HIRE_RE = re.compile(r"\(m/w/d\)|\(d/m/w\)|\(w/m/d\)|wir suchen|hiring|stelle", re.I)
DASH_RE = re.compile(r"[\u2014\u2013]")
MENTION_RE = re.compile(r"GEO-Check|El Kiosk|elkiosk", re.I)


def strip_dashes(text):
    return DASH_RE.sub(", ", text or "")


def has_mention(text):
    return bool(MENTION_RE.search(text or ""))


def norm_profile(u):
    if not u:
        return None
    u = u.strip().rstrip("/")
    m = re.match(r"https?://[^/]+/in/([^/?#]+)", u)
    if m:
        return "https://www.linkedin.com/in/" + m.group(1)
    return u


def age_hours_from_epoch(ts):
    try:
        return int((time.time() - int(ts)) / 3600)
    except Exception:
        return None


def age_hours_from_iso(iso):
    if not iso:
        return None
    try:
        t = time.mktime(time.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")) - time.timezone
        return int((time.time() - t) / 3600)
    except Exception:
        return None


# ---------------- env / http ----------------

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


def parse_json_payload(content):
    content = (content or "").strip()
    content = re.sub(r"^```(json)?|```$", "", content, flags=re.M).strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\[.*\]", content, re.S) or re.search(r"\{.*\}", content, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
        return None


def llm(user_prompt, orca, errors, tag, temperature=0.2):
    try:
        resp = http_json(
            "https://api.orcarouter.ai/v1/chat/completions",
            {"Content-Type": "application/json", "Authorization": f"Bearer {orca}"},
            data={"model": "openai/gpt-4o-mini", "temperature": temperature, "messages": [{"role": "user", "content": user_prompt}]},
        )
        return resp["choices"][0]["message"]["content"].strip()
    except Exception as e:
        errors.append(f"{tag}: {e}")
        return None


# ---------------- Jev (scoring) ----------------

def treg_search(params, errors, tag):
    """treg search.posts robusto: reintenta y nunca truena con None."""
    last = None
    for _ in range(2):
        try:
            r = subprocess.run(
                ["treg", "call", "anyapi.linkedin.search.posts", "--data", json.dumps(params), "--json"],
                capture_output=True, text=True, timeout=120,
            )
            d = json.loads(r.stdout)
            if not isinstance(d, dict):
                raise ValueError("respuesta no-dict")
            out = d.get("output")
            data = (out or {}).get("data") if isinstance(out, dict) else None
            if not isinstance(data, dict):
                data = {}
            posts = data.get("posts")
            if not isinstance(posts, list):
                posts = []
            return posts, data.get("nextCursor")
        except Exception as e:
            last = e
            time.sleep(2)
    errors.append(f"treg {tag}: {last}")
    return [], None


def profile_headline(url, cache):
    if not url:
        return None
    key = url.rstrip("/").split("/")[-1].lower()
    if key in cache:
        return cache[key]
    hl = None
    try:
        r = subprocess.run(
            ["treg", "call", "treg.linkedin.user.profile", "--data", json.dumps({"linkedin_url": url}), "--json"],
            capture_output=True, text=True, timeout=60,
        )
        out = json.loads(r.stdout).get("output")
        if isinstance(out, dict):
            for k in ("headline", "title", "occupation"):
                if out.get(k):
                    hl = out[k]
                    break
            if not hl:
                person = out.get("person") or out.get("profile") or {}
                if isinstance(person, dict):
                    for k in ("headline", "title", "occupation"):
                        if person.get(k):
                            hl = person[k]
                            break
    except Exception:
        hl = None
    cache[key] = hl
    return hl


def jev_evaluate(text, author, headline, key, errors):
    """Una request por post -> answers con probabilidades crudas."""
    if not key:
        errors.append("jev: TYPESAFE_API_KEY aus")
        return None
    state = f"Post:\n{(text or '')[:6000]}\n\nAutor: {author or 'unbekannt'}\nTitel: {headline or 'unbekannt'}"
    payload = {"state": state, "model": JEV_MODEL, "questions": JEV_QUESTIONS}
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                JEV_URL, data=json.dumps(payload).encode(),
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST",
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                d = json.load(resp)
            answers = d.get("answers")
            if isinstance(answers, dict) and answers.get("post_type"):
                return answers
            last = "answers incompletos"
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
            if e.code in (429, 500, 502, 503):
                time.sleep(2 * (attempt + 1))
                continue
            break
        except Exception as e:
            last = str(e)
            time.sleep(2)
    errors.append(f"jev: {last}")
    return None


def score_from_jev(a):
    """Reglas en codigo del brief: gates + score final."""
    try:
        t = a.get("post_type") or {}
        ptype = t.get("choice")
        p_other = float((t.get("probabilities") or {}).get("other", 0))
        reg = float((a.get("region_dach") or {}).get("noul", 0))
        geo = float((a.get("geo_topic") or {}).get("noul", 0))
        adj = float((a.get("adjacent_topic") or {}).get("noul", 0))
        lang = (a.get("language") or {}).get("choice") or "other"
        register = (a.get("register") or {}).get("choice") or "neutral"
        at = (a.get("author_type") or {}).get("choice") or "sonstige"
        disc = float((a.get("discussion") or {}).get("score", 0)) / 9 * 100
        fit = float((a.get("hiring_fit") or {}).get("score", 0)) / 9 * 100
        ha = (a.get("hiring_angle") or {}).get("choice") or "candidate"
    except Exception:
        return {"discard": "jev_incomplete", "score": 0, "region_ok": False, "region_raw": 0.0,
                "ptype": "?", "language": "?", "register": "neutral", "angle": "none", "reason": "parse"}

    reason = f"{ptype} p_other={p_other:.2f} region={reg:.2f} topic={max(geo, 0.6 * adj):.2f} disc={disc:.0f} fit={fit:.0f}"
    if ptype == "hiring":
        score = round(fit)
        angle = "hiring_candidate" if ha == "candidate" else "hiring_partner"
    else:
        topic = max(geo, 0.6 * adj)
        score = round(100 * (0.6 * topic + 0.25 * disc / 100 + 0.15 * BUYER_BONUS.get(at, 0)))
        angle = ANGLE_BY_AUTHOR.get(at, "none")

    out = {"discard": None, "score": score, "region_ok": reg >= 0.7, "region_raw": reg,
           "ptype": ptype, "language": lang, "register": register, "angle": angle, "reason": reason}
    if p_other >= 0.6:
        out["discard"] = "post_type_other"
    elif reg < 0.7:
        out["discard"] = "region<0.7"
    elif lang not in ("de", "en"):
        out["discard"] = f"language={lang}"
    elif ptype != "hiring":
        topic = max(geo, 0.6 * adj)
        if topic < 0.6:
            out["discard"] = "topic<0.6"
    return out


# ---------------- prompts (brief verbatim) ----------------

PROMPT_A = """Du bekommst mehrere LinkedIn-Posts zur Bewertung. Antworte NUR mit einem JSON-ARRAY (ein Objekt pro Post, in gleicher Reihenfolge, jedes Objekt mit dem zusaetzlichen Feld "url" exakt wie im Post). Ohne Markdown, ohne Text davor oder danach.

Du bewertest LinkedIn-Posts f\u00fcr Gabriel Lagos (Hamburg, 20 Jahre Creative Direction,
baut KI-Automationen, GEO-Check f\u00fcr KI-Sichtbarkeit und El Kiosk, Content-as-a-Service
f\u00fcr KMU im DACH-Raum).

JSON-Objekt pro Post:
{
  "post_type": "conversation" | "hiring" | "other",
  "region_dach": true | false,
  "region_signals": ["..."],
  "language": "de" | "en" | "other",
  "register": "du" | "sie" | "neutral",
  "score": 0-100,
  "angle": "buyer" | "expert" | "hiring_candidate" | "hiring_partner" | "none",
  "reason": "max 1 Satz",
  "evidence": "wortwörtliches Zitat aus dem Post (copy-paste, unverändert, ohne ..."
}

Regeln:
- region_dach nur true bei klaren Signalen: Post auf Deutsch, .de/.at/.ch, GmbH/AG,
  DACH-St\u00e4dte, Firmensitz im DACH-Raum. Im Zweifel false.
- language = Sprache des Post-Textes, nicht des Profils.

Score f\u00fcr "conversation":
+ Autor ist potenzieller K\u00e4ufer (Inhaber, GF, Marketing-Lead eines KMU/Mittelstands)
+ Thema: Sichtbarkeit, Content, KI im Marketing, Automatisierung, Traffic-Verlust
+ Gabriel kann einen konkreten, eigenen Punkt beitragen
+ Post hat Diskussion (Fragen, Meinungen), nicht nur Ank\u00fcndigung
- Autor ist Agentur/Berater mit gleichem Angebot (max 60, au\u00dfer starkes Expert-Thema)
- Reine Werbung, Event-Ank\u00fcndigung, Jobwechsel-Gl\u00fcckw\u00fcnsche: post_type "other"

Evidenzpflicht:
- "evidence" MUSS ein wortwörtliches Zitat aus dem Post sein (exaktes copy-paste,
  ohne Änderungen, ohne Auslassungspunkte, ohne Übersetzung).
- Wenn der Post sich NICHT explizit mit KI-Sichtbarkeit, Content, KI im Marketing,
  Automatisierung oder einer passenden Stellenanzeige beschäftigt: score höchstens 40.
- Generischer Verkauf, Recht/Daten, Energie, Finanzen, Motivation:
  post_type "other" (Score egal).

Negative Beispiele aus heutigen Posts (erwartet: post_type "other", score <= 30):
- Barbara Gruber (Datenhandel/GDPR-Gespräch): kein KI-Sichtbarkeits-Bezug -> "other", score max 30.
- Focused Energy (Kernfusion/Energie): -> "other", score max 30.
- Jenny Werner / Matthias Mager (Nutzenkommunikation im Vertrieb, ohne KI-Thema): -> "other", score max 30.

Score f\u00fcr "hiring":
+ Rolle \u00fcberschneidet sich mit: KI, Automatisierung, GEO/SEO, Content, Creative Direction,
  Marketing, Enablement/Workshops
+ Remote, Hamburg oder Freelance/Teilzeit m\u00f6glich
+ Seniorit\u00e4tslevel passt (Lead, Head, Senior, Manager mit Gestaltungsspielraum)
angle "hiring_candidate" wenn Gabriel als Person passt,
"hiring_partner" wenn eher projektbasierte Unterst\u00fctzung durch eine Agentur Sinn ergibt."""

PROMPT_B = """Schreib einen LinkedIn-Kommentar als Gabriel Lagos zu folgendem Post.

Sprache: {language}. Exakt diese Sprache, niemals Spanisch.
Anrede: {register}. Bei "neutral" ohne direkte Anrede schreiben.
Erw\u00e4hnung erlaubt: {allow_mention}. Nur wenn true, darf GEO-Check oder El Kiosk
EINMAL beil\u00e4ufig vorkommen, ohne Link, ohne Verkaufston.

Regeln:
- 2 bis 4 S\u00e4tze.
- Ein konkreter eigener Punkt (Beobachtung, Erfahrung, Gegenposition),
  kein Zusammenfassen des Posts.
- Wenn es passt, eine echte Frage am Ende.
- Verboten: "Toller Beitrag", "Spannend!", "Danke f\u00fcrs Teilen", Emojis am Anfang,
  Hashtags, Gedankenstriche (Unicode U+2014 und U+2013).
- Bei Schweizer Post: "ss" statt "\u00df".
- Keine Fakten erfinden, keine Kundennamen.

Post:
{post_text}

Gib nur den Kommentartext aus."""

PROMPT_C = """Erstelle f\u00fcr Gabriel Lagos zu folgendem Stellen-Post zwei Texte, in Sprache {language}
und Anrede {register}. Winkel: {angle}.

1. "dm": Direktnachricht an die Person, die gepostet hat. Max 4 S\u00e4tze.
   - hiring_candidate: Bezug auf 1 bis 2 konkrete Anforderungen aus dem Post,
     Gabriels passende Praxis (KI-Automationen, GEO-Check, 20 Jahre Creative Direction),
     Frage ob Freelance oder Teilzeit denkbar ist. make happen NICHT in den Vordergrund.
   - hiring_partner: Angebot, das Thema projektbasiert \u00fcber make happen abzudecken,
     bis die Stelle besetzt ist. Kleine Frage als CTA (kurzer Austausch mit dem Team-Lead).
     Keine Bewerber-Formulierungen in diesem Winkel (kein persoenliches Freelance/Teilzeit,
     kein "ich als Kandidat"), nur die Unterstuetzung durch make happen.
2. "comment": optional, max 1 Satz, oder leer lassen, wenn ein Kommentar nichts bringt.
3. "company": Firma des Stellenangebots. Steht oft in eckigen Klammern am Ende
   oder nach "Job:"/"Stelle:" im Post (z.B. "[Job: Titel, Firma]"). Sonst "".
4. "role": Jobtitel der Stelle aus dem Post (sonst "").

Keine Gedankenstriche, keine erfundenen Fakten.

Post:
{post_text}

Antworte NUR mit JSON: {"dm": "...", "comment": "...", "company": "...", "role": "..."}"""

# ---------------- keywords desde DB ----------------

def load_keywords(supa_get, errors):
    try:
        rows = supa_get("/rest/v1/linkedin_keywords?select=query,lane&active=eq.true&order=query")
        if rows:
            return [(r["query"], r.get("lane") or "expert") for r in rows]
    except Exception as e:
        errors.append(f"keywords: {e}")
    return [(q, "expert") for q in DEFAULT_QUERIES]


# ---------------- candidates: keyword search via treg ----------------

def fetch_keyword_posts(qlist, errors, stats):
    candidates = []
    for q, lane in qlist:
        qq = q if q.startswith(chr(34)) else chr(34) + q + chr(34)
        active_q = qq
        posts, cur = treg_search({"query": active_q, "datePosted": DATE_WINDOW}, errors, q)
        if not posts:
            active_q = q
            posts, cur = treg_search({"query": active_q, "datePosted": DATE_WINDOW}, errors, q + " unquoted")
        pages = 1
        while cur and pages < MAX_PAGES:
            more, cur = treg_search(
                {"query": active_q, "cursor": cur, "datePosted": DATE_WINDOW}, errors, f"{q} page{pages + 1}"
            )
            if not more:
                break
            posts.extend(more)
            pages += 1
        stats[q] = {"results": len(posts), "passed_dach": 0}
        for p in posts:
            if not p.get("url"):
                continue
            candidates.append({
                "url": p["url"],
                "author": p.get("authorName") or "",
                "author_url": norm_profile(p.get("authorUrl")),
                "role": "",
                "text": (p.get("text") or "")[:8000],
                "source": "keyword",
                "keyword": q,
                "lane": lane,
                "posted_at": epoch_to_iso(p.get("createdUtc")),
                "age_hours": age_hours_from_epoch(p.get("createdUtc")),
                "reactions": p.get("reactionCount") if p.get("reactionCount") is not None else 0,
                "comments": p.get("commentCount") if p.get("commentCount") is not None else 0,
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

TIME_RE = re.compile(r"^\s*(\d+)([hdw])\s*\u2022")
DEGREE_RE = re.compile(r"\u2022\s*(2nd|3rd\+?|1st)")


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
        m_r = re.search(r"(\d[\d.,]*)\s*reactions?", block, re.I)
        m_c = re.search(r"(\d[\d.,]*)\s*comments?", block, re.I)
        reactions = int(re.sub(r"\D", "", m_r.group(1))) if m_r else None
        comments_n = int(re.sub(r"\D", "", m_c.group(1))) if m_c else None
        slug = pick_ref(author, text)
        if not slug:
            continue  # no verified permalink: drop
        candidates.append({
            "url": LI_HOME + "/posts/" + slug,
            "author": author,
            "author_url": None,
            "role": " ".join(role_parts)[:300],
            "text": text[:8000],
            "source": "feed",
            "keyword": None,
            "lane": None,
            "posted_at": posted_at,
            "age_hours": age_hours_from_iso(posted_at),
            "reactions": reactions,
            "comments": comments_n,
        })
    return candidates


def rel_to_iso(n, unit):
    n = int(n)
    delta = {"h": 3600, "d": 86400, "w": 604800}[unit] * n
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - delta))


# ---------------- Prompt A: clasificador ----------------

def llm_classify(candidates, orca, errors):
    results = {}
    for i in range(0, len(candidates), CHUNK):
        chunk = candidates[i : i + CHUNK]
        posts = "\n\n".join(
            f"URL: {c['url']}\nAutor: {c.get('author', '')}\nPost:\n{c['text'][:2500]}"
            for c in chunk
        )
        content = llm(PROMPT_A + "\n\nPOSTS:\n" + posts, orca, errors, f"classify chunk {i}")
        if content is None:
            continue
        items = parse_json_payload(content)
        if isinstance(items, dict):
            items = [items]
        if not isinstance(items, list):
            errors.append(f"classify chunk {i}: JSON ilegible")
            continue
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


# ---------------- Prompt B: comentario (conversation) ----------------

def llm_comment(c, lang, register, allow_mention, orca, errors):
    user = (
        PROMPT_B
        .replace("{language}", lang)
        .replace("{register}", register)
        .replace("{allow_mention}", "true" if allow_mention else "false")
        .replace("{post_text}", (c.get("text") or "")[:3000])
    )
    out = llm(user, orca, errors, f"comment {c.get('author')}")
    if not out:
        return None
    out = re.sub(r"^```[a-z]*\n?|```$", "", out.strip(), flags=re.M).strip()
    return out or None


# ---------------- Prompt C: DMs (hiring) ----------------

def llm_hiring(c, lang, register, angle, orca, errors):
    user = (
        PROMPT_C
        .replace("{language}", lang)
        .replace("{register}", register)
        .replace("{angle}", angle)
        .replace("{post_text}", (c.get("text") or "")[:3000])
    )
    content = llm(user, orca, errors, f"dm {angle} {c.get('author')}")
    if content is None:
        return None
    data = parse_json_payload(content)
    if not isinstance(data, dict) or not data.get("dm"):
        return None
    return data


# ---------------- reglas duras ----------------

def allow_mention_flag(supa_get, errors):
    try:
        rows = supa_get(
            f"/rest/v1/linkedin_engagements?select=mention_used&status=eq.approved"
            f"&post_type=eq.conversation&order=created_at.desc&limit={MENTION_POOL}"
        )
        return not any(r.get("mention_used") for r in rows)
    except Exception as e:
        errors.append(f"mention pool: {e}")
        return False


def days_ago_iso(days):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - days * 86400))


def recent_author_sets(supa_get, errors):
    urls, names = set(), set()
    try:
        rows = supa_get(
            "/rest/v1/linkedin_engagements?select=author_profile_url,author_name"
            "&created_at=gte." + days_ago_iso(7)
        )
        for r in rows:
            if r.get("author_profile_url"):
                urls.add(r["author_profile_url"].rstrip("/"))
            if r.get("author_name"):
                names.add(r["author_name"].strip().lower())
    except Exception as e:
        errors.append(f"author dedup engagements: {e}")
    try:
        rows = supa_get(
            "/rest/v1/outreach_contacts?select=contacto_linkedin,contacto_nombre,fuente"
            "&fuente=eq.linkedin&created_at=gte." + days_ago_iso(7)
        )
        for r in rows:
            if r.get("contacto_linkedin"):
                urls.add(r["contacto_linkedin"].rstrip("/"))
            if r.get("contacto_nombre"):
                names.add(r["contacto_nombre"].strip().lower())
    except Exception as e:
        errors.append(f"author dedup contacts: {e}")
    return urls, names


def existing_job_links(supa_get, errors):
    links = set()
    try:
        rows = supa_get("/rest/v1/outreach_contacts?select=job_link&job_link=not.is.null")
        links = {r["job_link"] for r in rows if r.get("job_link")}
    except Exception as e:
        errors.append(f"job_link dedup: {e}")
    return links


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

    def supa_get(path):
        req = urllib.request.Request(
            supa_url + path, headers={"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)

    def supa_post(path, payload):
        req = urllib.request.Request(
            supa_url + path,
            data=json.dumps(payload).encode(),
            headers={
                "apikey": supa_key,
                "Authorization": f"Bearer {supa_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation,resolution=ignore-duplicates",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else []

    qlist = load_keywords(supa_get, errors)
    stats = {}
    candidates = fetch_keyword_posts(qlist, errors, stats)
    if args.feed_dump:
        candidates += parse_feed_dump(args.feed_dump, errors)

    # dedupe entre si (URL)
    seen, uniq = set(), []
    for c in candidates:
        if c["url"] not in seen:
            seen.add(c["url"])
            uniq.append(c)
    candidates = uniq

    dropped = []

    # filtro duro de tema (gratis, antes del LLM)
    topic_ok = []
    for c in candidates:
        if TOPIC_RE.search(c.get("text") or ""):
            topic_ok.append(c)
        else:
            dropped.append({"author": c.get("author"), "reason": "topic_filter"})
    candidates = topic_ok

    # antiguedad inicial: 7 dias (el corte de 36h para conversation va despues del clasificador)
    age_ok = []
    for c in candidates:
        ah = c.get("age_hours")
        if ah is not None and ah > HIRE_MAX_AGE_H:
            dropped.append({"author": c.get("author"), "reason": f"too_old {ah}h"})
        else:
            age_ok.append(c)
    candidates = age_ok

    # dedupe contra DB: post + autor (7 dias)
    try:
        existing_rows = supa_get("/rest/v1/linkedin_engagements?select=post_url,dedupe_key")
    except Exception as e:
        existing_rows = []
        errors.append(f"db dedup: {e}")
    existing = set()
    for r in existing_rows:
        for k in (r.get("post_url"), r.get("dedupe_key")):
            if k:
                existing.add(k)
    fresh = [c for c in candidates if c["url"] not in existing]
    db_urls, db_names = recent_author_sets(supa_get, errors)
    jobs_seen = existing_job_links(supa_get, errors)

    not_dup = []
    for c in fresh:
        a_url = c.get("author_url")
        a_name = (c.get("author") or "").strip().lower()
        if (a_url and a_url.rstrip("/") in db_urls) or (not a_url and a_name and a_name in db_names):
            dropped.append({"author": c.get("author"), "reason": "author_dup_7d"})
            continue
        if c["url"] in jobs_seen:
            dropped.append({"author": c.get("author"), "reason": "job_link_exists"})
            continue
        not_dup.append(c)
    fresh = not_dup[:MAX_CANDIDATES]

    digest = {
        "scanned": len(candidates),
        "keywords": len(qlist),
        "new": len(fresh),
        "conversation_inserted": 0,
        "hiring_inserted": 0,
        "dry_run": args.dry_run,
        "dropped": dropped,
        "errors": errors,
        "rows_conv": [],
        "rows_hire": [],
    }
    if not fresh:
        digest["stats"] = stats
        digest["keywords_zero"] = [q for q, s in stats.items() if s["results"] == 0]
        print(json.dumps(digest, ensure_ascii=False, indent=1))
        return

    mention_ok = allow_mention_flag(supa_get, errors)
    hl_cache = {}
    typesafe_key = env("~/.hermes/CREDENTIALS_MASTER.env", "TYPESAFE_API_KEY")

    # prefetch de titulares en paralelo (el secuencial era el cuello de botella)
    def _eng_ok(c):
        rc, cc = c.get("reactions"), c.get("comments")
        if rc is None and cc is None:
            return True
        return (rc or 0) >= MIN_REACTIONS or (cc or 0) >= MIN_COMMENTS
    uniq_urls = sorted({c.get("author_url") for c in fresh if c.get("author_url") and _eng_ok(c)})
    with ThreadPoolExecutor(max_workers=6) as ex:
        list(ex.map(lambda u: profile_headline(u, hl_cache), uniq_urls))

    for c in fresh:
        ah = c.get("age_hours")

        # gate de engagement (gratis, antes de Jev)
        rc, cc = c.get("reactions"), c.get("comments")
        if (rc is not None or cc is not None) and (rc or 0) < MIN_REACTIONS and (cc or 0) < MIN_COMMENTS:
            dropped.append({"author": c.get("author"), "reason": f"low_engagement r={rc or 0} c={cc or 0}"})
            continue

        headline = profile_headline(c.get("author_url"), hl_cache)
        answers = jev_evaluate(c.get("text"), c.get("author"), headline, typesafe_key, errors)
        if not answers:
            dropped.append({"author": c.get("author"), "reason": "jev_failed"})
            continue

        ev = score_from_jev(answers)
        ptype = ev["ptype"]
        score = ev["score"]
        region = ev["region_ok"]
        lang = ev["language"]
        register = ev["register"]
        angle = ev["angle"]
        reason = ev["reason"]

        if c.get("keyword") and c["keyword"] in stats and ev["region_raw"] >= 0.7:
            stats[c["keyword"]]["passed_dach"] += 1
        if ev["discard"]:
            dropped.append({"author": c.get("author"), "reason": ev["discard"], "score": score})
            continue
        if ptype == "hiring" and not HIRE_RE.search(c.get("text") or ""):
            dropped.append({"author": c.get("author"), "reason": "hiring_terms_missing", "score": score})
            continue
        if ptype == "conversation" and ah is not None and ah > CONV_MAX_AGE_H:
            dropped.append({"author": c.get("author"), "reason": f"conv_too_old {ah}h", "score": score})
            continue
        if score < THRESHOLD:
            dropped.append({"author": c.get("author"), "reason": f"score<{THRESHOLD}", "score": score})
            continue

        if ptype == "conversation":
            status = "pending"
            draft = llm_comment(c, lang, register, mention_ok, orca, errors)
            if draft and has_mention(draft) and not mention_ok:
                draft = llm_comment(c, lang, register, False, orca, errors)
            if not draft:
                dropped.append({"author": c.get("author"), "reason": "comment_failed", "score": score})
                continue
            draft = strip_dashes(draft)[:2000]
            if detect_lang(draft) != lang:
                draft2 = llm_comment(c, lang, register, mention_ok, orca, errors)
                draft2 = strip_dashes(draft2 or "")[:2000]
                if draft2 and detect_lang(draft2) == lang:
                    draft = draft2
                else:
                    status = "needs_review"
            mention = has_mention(draft)
            if mention and not mention_ok and status != "needs_review":
                status = "needs_review"
            row = {
                "author_name": (c.get("author") or "")[:200],
                "author_role": (c.get("role") or "")[:300],
                "post_url": c["url"],
                "dedupe_key": c["url"],
                "post_text": (c.get("text") or "")[:20000],
                "post_summary": reason[:500],
                "source": c.get("source") or "keyword",
                "keyword": c.get("keyword"),
                "score": max(0, min(100, score)),
                "status": status,
                "comment_draft": draft,
                "posted_at": c.get("posted_at"),
                "post_type": "conversation",
                "angle": angle,
                "language": lang,
                "register": register,
                "region_signals": ["jev_region=%.2f" % ev["region_raw"]],
                "score_reason": reason[:500],
                "author_profile_url": c.get("author_url"),
                "post_age_hours": ah,
                "mention_used": mention,
                "jev_raw": answers,
            }
            digest["rows_conv"].append({"score": row["score"], "author": row["author_name"], "url": row["post_url"], "status": status, "draft": draft, "reactions": rc, "comments": cc})
            if not args.dry_run:
                try:
                    supa_post("/rest/v1/linkedin_engagements?on_conflict=dedupe_key", [row])
                    digest["conversation_inserted"] += 1
                except urllib.error.HTTPError as e:
                    errors.append(f"insert conv {row['author_name']}: {e.code} {e.read().decode()[:300]}")
                except Exception as e:
                    errors.append(f"insert conv: {e}")

        elif ptype == "hiring":
            dm_c = llm_hiring(c, lang, register, "hiring_candidate", orca, errors)
            dm_p = llm_hiring(c, lang, register, "hiring_partner", orca, errors)
            if not dm_c or not dm_p:
                dropped.append({"author": c.get("author"), "reason": "dm_generation_failed", "score": score})
                continue
            dm_c_text = strip_dashes(dm_c.get("dm") or "")[:4000]
            dm_p_text = strip_dashes(dm_p.get("dm") or "")[:4000]
            comment = strip_dashes(dm_c.get("comment") or dm_p.get("comment") or "")[:1000]
            if detect_lang(dm_c_text) != lang or detect_lang(dm_p_text) != lang:
                dm_c2 = llm_hiring(c, lang, register, "hiring_candidate", orca, errors)
                if dm_c2:
                    t2 = strip_dashes(dm_c2.get("dm") or "")[:4000]
                    if detect_lang(t2) == lang:
                        dm_c_text = t2
            if detect_lang(dm_c_text) != lang or detect_lang(dm_p_text) != lang:
                dropped.append({"author": c.get("author"), "reason": f"dm_lang_fail want={lang}", "score": score})
                continue
            company = (dm_c.get("company") or dm_p.get("company") or "").strip()
            role = (dm_c.get("role") or dm_p.get("role") or "").strip()
            row = {
                "empresa": (company or c.get("author") or "LinkedIn")[:200],
                "cargo": (role or "Stelle laut LinkedIn-Post")[:300],
                "job_link": c["url"],
                "contacto_nombre": (c.get("author") or "")[:200],
                "contacto_linkedin": c.get("author_url"),
                "estado": "Nuevo",
                "fuente": "linkedin",
                "hipotesis": reason[:600],
                "score": max(0, min(100, score)),
                "reason": reason[:500],
                "draft_dm_candidate": dm_c_text,
                "draft_dm_partner": dm_p_text,
                "draft_comment": comment,
                "jev_raw": answers,
            }
            digest["rows_hire"].append({"score": row["score"], "author": row["contacto_nombre"], "empresa": row["empresa"], "cargo": row["cargo"], "url": row["job_link"]})
            if not args.dry_run:
                try:
                    supa_post("/rest/v1/outreach_contacts", [row])
                    digest["hiring_inserted"] += 1
                except urllib.error.HTTPError as e:
                    errors.append(f"insert hire {row['empresa']}: {e.code} {e.read().decode()[:300]}")
                except Exception as e:
                    errors.append(f"insert hire: {e}")

    # stats por keyword
    digest["stats"] = stats
    digest["keywords_zero"] = [q for q, s in stats.items() if s["results"] == 0]
    if not args.dry_run:
        try:
            today = time.strftime("%Y-%m-%d")
            prev = {}
            try:
                prev = {r["query"]: r for r in supa_get(f"/rest/v1/linkedin_keyword_stats?select=query,results,passed_dach&day=eq.{today}")}
            except Exception:
                prev = {}
            payload = [
                {"day": today, "query": q,
                 "results": max(s["results"], (prev.get(q) or {}).get("results", 0)),
                 "passed_dach": max(s["passed_dach"], (prev.get(q) or {}).get("passed_dach", 0))}
                for q, s in stats.items()
            ]
            req = urllib.request.Request(
                supa_url + "/rest/v1/linkedin_keyword_stats?on_conflict=day,query",
                data=json.dumps(payload).encode(),
                headers={
                    "apikey": supa_key,
                    "Authorization": f"Bearer {supa_key}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30):
                pass
        except Exception as e:
            errors.append(f"stats upsert: {e}")

    digest["errors"] = errors
    print(json.dumps(digest, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
