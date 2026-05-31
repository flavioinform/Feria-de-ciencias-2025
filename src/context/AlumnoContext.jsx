import { createContext, useContext, useState } from "react";

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

  const loginAlumno = (data) => {
    sessionStorage.setItem("alumno_feria", JSON.stringify(data));
    setAlumno(data);
  };

  const logoutAlumno = () => {
    sessionStorage.removeItem("alumno_feria");
    setAlumno(null);
  };

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
      value={{ alumno, loginAlumno, logoutAlumno, actualizarProyecto }}
    >
      {children}
    </AlumnoContext.Provider>
  );
}

export const useAlumno = () => useContext(AlumnoContext);
