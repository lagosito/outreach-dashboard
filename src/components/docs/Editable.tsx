"use client";

// Texto editable dentro de las plantillas de documentos.
//
// Truco anti-parpadeo: el contenido se escribe con ref.textContent en un
// useLayoutEffect (antes de pintar, así no hay flash de vacío) y se vuelve a
// sincronizar solo cuando el elemento NO tiene foco, de modo que mientras se
// escribe el navegador nunca toca el nodo y el cursor no salta. El cambio se
// notifica en onBlur con el texto actual del DOM.

import {
  useLayoutEffect,
  useRef,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import styles from "./docs.module.css";

/** Ruta dentro del JSON del documento, p. ej. ["experiencia", 2, "bullets", 0]. */
export type EditablePath = (string | number)[];

export interface EditableProps {
  value: string;
  onChange: (next: string, path: EditablePath) => void;
  path: EditablePath;
  /** Si es true el texto ocupa caja propia; si no, fluye dentro del padre. */
  block?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Permite saltos de línea con Enter; si no, Enter se ignora. */
  multiline?: boolean;
  /** Texto que se muestra mientras el campo esté vacío. */
  placeholder?: string;
}

export function Editable({
  value,
  onChange,
  path,
  block = false,
  className,
  style,
  multiline = false,
  placeholder,
}: EditableProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  // Montaje y actualizaciones externas: siempre fuera del foco.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const next = el.textContent ?? "";
    if (next !== value) onChange(next, path);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter") return;
    if (!multiline) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    document.execCommand("insertText", false, "\n");
  };

  const onPaste = (event: ReactClipboardEvent<HTMLSpanElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand(
      "insertText",
      false,
      multiline ? text : text.replace(/\s*\n+\s*/g, " ")
    );
  };

  const classNameList = [styles.ed, block ? styles.blk : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      ref={ref}
      className={classNameList}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  );
}

export default Editable;
