// src/components/AdminNavbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

function AdminNavbar() {
  const { user, logout } = useContext(AppContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();          // limpia contexto + localStorage
    navigate("/");     // vuelve al inicio público
  };

  return (
    <header className="bg-slate-900 text-white shadow-md">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">Panel administrador</span>

          <Link
            to="/admin/registroLogin"
            className="text-sm hover:text-emerald-300"
          >
            Registrar visitantes
          </Link>

          <Link
            to="/admin/resultados"
            className="text-sm  text-black"
          >
            Resultados / votos
          </Link>

          <Link
            to="/admin/por-quien-vino"
            className="text-sm hover:text-emerald-300"
          >
            ¿Por quién vinieron?
          </Link>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user && (
            <span className="text-slate-300">
              {user.nombre} <span className="text-xs">(admin)</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="bg-emerald-500 hover:bg-emerald-600 text-sm px-3 py-1.5 rounded-md"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
    </header>
  );
}

export default AdminNavbar;
