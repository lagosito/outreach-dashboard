"use client";

// Plantillas de los documentos de JOBI. Son puras: solo pintan el JSON que
// reciben (contact.doc_cv / doc_anschreiben / doc_mh), sin fetch ni estado de
// red. Si se les pasa `edit` (vista previa en modo WYSIWYG) cada bloque de
// texto visible se renderiza con Editable; si no, texto plano.
//
// Medidas fieles a los frames de Figma:
//   · CV `225:20` y carta `226:2` → A4 595 × 842 pt, dos columnas / 515 pt.
//   · Services Guide `LJFQ84WAue2C9XNqJ9cQVr` → slides 16:9 (1920 × 1080).

import type { ReactNode } from "react";
import { Editable, type EditablePath } from "./Editable";
import styles from "./docs.module.css";

/* ------------------------------------------------------------------ *
 * Tipos (la forma exacta que devuelve la API de generación)
 * ------------------------------------------------------------------ */
export interface SheetEdit {
  onChange: (next: string, path: EditablePath) => void;
}

export interface CvData {
  language?: string;
  nombre?: string;
  claim?: string;
  perfil?: string[];
  experiencia?: {
    empresa?: string;
    rol?: string;
    periodo?: string;
    bullets?: string[];
  }[];
  skills?: { grupo?: string; items?: string[] }[];
  educacion?: string[];
  idiomas?: { idioma?: string; nivel?: string }[];
  clientes?: string[];
  contacto?: {
    telefono?: string;
    email?: string;
    ubicacion?: string;
    linkedin?: string;
    web?: string;
  };
}

export interface AnschreibenData {
  language?: string;
  nombre?: string;
  claim?: string;
  contacto_linea?: string;
  ort_datum?: string;
  empfaenger?: string[];
  betreff?: string;
  saludo?: string;
  parrafos?: string[];
  destacados?: { titulo?: string; bullets?: string[] };
  cierre?: string;
  despedida?: string;
  firma?: string[];
}

export interface MhPagina {
  tipo?: string;
  titel?: string;
  untertitel?: string;
  fuer?: string;
  textos?: string[];
  datos?: string[];
  parrafos?: string[];
  puntos?: string[];
  servicios?: { id?: string; nombre?: string; descripcion?: string; bullets?: string[] }[];
  casos?: { id?: string; nombre?: string; cliente?: string; descripcion?: string }[];
  lineas?: string[];
}

export interface MhData {
  language?: string;
  paginas?: MhPagina[];
}

/* ------------------------------------------------------------------ *
 * Defensas: el JSON viene del modelo y a veces vuelve editado a mano,
 * así que nada se asume de tipo.
 * ------------------------------------------------------------------ */
type Lang = "de" | "en";

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string").join(", ");
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function langOf(value: unknown): Lang {
  return str(value) === "de" ? "de" : "en";
}

/** Identidad del titular del CV: la misma en todos los documentos. */
const NOMBRE = "Gabriel Lagos";

/** Etiquetas estructurales de la plantilla (no las escribe el modelo). */
interface Labels {
  profile: string;
  experience: string;
  skills: string;
  education: string;
  clients: string;
  contact: string;
  phone: string;
  email: string;
  location: string;
  languages: string;
  for: string;
}
const LABELS: Record<Lang, Labels> = {
  en: {
    profile: "profile",
    experience: "Professional Experience",
    skills: "Technical Skills",
    education: "Education & Languages",
    clients: "Key Clients",
    contact: "contact",
    phone: "Phone",
    email: "Email",
    location: "Location",
    languages: "Languages",
    for: "for",
  },
  de: {
    profile: "Profil",
    experience: "Berufserfahrung",
    skills: "Technische Skills",
    education: "Ausbildung & Sprachen",
    clients: "Kunden",
    contact: "Kontakt",
    phone: "Telefon",
    email: "E-Mail",
    location: "Ort",
    languages: "Sprachen",
    for: "für",
  },
};

/** Imágenes de los casos del deck, igual que en el Services Guide maestro. */
const CASE_IMAGES: Record<string, string> = {
  vw: "/docs/cases/case_1_vw.png",
  sindalah: "/docs/cases/case_2_sindalah.png",
  kvd: "/docs/cases/case_3_kvd.png",
  hochbahn: "/docs/cases/case_4_hochbahn.png",
  "elevating-brands-ai-content": "/docs/cases/case_5_elevating-brands-ai-content.png",
  "ai-agents": "/docs/cases/case_6_ai-agents.png",
};

/* ------------------------------------------------------------------ *
 * Helper de texto: plano en vista previa, editable en modo edición.
 * ------------------------------------------------------------------ */
function T({
  v,
  p,
  edit,
  cls,
  ph,
  block,
}: {
  v: string;
  p: EditablePath;
  edit?: SheetEdit;
  cls?: string;
  ph?: string;
  block?: boolean;
}) {
  if (!edit) {
    const className = [styles.pre, block ? styles.blk : "", cls]
      .filter(Boolean)
      .join(" ");
    return <span className={className}>{v}</span>;
  }
  return (
    <Editable
      value={v}
      path={p}
      onChange={edit.onChange}
      block={block}
      className={cls}
      placeholder={ph}
      multiline
    />
  );
}

/* ================================================================== *
 * CV — A4, dos columnas (frame 225:20)
 * ================================================================== */
export function CvSheet({
  data,
  edit,
}: {
  data: CvData;
  edit?: SheetEdit;
}) {
  const lang = langOf(data.language);
  const L = LABELS[lang];
  const contacto = obj(data.contacto);

  const perfil = arr(data.perfil);
  const experiencia = arr(data.experiencia);
  const skills = arr(data.skills);
  const educacion = arr(data.educacion);
  const idiomas = arr(data.idiomas);
  const clientes = arr(data.clientes);

  return (
    <div className={styles.sheet}>
      <div className={styles.docName}>
        <T v={str(data.nombre) || NOMBRE} p={["nombre"]} edit={edit} block />
      </div>
      <div className={styles.docClaim}>
        <T v={str(data.claim)} p={["claim"]} edit={edit} block ph="claim" />
      </div>

      <div className={styles.cvProfile}>
        <div className={styles.blockLabel}>{L.profile}</div>
        {perfil.length === 0 ? null : (
          <>
            {perfil.map((paragraph, i) => (
              <p className={styles.p} key={`perfil-${i}`}>
                <T v={str(paragraph)} p={["perfil", i]} edit={edit} block />
              </p>
            ))}
          </>
        )}
      </div>

      <div className={styles.cvCols}>
        {/* Columna izquierda: experiencia */}
        <div>
          <div className={styles.blockLabel}>{L.experience}</div>
          <div className={styles.exp}>
            {experiencia.map((raw, i) => {
              const e = obj(raw);
              const bullets = arr(e.bullets);
              return (
                <div key={`exp-${i}`}>
                  <div className={styles.expEmpresa}>
                    <T
                      v={str(e.empresa)}
                      p={["experiencia", i, "empresa"]}
                      edit={edit}
                      block
                      ph="empresa"
                    />
                  </div>
                  <div className={styles.expMeta}>
                    <b>
                      <T
                        v={str(e.rol)}
                        p={["experiencia", i, "rol"]}
                        edit={edit}
                        ph="rol"
                      />
                    </b>
                    {str(e.periodo) ? <span> | </span> : null}
                    <T
                      v={str(e.periodo)}
                      p={["experiencia", i, "periodo"]}
                      edit={edit}
                      ph="periodo"
                    />
                  </div>
                  {bullets.length === 0 ? null : (
                    <ul className={styles.bullets}>
                      {bullets.map((b, j) => (
                        <li key={`bullet-${i}-${j}`}>
                          <T
                            v={str(b)}
                            p={["experiencia", i, "bullets", j]}
                            edit={edit}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: skills, educación, clientes, contacto */}
        <div>
          <div className={styles.blockLabel}>{L.skills}</div>
          {skills.map((raw, i) => {
            const g = obj(raw);
            return (
              <div className={styles.skill} key={`skill-${i}`}>
                <b>
                  <T v={str(g.grupo)} p={["skills", i, "grupo"]} edit={edit} ph="grupo" />:{" "}
                </b>
                <T
                  v={str(g.items)}
                  p={["skills", i, "items"]}
                  edit={edit}
                  ph="item, item, item"
                />
              </div>
            );
          })}

          <div className={styles.blockLabel}>{L.education}</div>
          {educacion.map((line, i) => (
            <div className={styles.listLine} key={`edu-${i}`}>
              <T v={str(line)} p={["educacion", i]} edit={edit} block />
            </div>
          ))}
          {idiomas.length === 0 ? null : (
            <div className={styles.listLine}>
              <b>{L.languages}: </b>
              {idiomas.map((raw, i) => {
                const item = obj(raw);
                return (
                  <span key={`idi-${i}`}>
                    <T
                      v={`${str(item.idioma)} (${str(item.nivel)})`}
                      p={["idiomas", i]}
                      edit={edit}
                    />
                    {i < idiomas.length - 1 ? ", " : ""}
                  </span>
                );
              })}
            </div>
          )}

          <div className={styles.blockLabel}>{L.clients}</div>
          <div className={styles.listLine}>
            <T v={str(clientes)} p={["clientes"]} edit={edit} block />
          </div>

          <div className={styles.blockLabel}>{L.contact}</div>
          <div className={styles.contactLine}>
            <div>
              <b>{L.phone}: </b>
              <T v={str(contacto.telefono)} p={["contacto", "telefono"]} edit={edit} />
            </div>
            <div>
              <b>{L.email}: </b>
              <T v={str(contacto.email)} p={["contacto", "email"]} edit={edit} />
            </div>
            <div>
              <b>{L.location}: </b>
              <T v={str(contacto.ubicacion)} p={["contacto", "ubicacion"]} edit={edit} />
            </div>
            <div>
              <T v={str(contacto.linkedin)} p={["contacto", "linkedin"]} edit={edit} />
            </div>
            <div>
              <T v={str(contacto.web)} p={["contacto", "web"]} edit={edit} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ================================================================== *
 * Anschreiben / cover letter — A4, una columna de 515 pt (frame 226:2)
 * ================================================================== */
export function AnschreibenSheet({
  data,
  edit,
}: {
  data: AnschreibenData;
  edit?: SheetEdit;
}) {
  const destacados = obj(data.destacados);
  const empfaenger = arr(data.empfaenger);
  const parrafos = arr(data.parrafos);
  const bullets = arr(destacados.bullets);
  const firma = arr(data.firma);

  return (
    <div className={styles.sheet}>
      <div className={styles.docName}>
        <T v={str(data.nombre) || NOMBRE} p={["nombre"]} edit={edit} block />
      </div>
      <div className={styles.docClaim}>
        <T v={str(data.claim)} p={["claim"]} edit={edit} block ph="claim" />
      </div>
      <div className={styles.asContacto}>
        <T v={str(data.contacto_linea)} p={["contacto_linea"]} edit={edit} block />
      </div>

      <div className={styles.asMeta}>
        <div className={styles.asEmpf}>
          {empfaenger.map((line, i) => (
            <div key={`emp-${i}`}>
              <T v={str(line)} p={["empfaenger", i]} edit={edit} block />
            </div>
          ))}
        </div>
        <div className={styles.asOrt}>
          <T v={str(data.ort_datum)} p={["ort_datum"]} edit={edit} block />
        </div>
      </div>

      <div className={styles.asBetreff}>
        <T v={str(data.betreff)} p={["betreff"]} edit={edit} block ph="betreff" />
      </div>

      <div className={styles.asCuerpo}>
        <p>
          <T v={str(data.saludo)} p={["saludo"]} edit={edit} block />
        </p>
        {parrafos.map((paragraph, i) => (
          <p key={`par-${i}`}>
            <T v={str(paragraph)} p={["parrafos", i]} edit={edit} block />
          </p>
        ))}
        {bullets.length === 0 && !str(destacados.titulo) ? null : (
          <div className={styles.asDest}>
            <div className={styles.asDestTit}>
              <T
                v={str(destacados.titulo)}
                p={["destacados", "titulo"]}
                edit={edit}
                block
              />
            </div>
            <ul>
              {bullets.map((b, j) => (
                <li key={`dest-${j}`}>
                  <T v={str(b)} p={["destacados", "bullets", j]} edit={edit} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <p>
          <T v={str(data.cierre)} p={["cierre"]} edit={edit} block />
        </p>
        <div className={styles.asFirma}>
          <div>
            <T v={str(data.despedida)} p={["despedida"]} edit={edit} block />
          </div>
          {firma.map((line, i) => (
            <div key={`firma-${i}`}>
              <T v={str(line)} p={["firma", i]} edit={edit} block />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * make happen — Services Guide, slides 16:9
 * ================================================================== */
function SlideFrame({
  n,
  bodyCls,
  children,
}: {
  n: number;
  bodyCls?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.slideWrap} data-slide={n}>
      <div className={styles.slide}>
        <div className={styles.slideHead}>
          <span>Services Guides</span>
          <span>{"{2025-26}"}</span>
        </div>
        <div className={[styles.slideBody, bodyCls].filter(Boolean).join(" ")}>
          {children}
        </div>
        <div className={styles.slideFoot}>
          <span>©Copyright Make Happen 2026</span>
          <span>mail@makehappen.de</span>
          <span>[GER,HH]</span>
        </div>
      </div>
    </div>
  );
}

function DeckPage({
  raw,
  index,
  edit,
}: {
  raw: unknown;
  index: number;
  edit?: SheetEdit;
}) {
  const page = obj(raw);
  const tipo = str(page.tipo);
  const titel = str(page.titel);
  const base: EditablePath = ["paginas", index];

  const list = (key: string): unknown[] => arr(page[key]);

  switch (tipo) {
    case "portada":
      return (
        <SlideFrame n={index + 1} bodyCls={styles.sPortada}>
          {str(page.fuer) ? (
            <span className={styles.sFuer}>
              <T v={str(page.fuer)} p={[...base, "fuer"]} edit={edit} />
            </span>
          ) : null}
          <h1 className={styles.slideTitle}>
            <T v={titel} p={[...base, "titel"]} edit={edit} block ph="titel" />
          </h1>
          <div className={styles.sUnter}>
            <T
              v={str(page.untertitel)}
              p={[...base, "untertitel"]}
              edit={edit}
              block
            />
          </div>
        </SlideFrame>
      );

    case "quienes_somos":
      return (
        <SlideFrame n={index + 1}>
          <div className={styles.sQuienes}>
            <h1 className={styles.slideTitle}>
              <T v={titel} p={[...base, "titel"]} edit={edit} block ph="titel" />
            </h1>
            <div className={styles.sTextos}>
              {list("textos").map((t, i) => (
                <div key={`texto-${i}`}>
                  <T v={str(t)} p={[...base, "textos", i]} edit={edit} block />
                </div>
              ))}
            </div>
            {list("datos").length === 0 ? null : (
              <div className={styles.sDatos}>
                {list("datos").map((d, i) => (
                  <span key={`dato-${i}`}>
                    <T v={str(d)} p={[...base, "datos", i]} edit={edit} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </SlideFrame>
      );

    case "propuesta":
      return (
        <SlideFrame n={index + 1}>
          <div className={styles.sPropuesta}>
            <h1 className={styles.slideTitle}>
              <T v={titel} p={[...base, "titel"]} edit={edit} block ph="titel" />
            </h1>
            <div className={styles.sParrafos}>
              {list("parrafos").map((p, i) => (
                <div key={`par-${i}`}>
                  <T v={str(p)} p={[...base, "parrafos", i]} edit={edit} block />
                </div>
              ))}
            </div>
            {list("puntos").length === 0 ? null : (
              <div className={styles.sPuntos}>
                {list("puntos").map((p, i) => (
                  <div key={`punto-${i}`}>
                    <T v={str(p)} p={[...base, "puntos", i]} edit={edit} block />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SlideFrame>
      );

    case "servicios": {
      const servicios = list("servicios");
      return (
        <SlideFrame n={index + 1}>
          <div className={styles.sServicios}>
            <h1 className={styles.slideTitle}>
              <T v={titel} p={[...base, "titel"]} edit={edit} block ph="titel" />
            </h1>
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${Math.max(servicios.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {servicios.map((rawServicio, i) => {
                const s = obj(rawServicio);
                const bullets = arr(s.bullets);
                return (
                  <div className={styles.card} key={`serv-${i}`}>
                    <div className={styles.servicio}>
                      <h3>
                        <T
                          v={str(s.nombre)}
                          p={[...base, "servicios", i, "nombre"]}
                          edit={edit}
                          block
                        />
                      </h3>
                      <div className={styles.desc}>
                        <T
                          v={str(s.descripcion)}
                          p={[...base, "servicios", i, "descripcion"]}
                          edit={edit}
                          block
                        />
                      </div>
                      {bullets.length === 0 ? null : (
                        <ul>
                          {bullets.map((b, j) => (
                            <li key={`sb-${i}-${j}`}>
                              <T
                                v={str(b)}
                                p={[...base, "servicios", i, "bullets", j]}
                                edit={edit}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "casos": {
      const casos = list("casos");
      return (
        <SlideFrame n={index + 1}>
          <div className={styles.sCasos}>
            <h1 className={styles.slideTitle}>
              <T v={titel} p={[...base, "titel"]} edit={edit} block ph="titel" />
            </h1>
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${Math.max(Math.min(casos.length, 3), 1)}, minmax(0, 1fr))`,
              }}
            >
              {casos.map((rawCaso, i) => {
                const c = obj(rawCaso);
                const id = str(c.id);
                const image = CASE_IMAGES[id];
                return (
                  <div className={styles.caso} key={`caso-${i}`}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.casoImg} src={image} alt={str(c.cliente) || id} />
                    ) : (
                      <div className={styles.casoFallback}>
                        <T
                          v={str(c.nombre)}
                          p={[...base, "casos", i, "nombre"]}
                          edit={edit}
                        />
                      </div>
                    )}
                    <div>
                      <div className={styles.casoCliente}>
                        <T
                          v={str(c.cliente)}
                          p={[...base, "casos", i, "cliente"]}
                          edit={edit}
                        />
                      </div>
                      <div className={styles.casoNombre}>
                        <T
                          v={str(c.nombre)}
                          p={[...base, "casos", i, "nombre"]}
                          edit={edit}
                          block
                        />
                      </div>
                      <div className={styles.casoDesc}>
                        <T
                          v={str(c.descripcion)}
                          p={[...base, "casos", i, "descripcion"]}
                          edit={edit}
                          block
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "contacto":
      return (
        <SlideFrame n={index + 1}>
          <div className={styles.sContacto}>
            <h1 className={styles.slideTitle}>
              <T v={titel} p={[...base, "titel"]} edit={edit} block ph="titel" />
            </h1>
            <div className={styles.sLineas}>
              {list("lineas").map((line, i) => (
                <div key={`linea-${i}`}>
                  <T v={str(line)} p={[...base, "lineas", i]} edit={edit} block />
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    default:
      return (
        <SlideFrame n={index + 1}>
          <div className={styles.sQuienes}>
            <h1 className={styles.slideTitle}>
              <T v={titel} p={[...base, "titel"]} edit={edit} block ph="titel" />
            </h1>
          </div>
        </SlideFrame>
      );
  }
}

export function MhDeck({
  data,
  edit,
}: {
  data: MhData;
  edit?: SheetEdit;
}) {
  const paginas = arr(data.paginas);
  return (
    <div className={styles.deck}>
      {paginas.map((page, i) => (
        <DeckPage key={`slide-${i}`} raw={page} index={i} edit={edit} />
      ))}
    </div>
  );
}
