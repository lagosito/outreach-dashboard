import { NextResponse } from "next/server";
import { supaCount, supaSelect } from "@/db";

const ALL_ESTADOS = [
  "Nuevo", "Investigado", "Contacto encontrado", "FU1 Draft listo",
  "Draft listo", "Enviado", "Follow-up 1", "Follow-up 2",
  "Respondió", "Handoff", "Cerrado sin respuesta", "Descartado",
];

const PIPELINE_ESTADOS = [
  "Nuevo", "Investigado", "Contacto encontrado", "FU1 Draft listo",
  "Enviado", "Follow-up 1", "Follow-up 2", "Respondió",
];

export async function GET() {
  // Counts per estado (excluding Descartado for pipeline)
  const allContacts = await supaSelect("id, estado, contacto_email, created_at, fecha_envio");

  const totalAll = allContacts.length;
  const totalActive = allContacts.filter((c) => c.estado !== "Descartado").length;
  const emailFound = allContacts.filter(
    (c) => c.contacto_email && c.contacto_email.trim() !== "" && c.estado !== "Descartado"
  ).length;
  const draftsReady = allContacts.filter(
    (c) => c.estado === "Draft listo" || c.estado === "FU1 Draft listo"
  ).length;
  const sent = allContacts.filter((c) =>
    ["Enviado", "Follow-up 1", "Follow-up 2", "Respondió", "Handoff"].includes(c.estado)
  ).length;
  const responded = allContacts.filter((c) =>
    ["Respondió", "Handoff"].includes(c.estado)
  ).length;
  const descartado = allContacts.filter((c) => c.estado === "Descartado").length;

  // Funnel
  const funnel = PIPELINE_ESTADOS.map((estado) => ({
    estado,
    count: allContacts.filter((c) => c.estado === estado).length,
  }));

  // Weekly trend (leads created per week)
  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
  const weeklyTrend: { week: string; count: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(eightWeeksAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = allContacts.filter((c) => {
      const d = new Date(c.created_at);
      return d >= weekStart && d < weekEnd && c.estado !== "Descartado";
    }).length;
    weeklyTrend.push({
      week: weekStart.toISOString().split("T")[0],
      count,
    });
  }

  // Emails sent per week
  const sentWeekly = weeklyTrend.map((w) => {
    const weekStart = new Date(w.week);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = allContacts.filter((c) => {
      if (!c.fecha_envio) return false;
      const d = new Date(c.fecha_envio);
      return d >= weekStart && d < weekEnd;
    }).length;
    return { week: w.week, count };
  });

  // Estado distribution for donut (all estados)
  const estadoDist = ALL_ESTADOS.map((estado) => ({
    name: estado,
    value: allContacts.filter((c) => c.estado === estado).length,
  })).filter((e) => e.value > 0);

  const conversionRate = totalActive > 0 ? (responded / totalActive) * 100 : 0;

  // Growth rate
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const lastCount = allContacts.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length;
  const priorCount = allContacts.filter(
    (c) => new Date(c.created_at) >= sixtyDaysAgo && new Date(c.created_at) < thirtyDaysAgo
  ).length;
  const growthRate = priorCount > 0 ? ((lastCount - priorCount) / priorCount) * 100 : 0;

  return NextResponse.json({
    kpis: {
      totalLeads: totalActive,
      emailFound,
      draftsReady,
      sent,
      responded,
      descartado,
      conversionRate: Number(conversionRate.toFixed(1)),
      growthRate: Number(growthRate.toFixed(1)),
    },
    funnel,
    weeklyTrend,
    sentWeekly,
    estadoDist,
  });
}
