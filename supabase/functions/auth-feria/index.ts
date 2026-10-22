// Edge Function: auth-feria
// Login por RUT + contraseña para jurado / visitante, y administración de
// esos usuarios. (Admin y ayudantes entran con Google; ver staff_google.) Usa la service_role (solo existe aquí, en
// el servidor) para:
//   - verificar contraseñas contra la tabla `usuarios` (funciones fn_* de SQL)
//   - crear/actualizar el usuario real de Supabase Auth con su rol en
//     app_metadata (el cliente NO puede modificar app_metadata)
//   - entregar un token de un solo uso con el que el navegador abre sesión
//
// Deploy:  supabase functions deploy auth-feria --no-verify-jwt --project-ref <REF>
// (--no-verify-jwt porque el login se llama sin sesión; los permisos de las
//  acciones de staff se validan abajo leyendo el rol del JWT del llamador)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Dominio de los correos internos (nunca se envía nada a ellos).
const EMAIL_DOMINIO = Deno.env.get("EMAIL_DOMINIO") ?? "feriadeciencias.online";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

type Usuario = {
  id: string;
  nombre: string;
  rut: string;
  role: string;
  auth_user_id: string | null;
};

// ---- Quién llama (para acciones de staff) --------------------------------
// admin / ayudante = cuenta de Google cuyo correo está en staff_google.
async function llamador(req: Request): Promise<{ role: string | null }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { role: null };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { role: null };
  if (data.user.app_metadata?.provider !== "google" || !data.user.email) return { role: null };
  const { data: fila } = await admin
    .from("staff_google")
    .select("role")
    .eq("email", data.user.email.toLowerCase())
    .maybeSingle();
  return { role: fila?.role ?? null };
}

// ---- Sesión: usuario de Auth + token de un solo uso ----------------------
async function crearSesion(u: Usuario) {
  const email = `${u.id}@${EMAIL_DOMINIO}`;
  const app_metadata = { role: u.role, usuario_id: u.id, rut: u.rut, nombre: u.nombre };

  if (!u.auth_user_id) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata,
    });
    if (error || !data.user) throw new Error("No se pudo crear la sesión: " + (error?.message ?? ""));
    await admin.from("usuarios").update({ auth_user_id: data.user.id }).eq("id", u.id);
  } else {
    // Mantiene el rol/nombre del token sincronizados con la tabla
    await admin.auth.admin.updateUserById(u.auth_user_id, { app_metadata });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    throw new Error("No se pudo generar el acceso: " + (linkError?.message ?? ""));
  }
  return { token_hash: link.properties.hashed_token, usuario: { id: u.id, nombre: u.nombre, rut: u.rut, role: u.role } };
}

// ---- Utilidades -----------------------------------------------------------
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos (0/O, 1/I/L)
function aleatorio(largo: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}
function digitos(largo: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => String(b % 10)).join("");
}
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

// ---- Handler --------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);

  try {
    const body = await req.json();
    const action = str(body.action, 40);

    // ======== Públicas ========
    if (action === "estado_rut") {
      return json(await rpc("fn_estado_rut", { p_rut: str(body.rut, 20) }));
    }

    if (action === "login") {
      const r = await rpc("fn_login", { p_rut: str(body.rut, 20), p_password: str(body.password, 100) });
      if (!r.ok) return json(r);
      return json({ ok: true, ...(await crearSesion(r.usuario as Usuario)) });
    }

    if (action === "definir_password") {
      const r = await rpc("fn_definir_password", { p_rut: str(body.rut, 20), p_password: str(body.password, 100) });
      if (!r.ok) return json(r);
      return json({ ok: true, ...(await crearSesion(r.usuario as Usuario)) });
    }

    // ======== Staff (admin o ayudante) ========
    const quien = await llamador(req);
    const esAdmin = quien.role === "admin";
    const esStaff = esAdmin || quien.role === "ayudante";

    if (action === "registrar_visitante") {
      if (!esStaff) return json({ ok: false, error: "no_autorizado" }, 403);
      const viene = body.viene_por_alguien === true;
      return json(
        await rpc("fn_crear_usuario", {
          p_nombre: str(body.nombre, 120),
          p_rut: str(body.rut, 20),
          p_role: "visitante",
          p_viene: viene,
          p_por_quien: viene ? str(body.por_quien_vino, 200) : null,
          p_password: null,
        }),
      );
    }

    if (action === "habilitar_visitante") {
      if (!esStaff) return json({ ok: false, error: "no_autorizado" }, 403);
      return json(await rpc("fn_habilitar_visitante", { p_id: str(body.usuario_id, 50) }));
    }

    // ======== Solo admin ========
    if (!esAdmin) return json({ ok: false, error: "no_autorizado" }, 403);

    if (action === "crear_jurado") {
      const nombre = str(body.nombre, 120);
      for (let intento = 0; intento < 5; intento++) {
        const rut = "JUR" + digitos(6);
        const codigo = aleatorio(10);
        const r = await rpc("fn_crear_usuario", {
          p_nombre: nombre, p_rut: rut, p_role: "jurado", p_viene: false, p_por_quien: null, p_password: codigo,
        });
        if (r.ok) return json({ ok: true, id: r.id, rut, codigo });
        if (r.error !== "rut_existente") return json(r);
      }
      return json({ ok: false, error: "reintentar" });
    }

    if (action === "regenerar_jurado") {
      const codigo = aleatorio(10);
      const r = await rpc("fn_asignar_password", { p_id: str(body.usuario_id, 50), p_password: codigo });
      if (!r.ok) return json(r);
      return json({ ok: true, rut: r.rut, codigo });
    }

    if (action === "eliminar_usuario") {
      const id = str(body.usuario_id, 50);
      const { data: u } = await admin.from("usuarios").select("id, role, auth_user_id").eq("id", id).maybeSingle();
      if (!u) return json({ ok: false, error: "no_encontrado" });
            if (u.auth_user_id) await admin.auth.admin.deleteUser(u.auth_user_id);
      const { error } = await admin.from("usuarios").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ ok: false, error: "accion_desconocida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "error_servidor" }, 500);
  }
});
