import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useAlumno } from "../context/AlumnoContext";

function Navbar() {
  const { user, logout } = useContext(AppContext);
  const { alumno, logoutAlumno } = useAlumno();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const handleAdminLogout = () => {
    logout();
    navigate("/");
  };

  const handleAlumnoLogout = () => {
    logoutAlumno();
    navigate("/");
  };

  // Ocultar Navbar si el alumno ha iniciado sesión
  if (alumno) return null;
  // El panel de administración trae su propia barra
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="bg-white border-b border-[#0b6e99]/15 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 bg-brutalist-noise select-none">
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-xl sm:text-2xl font-display font-black tracking-wider text-transparent uppercase transition-all duration-300 hover:opacity-90"
            style={{ WebkitTextStroke: "1px #0b6e99" }}
          >
            Feria de Ciencias
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* ── Sesión de Administrador/Jurado ── */}
            {user && (
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="hidden sm:block text-xs text-slate-600 font-tech">
                  {user?.role === "admin" ? "Administrador" : "Panel"}: <span className="font-bold text-[#0b6e99]">{user.nombre}</span>
                </span>
                <button
                  onClick={handleAdminLogout}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-transparent border-2 border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-tech text-xs font-bold uppercase transition-all duration-300 cursor-pointer rounded-sm"
                >
                  Salir
                </button>
              </div>
            )}

            {/* ── Sesión de Alumno ── */}
            {alumno && !user && (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link
                  to="/alumno/proyecto"
                  className="hidden sm:block text-xs text-slate-600 hover:text-[#0b6e99] transition-colors font-tech uppercase tracking-wider"
                >
                  Mi Proyecto: <span className="font-bold text-[#0b6e99]">{alumno.nombre}</span>
                </Link>
                <button
                  onClick={handleAlumnoLogout}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-transparent border-2 border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-tech text-xs font-bold uppercase transition-all duration-300 cursor-pointer rounded-sm"
                >
                  Salir
                </button>
              </div>
            )}

            {/* ── Sin sesión activa ── */}
            {!user && !alumno && (
              <Link
                to="/alumno/login"
                className="px-3 sm:px-5 py-2 sm:py-2.5 bg-transparent border-2 border-[#0b6e99] text-slate-900 hover:bg-[#0b6e99] hover:text-white font-tech text-xs font-bold uppercase transition-all duration-300 shadow-[3px_3px_0px_#0b6e99] hover:shadow-[0px_0px_0px_transparent] active:translate-x-0.5 active:translate-y-0.5 rounded-sm"
              >
                <span className="hidden sm:inline">Iniciar sesión</span>
                <span className="sm:hidden">Sesión</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;