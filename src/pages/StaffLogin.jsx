import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppContext } from "../context/AppContext";

// Ingreso del equipo organizador (administrador y estudiantes de logística)
// con su cuenta institucional de Google. Qué puede hacer cada cuenta lo decide
// la tabla `staff_google` en la base de datos.
function destinoPorRol(role) {
  return role === "admin" ? "/admin/categorias-proyectos" : "/admin/registroLogin";
}

export default function StaffLogin() {
  const { user, loading } = useContext(AppContext);
  const navigate = useNavigate();
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "ayudante")) {
      navigate(destinoPorRol(user.role), { replace: true });
    }
  }, [user, navigate]);

  // Volvió de Google pero su correo no está autorizado
  useEffect(() => {
    if (loading || user) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u?.app_metadata?.provider === "google" && !u.app_metadata?.role) setSinPermiso(true);
    });
  }, [loading, user]);

  const loginGoogle = async () => {
    setCargandoGoogle(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/staff`,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const cambiarCuenta = async () => {
    await supabase.auth.signOut();
    setSinPermiso(false);
  };

  return (
    <div className="min-h-[80vh] bg-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0b6e99]/5 rounded-full blur-[110px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Acceso del equipo</h1>
          <p className="text-slate-500 mt-2 text-base">Administración y logística</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-[#0b6e99]/20 shadow-2xl shadow-[#0b6e99]/10">
          {sinPermiso && (
            <div className="mb-6 p-4 rounded-2xl border bg-rose-50 border-rose-300 text-rose-700 text-sm font-semibold">
              Esa cuenta no está autorizada. Pide al administrador que agregue tu correo institucional.
              <button onClick={cambiarCuenta} className="block mt-2 underline">
                Usar otra cuenta
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={loginGoogle}
            disabled={cargandoGoogle}
            className="w-full py-4 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-[#0b6e99]/50 font-bold text-sm uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {cargandoGoogle ? "Redirigiendo..." : "Entrar con Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
