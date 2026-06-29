import { createContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      setLoading(false);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      setLoading(false);
      return;
    }

    // Verificar que el usuario y su rol realmente existen en la BD
    // Esto evita que alguien manipule localStorage para cambiar su rol
    supabase
      .from("usuarios")
      .select("id, nombre, rut, role")
      .eq("id", parsed.id)
      .eq("role", parsed.role)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // Usar los datos reales de la BD, no los del localStorage
          setUser(data);
        } else {
          // El rol no coincide o el usuario no existe → sesión inválida
          localStorage.removeItem("user");
          setUser(null);
        }
        setLoading(false);
      });
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AppContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AppContext.Provider>
  );
}
