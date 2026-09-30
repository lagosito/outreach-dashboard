"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ContactsTab } from "@/components/jobi/ContactsTab";
import { DirectoryTab } from "@/components/jobi/DirectoryTab";
import { Header } from "@/components/jobi/Header";
import { LinkedInTab } from "@/components/jobi/LinkedInTab";
import { ToastProvider, useToast } from "@/components/jobi/Toast";
import {
  buildDirectory,
  stageOf,
  type Contact,
  type LinkedInCounts,
} from "@/lib/jobi";

type TabId = "contacts" | "linkedin" | "directory";

const EMPTY_COUNTS: LinkedInCounts = {
  posts: 0,
  draft_ready: 0,
  published: 0,
  avg_score: 0,
  queue: 0,
};

function Dashboard() {
  const notify = useToast();
  const [tab, setTab] = useState<TabId>("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liCounts, setLiCounts] = useState<LinkedInCounts>(EMPTY_COUNTS);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/contacts?all=1")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        setContacts(Array.isArray(data.contacts) ? data.contacts : []);
        setError(null);
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(`No se pudieron cargar los contactos (${err.message}).`);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const people = useMemo(() => buildDirectory(contacts), [contacts]);
  const activeContacts = useMemo(
    () => contacts.filter((c) => stageOf(c.estado) !== "descartado").length,
    [contacts]
  );

  const onStatusChange = useCallback(
    async (id: string, estado: string) => {
      const isDiscard = estado === "Descartado";
      const url = isDiscard ? "/api/contacts/discard" : "/api/contacts/update-status";
      const body = isDiscard ? { id } : { id, estado };
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setContacts((prev) =>
          prev.map((contact) =>
            contact.id === id
              ? {
                  ...contact,
                  estado,
                  fecha_envio:
                    !isDiscard && estado === "Enviado" && !contact.fecha_envio
                      ? new Date().toISOString()
                      : contact.fecha_envio,
                  updated_at: new Date().toISOString(),
                }
              : contact
          )
        );
        notify(
          isDiscard
            ? "Contacto descartado"
            : estado === "Enviado"
              ? "Marcado como enviado"
              : "Marcado como respondido"
        );
      } catch {
        notify("No se pudo actualizar el estado");
      }
    },
    [notify]
  );

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const handleCounts = useCallback(
    (counts: LinkedInCounts) => setLiCounts(counts),
    []
  );

  return (
    <div className="min-h-screen">
      <div className="wrap">
        <Header demo={liCounts.posts === 0 && liCounts.queue === 0} onRefresh={refresh} />

        <div className="tabrow">
          <nav className="tabs" role="tablist" aria-label="Secciones">
            <button
              role="tab"
              id="tab-contacts"
              aria-controls="p-contacts"
              aria-selected={tab === "contacts"}
              data-tab="contacts"
              onClick={() => setTab("contacts")}
            >
              Ofertas <span className="count">{activeContacts}</span>
            </button>
            <button
              role="tab"
              id="tab-linkedin"
              aria-controls="p-linkedin"
              aria-selected={tab === "linkedin"}
              data-tab="linkedin"
              onClick={() => setTab("linkedin")}
            >
              Post <span className="count">{liCounts.posts + liCounts.queue}</span>
              {liCounts.queue > 0 ? (
                <span className="count hot">{liCounts.queue}</span>
              ) : null}
            </button>
            <button
              role="tab"
              id="tab-directory"
              aria-controls="p-directory"
              aria-selected={tab === "directory"}
              data-tab="directory"
              onClick={() => setTab("directory")}
            >
              Directorio <span className="count">{people.length}</span>
            </button>
          </nav>
        </div>

        <section
          id="p-contacts"
          role="tabpanel"
          aria-labelledby="tab-contacts"
          hidden={tab !== "contacts"}
        >
          <ContactsTab
            contacts={contacts}
            loading={loading}
            error={error}
            onStatusChange={onStatusChange}
          />
        </section>

        <section
          id="p-linkedin"
          role="tabpanel"
          aria-labelledby="tab-linkedin"
          hidden={tab !== "linkedin"}
        >
          <LinkedInTab onCounts={handleCounts} refreshKey={refreshKey} />
        </section>

        <section
          id="p-directory"
          role="tabpanel"
          aria-labelledby="tab-directory"
          hidden={tab !== "directory"}
        >
          <DirectoryTab people={people} />
        </section>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </ThemeProvider>
  );
}
