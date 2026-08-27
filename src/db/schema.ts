// Types only — actual queries use Supabase REST API (src/db/index.ts)

export interface Contact {
  id: string;
  empresa: string;
  cargo: string;
  job_link: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_linkedin: string;
  estado: string;
  email_draft: string;
  hipotesis: string;
  fecha_envio: string | null;
  fecha_followup_1: string | null;
  fecha_followup_2: string | null;
  gmail_thread_id: string;
  created_at: string;
  updated_at: string;
}
