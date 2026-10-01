import type { LinkedInRow } from "./jobi";

/**
 * The linkedin_engagements table is empty today. While it stays empty the
 * LinkedIn tab renders these rows so the design can be reviewed; every row
 * carries `demo: true` and is badged as "Datos de ejemplo" in the UI. Real
 * counters and the approval queue never read from this list.
 */
export interface DemoLinkedInRow extends LinkedInRow {
  demo: boolean;
}

export const DEMO_POSTS: DemoLinkedInRow[] = [
  {
    demo: true,
    id: "demo-p1",
    author_name: "Clara Benítez",
    author_role: "CRO, Salesforge",
    is_company: false,
    post_url: "https://www.linkedin.com/",
    post_text:
      "Durante un año enviamos secuencias de 8 pasos. Este trimestre las recortamos a 4, con mensajes más específicos y una propuesta clara en el primero. La tasa de respuesta subió del 3,1% al 6,8% y el equipo dedica un 40% menos de tiempo.\n\nLa lección: más toques no compensan menos relevancia. ¿Cuántos pasos tienen vuestras secuencias?",
    post_summary:
      "Explica por qué sus secuencias de 8 pasos rinden menos que las de 4",
    source: "feed",
    keyword: null,
    score: 92,
    status: "approved",
    comment_draft:
      "Muy de acuerdo, Clara. En nuestro caso el mayor salto vino de sustituir el primer toque genérico por una hipótesis concreta sobre la cuenta. ¿Probasteis a variar el mensaje según el rol del decisor?",
    posted_at: null,
    approved_at: null,
    published_at: null,
    created_at: "2026-09-28T09:00:00.000+00:00",
  },
  {
    demo: true,
    id: "demo-p2",
    author_name: "Anna Krüger",
    author_role: "Head of Marketing, Alpenmilch eG",
    is_company: false,
    post_url: "https://www.linkedin.com/",
    post_text:
      "Wir haben 2026 sechs große Kampagnen gefahren. Ergebnis: Peaks, dann Stille.\n\nFür 2027 drehen wir es um. Kleinere Budgets, dafür jede Woche Content. Wie macht ihr das mit kleinem Team?",
    post_summary:
      "Weniger Kampagnen, mehr laufender Content: unser Plan für 2027",
    source: "keyword",
    keyword: "Content Lebensmittel",
    score: 88,
    status: "approved",
    comment_draft:
      "Spannender Schwenk. Die Stille zwischen den Peaks kennen wir von fast jeder Marke. Was kleinen Teams hilft: die Markensprache einmal sauber festhalten, dann wird wöchentlicher Content zur Routine. Welche Formate testet ihr zuerst?",
    posted_at: null,
    approved_at: null,
    published_at: null,
    created_at: "2026-09-27T09:00:00.000+00:00",
  },
  {
    demo: true,
    id: "demo-p3",
    author_name: "Markus Heller",
    author_role: "Gründer, Heller Hotels",
    is_company: false,
    post_url: "https://www.linkedin.com/",
    post_text:
      "Seit März liegt unser Direktbuchungsanteil bei 41 Prozent. Der größte Hebel war nicht die Website, sondern Instagram Stories mit echten Gästen.",
    post_summary: "Direktbuchungen statt Portale: was bei uns funktioniert hat",
    source: "feed",
    keyword: null,
    score: 84,
    status: "approved",
    comment_draft:
      "Starker Punkt, dass Stories mehr bewegt haben als die Website. Habt ihr dafür feste Formate oder entsteht das spontan im Haus?",
    posted_at: null,
    approved_at: null,
    published_at: null,
    created_at: "2026-09-26T09:00:00.000+00:00",
  },
  {
    demo: true,
    id: "demo-p4",
    author_name: "Weingut Seidl",
    author_role: "Página de empresa",
    is_company: true,
    post_url: "https://www.linkedin.com/",
    post_text: "Die Lese ist durch. Kleine Menge, große Konzentration.",
    post_summary: "Lese 2026 abgeschlossen, erste Eindrücke",
    source: "feed",
    keyword: null,
    score: 71,
    status: "published",
    comment_draft:
      "Glückwunsch zum Abschluss. Kleine Menge, große Konzentration klingt nach einem Jahrgang, den man sich merken sollte.",
    posted_at: "2026-09-24T12:00:00.000+00:00",
    approved_at: null,
    published_at: "2026-09-24T12:00:00.000+00:00",
    created_at: "2026-09-24T09:00:00.000+00:00",
  },
  {
    demo: true,
    id: "demo-p5",
    author_name: "Ben Otto",
    author_role: "Inhaber, Otto Kaffee",
    is_company: false,
    post_url: "https://www.linkedin.com/",
    post_text: "Wir machen alles selbst. Handy, gutes Licht, fertig.",
    post_summary: "Warum wir keine Agentur mehr brauchen",
    source: "keyword",
    keyword: "Agentur",
    score: 63,
    status: "rejected",
    comment_draft: "",
    posted_at: null,
    approved_at: null,
    published_at: null,
    created_at: "2026-09-22T09:00:00.000+00:00",
  },
];
