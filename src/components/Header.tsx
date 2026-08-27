"use client";

import { Moon, Sun, RefreshCw } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface HeaderProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export function Header({ lastUpdated, onRefresh }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">OL</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">
                Outreach Pipeline
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Dashboard de Leads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] pulse-dot" />
              <span className="text-xs text-[var(--text-muted)]">
                {lastUpdated
                  ? `Actualizado ${lastUpdated.toLocaleTimeString("es-ES")}`
                  : "En vivo"}
              </span>
            </div>

            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[var(--text-secondary)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
