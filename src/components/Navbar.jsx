import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useAlumno } from "../context/AlumnoContext";

function Navbar() {
  const { user, logout } = useContext(AppContext);
  const { alumno, logoutAlumno } = useAlumno();
  const navigate = useNavigate();

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

  return (
    <header className="bg-[#050505] border-b border-[#f490b1]/15 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 bg-brutalist-noise select-none">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl sm:text-3xl font-display font-black tracking-wider sm:tracking-widest text-transparent uppercase transition-all duration-300 hover:opacity-90"
            style={{ WebkitTextStroke: "1px #f490b1" }}
          >
            Feria de Ciencias
          </Link>

          <div className="flex items-center gap-4">
            {/* ── Sesión de Administrador/Jurado ── */}
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-300 font-tech">
                  Panel Jurado: <span className="font-bold text-[#f490b1]">{user.nombre}</span>
                </span>
                <button
                  onClick={handleAdminLogout}
                  className="px-5 py-2.5 bg-transparent border-2 border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-tech text-xs font-bold uppercase transition-all duration-300 shadow-[3px_3px_0px_rgba(239,68,68,0.2)] hover:shadow-[0px_0px_0px_transparent] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  Cerrar sesión
                </button>
              </div>
            )}

            {/* ── Sesión de Alumno ── */}
            {alumno && !user && (
              <div className="flex items-center gap-4">
                <Link
                  to="/alumno/proyecto"
                  className="text-xs text-slate-300 hover:text-[#f490b1] transition-colors font-tech uppercase tracking-wider"
                >
                  Mi Proyecto: <span className="font-bold text-[#f490b1] underline decoration-[#f490b1]/30 decoration-2 underline-offset-4">{alumno.nombre}</span>
                </Link>
                <button
                  onClick={handleAlumnoLogout}
                  className="px-5 py-2.5 bg-transparent border-2 border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-tech text-xs font-bold uppercase transition-all duration-300 shadow-[3px_3px_0px_rgba(239,68,68,0.2)] hover:shadow-[0px_0px_0px_transparent] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  Salir
                </button>
              </div>
            )}

            {/* ── Sin sesión activa ── */}
            {!user && !alumno && (
              <div className="flex items-center gap-4">
                <Link
                  to="/alumno/login"
                  className="px-5 py-2.5 bg-transparent border-2 border-[#f490b1] text-white hover:bg-[#f490b1] hover:text-[#050505] font-tech text-xs font-bold uppercase transition-all duration-300 shadow-[3px_3px_0px_#f490b1] hover:shadow-[0px_0px_0px_transparent] active:translate-x-0.5 active:translate-y-0.5 text-center"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro-participante"
                  className="px-5 py-2.5 bg-[#050505] border-2 border-white text-white hover:bg-white hover:text-[#050505] font-tech text-xs font-bold uppercase transition-all duration-300 shadow-[3px_3px_0px_#ffffff] hover:shadow-[0px_0px_0px_transparent] active:translate-x-0.5 active:translate-y-0.5 text-center"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;