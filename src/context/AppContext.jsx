import { createContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const AppContext = createContext();

// Quién es el usuario de la sesión, sin confiar en nada que el cliente pueda
// escribir:
//  - jurado / visitante: el rol viaja en app_metadata (lo fija solo el servidor).
//  - admin: cuenta de Google cuyo correo está en `staff_google`;
//    el rol lo resuelve la base de datos (jwt_role) y es el mismo que usan
//    las políticas RLS.
async function resolverUsuario(session) {
  const u = session?.user;
  if (!u) return null;

  const m = u.app_metadata ?? {};
  if (m.role && m.usuario_id) {
    return { id: m.usuario_id, nombre: m.nombre, rut: m.rut, role: m.role };
  }

  if (m.provider === "google") {
    const { data: role, error } = await supabase.rpc("jwt_role");
    if (error) {
      console.error("No se pudo resolver el rol (jwt_role):", error);
      return undefined; // fallo transitorio: no cambia al usuario actual
    }
    if (role === "admin") {
      return {
        id: u.id,
        nombre: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email,
        rut: null,
        email: u.email,
        role,
      };
    }
  }
  // Alumnos (Google sin rol) los maneja AlumnoContext
  return null;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    let ultima = 0;
    const aplicar = (session) => {
      const n = ++ultima;
      return resolverUsuario(session).then((u) => {
        // Descarta resultados viejos que llegan después de uno más reciente
        if (!activo || n !== ultima) return;
        if (u !== undefined) setUser(u);
        setLoading(false);
      });
    };

    supabase.auth.getSession().then(({ data }) => aplicar(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Se difiere para no llamar a supabase dentro del propio callback
      setTimeout(() => aplicar(session), 0);
    });
    return () => {
      activo = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AppContext.Provider value={{ user, logout, loading }}>
      {children}
    </AppContext.Provider>
  );
}
