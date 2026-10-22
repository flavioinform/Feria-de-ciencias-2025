import { supabase } from "./supabase";

// Llama a la Edge Function `auth-feria` (login por RUT + contraseña y
// administración de usuarios). Siempre devuelve un objeto { ok, ... }.
export async function authFeria(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("auth-feria", {
    body: { action, ...payload },
  });
  if (error) {
    // La función responde JSON también en 4xx/5xx: intentamos leerlo
    try {
      const cuerpo = await error.context?.json?.();
      if (cuerpo) return cuerpo;
    } catch {
      /* sin cuerpo legible */
    }
    return { ok: false, error: "error_servidor" };
  }
  return data;
}

// Abre la sesión de Supabase con el token de un solo uso que entrega la función
export async function abrirSesion(token_hash) {
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: "magiclink" });
  return !error;
}

export const normalizarRut = (rut) => rut.replace(/[.\-\s]/g, "").toUpperCase();

export function formatearRut(valor) {
  const limpio = valor.replace(/[^0-9kK]/g, "").toUpperCase();
  if (!limpio) return "";
  if (limpio.length === 1) return limpio;
  const dv = limpio.slice(-1);
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${dv}`;
}

export const MENSAJES_ERROR = {
  no_registrado: "Este RUT no está registrado. Acércate al mesón para registrarte.",
  bloqueado: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  credenciales: "Contraseña incorrecta.",
  pendiente_vencido: "Tu registro venció. Pide en el mesón que te vuelvan a habilitar.",
  password_invalida:
    "Contraseña no válida. Usa 6 números que no sean repetidos, consecutivos ni parte de tu RUT.",
  no_pendiente: "Esta cuenta ya tiene contraseña.",
  rut_invalido: "RUT inválido. Revisa el número y el dígito verificador.",
  rut_existente: "Este RUT ya está registrado.",
  nombre_invalido: "El nombre es demasiado corto.",
  no_autorizado: "No tienes permiso para realizar esta acción.",
  error_servidor: "Ocurrió un error. Inténtalo nuevamente.",
};

export const mensajeError = (codigo) =>
  MENSAJES_ERROR[codigo] ?? "No se pudo completar la acción.";
