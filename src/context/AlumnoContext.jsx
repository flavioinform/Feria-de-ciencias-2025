import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const DOMINIO_PERMITIDO = "@alumnos.uta.cl";

const AlumnoContext = createContext(null);

export function AlumnoProvider({ children }) {
  const [alumno, setAlumno] = useState(() => {
    try {
      const saved = sessionStorage.getItem("alumno_feria");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // Cuenta de Google ya autenticada en Supabase Auth pero sin fila
  // vinculada en `participantes` todavía: { id, email, given_name, family_name }
  const [googlePendiente, setGooglePendiente] = useState(null);
  const [errorGoogle, setErrorGoogle] = useState("");

  const loginAlumno = (data) => {
    sessionStorage.setItem("alumno_feria", JSON.stringify(data));
    setGooglePendiente(null);
    setErrorGoogle("");
    setAlumno(data);
  };

  const logoutAlumno = () => {
    sessionStorage.removeItem("alumno_feria");
    setAlumno(null);
    setGooglePendiente(null);
    supabase.auth.signOut();
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "SIGNED_IN" || !session?.user) return;
        // Sesiones de jurado/visitante (con rol) no son alumnos
        if (session.user.app_metadata?.role) return;
        // El staff (admin/ayudante) vuelve de Google a /login, no a /alumno/*
        if (!window.location.pathname.startsWith("/alumno")) return;

        const email = session.user.email ?? "";
        if (!email.toLowerCase().endsWith(DOMINIO_PERMITIDO)) {
          setErrorGoogle(
            `Debes ingresar con tu cuenta institucional ${DOMINIO_PERMITIDO}`
          );
          await supabase.auth.signOut();
          return;
        }

        const { data: fila } = await supabase
          .from("participantes")
          .select(
            "*, proyectos(id, titulo, descripcion, image, categorias_id, categorias(nombre))"
          )
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (fila) {
          loginAlumno(fila);
          return;
        }

        const meta = session.user.user_metadata ?? {};
        setErrorGoogle("");
        setGooglePendiente({
          id: session.user.id,
          email,
          given_name: meta.given_name ?? "",
          family_name: meta.family_name ?? "",
        });
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // Actualiza los datos del proyecto en sesión tras una edición
  const actualizarProyecto = (cambios) => {
    setAlumno((prev) => {
      if (!prev) return prev;
      const actualizado = {
        ...prev,
        proyectos: { ...prev.proyectos, ...cambios },
      };
      sessionStorage.setItem("alumno_feria", JSON.stringify(actualizado));
      return actualizado;
    });
  };

  return (
    <AlumnoContext.Provider
      value={{
        alumno,
        loginAlumno,
        logoutAlumno,
        actualizarProyecto,
        googlePendiente,
        errorGoogle,
      }}
    >
      {children}
    </AlumnoContext.Provider>
  );
}

export const useAlumno = () => useContext(AlumnoContext);
