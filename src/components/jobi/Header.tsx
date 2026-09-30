"use client";

import { Moon, RefreshCw, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function Header({
  demo,
  onRefresh,
}: {
  demo: boolean;
  onRefresh: () => void;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="top">
      <div className="brand">
        <img
          className="brand-logo"
          src="/jobi-logo.svg"
          alt="JOBI"
          width={130}
          height={40}
        />
        <img
          className="brand-logo brand-logo-dark"
          src="/jobi-logo-dark.svg"
          alt=""
          aria-hidden="true"
          width={130}
          height={40}
        />
        <div>
          <span>Dashboard de leads</span>
        </div>
      </div>
      <div className="head-right">
        {demo ? (
          <span className="preview-tag">Vista previa con datos de ejemplo</span>
        ) : null}
        <button
          className="iconbtn"
          type="button"
          onClick={onRefresh}
          title="Actualizar datos"
          aria-label="Actualizar datos"
        >
          <RefreshCw size={16} />
        </button>
        <button
          className="iconbtn"
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <span className="live">
          <i />
          En vivo
        </span>
      </div>
    </header>
  );
}
