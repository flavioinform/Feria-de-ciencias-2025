// Edge Function: enviar-correo
// El admin envía un correo a uno, varios o todos los participantes.
// Cada destinatario recibe su propio correo (nadie ve las direcciones de los demás).
//
// Usa Resend (https://resend.com). Secrets necesarios:
//   supabase secrets set RESEND_API_KEY=re_xxxxx
//   supabase secrets set MAIL_FROM="Feria de Ciencias <feria@tu-dominio.cl>"
//   (el dominio del remitente debe estar verificado en Resend)
//   supabase secrets set REPLY_TO=tu-correo@gmail.com   (opcional)
//
// Deploy:  supabase functions deploy enviar-correo --project-ref <REF>
// Solo responde a cuentas de Google que estén como admin en staff_google.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "";
// Opcional: a este correo llegan las respuestas de los participantes.
const REPLY_TO = Deno.env.get("REPLY_TO") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function esAdmin(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email || data.user.app_metadata?.provider !== "google") return false;
  const { data: fila } = await admin
    .from("staff_google")
    .select("role")
    .eq("email", data.user.email.toLowerCase())
    .maybeSingle();
  return fila?.role === "admin";
}

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DESTINATARIOS = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);

  try {
    if (!(await esAdmin(req))) return json({ ok: false, error: "no_autorizado" }, 403);
    if (!RESEND_API_KEY || !MAIL_FROM) return json({ ok: false, error: "correo_no_configurado" });

    const body = await req.json();
    const asunto = typeof body.asunto === "string" ? body.asunto.trim().slice(0, 200) : "";
    const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim().slice(0, 10000) : "";
    if (!asunto || !mensaje) return json({ ok: false, error: "faltan_datos" });

    const lista: string[] = Array.isArray(body.destinatarios) ? body.destinatarios : [];
    const destinatarios = [...new Set(lista.map((e) => String(e).trim().toLowerCase()))].filter((e) =>
      EMAIL_RE.test(e)
    );
    if (destinatarios.length === 0) return json({ ok: false, error: "sin_destinatarios" });
    if (destinatarios.length > MAX_DESTINATARIOS) return json({ ok: false, error: "demasiados_destinatarios" });

    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1e293b">${escapar(
      mensaje,
    ).replace(/\n/g, "<br>")}</div>`;

    let enviados = 0;
    const fallidos: string[] = [];
    for (let i = 0; i < destinatarios.length; i += 100) {
      const lote = destinatarios.slice(i, i + 100);
      const resp = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(lote.map((to) => ({ from: MAIL_FROM, to: [to], subject: asunto, html, text: mensaje, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }))),
      });
      if (resp.ok) enviados += lote.length;
      else fallidos.push(...lote);
    }
    return json({ ok: fallidos.length === 0, enviados, fallidos });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "error_servidor" }, 500);
  }
});
