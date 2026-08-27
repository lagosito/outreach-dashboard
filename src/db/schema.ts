import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Schema kept for type reference only — actual queries use Supabase REST API
export const outreachContacts = pgTable("outreach_contacts", {
  id: text("id").primaryKey(),
  empresa: text("empresa").notNull(),
  cargo: text("cargo").notNull(),
  job_link: text("job_link"),
  contacto_nombre: text("contacto_nombre").notNull(),
  contacto_email: text("contacto_email"),
  contacto_linkedin: text("contacto_linkedin"),
  estado: text("estado").notNull().default("Nuevo"),
  email_draft: text("email_draft"),
  hipotesis: text("hipotesis"),
  fecha_envio: timestamp("fecha_envio"),
  fecha_followup_1: timestamp("fecha_followup_1"),
  fecha_followup_2: timestamp("fecha_followup_2"),
  gmail_thread_id: text("gmail_thread_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
