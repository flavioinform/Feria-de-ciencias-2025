import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { useAlumno } from "../context/AlumnoContext";

function Navbar() {
  const { user, logout } = useContext(AppContext);
  const { alumno, logoutAlumno } = useAlumno();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <header className="bg-white border-b border-[#db2777]/15 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 bg-brutalist-noise select-none">
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-xl sm:text-2xl font-display font-black tracking-wider text-transparent uppercase transition-all duration-300 hover:opacity-90"
            style={{ WebkitTextStroke: "1px #db2777" }}
          >
            Feria de Ciencias
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* ── Sesión de Administrador/Jurado ── */}
            {user && (
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="hidden sm:block text-xs text-slate-600 font-tech">
                  {user?.role === "admin" ? "Administrador" : "Panel"}: <span className="font-bold text-[#db2777]">{user.nombre}</span>
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
                  className="hidden sm:block text-xs text-slate-600 hover:text-[#db2777] transition-colors font-tech uppercase tracking-wider"
                >
                  Mi Proyecto: <span className="font-bold text-[#db2777]">{alumno.nombre}</span>
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
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-transparent border-2 border-[#db2777] text-slate-900 hover:bg-[#db2777] hover:text-white font-tech text-xs font-bold uppercase transition-all duration-300 shadow-[3px_3px_0px_#db2777] hover:shadow-[0px_0px_0px_transparent] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer rounded-sm"
                >
                  <span className="hidden sm:inline">Iniciar sesión</span>
                  <span className="sm:hidden">Sesión</span>
                  <svg className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-rose-200 rounded-2xl shadow-xl shadow-rose-500/10 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-rose-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">¿Quién eres?</p>
                    </div>

                    <Link
                      to="/alumno/login"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-4 hover:bg-rose-50 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center group-hover:bg-[#db2777] group-hover:border-[#db2777] transition-colors">
                        <svg className="w-4 h-4 text-[#db2777] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-[#db2777] transition-colors">Soy Alumno</p>
                        <p className="text-[11px] text-slate-400">Accede a tu proyecto</p>
                      </div>
                    </Link>

                    <div className="border-t border-rose-100" />

                    <Link
                      to="/login"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-4 hover:bg-rose-50 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center group-hover:bg-[#db2777] group-hover:border-[#db2777] transition-colors">
                        <svg className="w-4 h-4 text-[#db2777] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-[#db2777] transition-colors">Soy Votante / Jurado</p>
                        <p className="text-[11px] text-slate-400">Evalúa los proyectos</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;