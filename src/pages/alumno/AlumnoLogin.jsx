import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAlumno } from "../../context/AlumnoContext";
import CompletarPerfilAlumno from "./CompletarPerfilAlumno";

// ── Helpers UI ────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-[#db2777]" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── Componente ────────────────────────────────────────────────────────────────
export default function AlumnoLogin() {
  const { alumno, googlePendiente, errorGoogle } = useAlumno();
  const navigate = useNavigate();
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  // Al volver de Google con un alumno ya inscrito, ir directo a su proyecto
  useEffect(() => {
    if (alumno) navigate("/alumno/proyecto", { replace: true });
  }, [alumno, navigate]);

  const handleGoogleLogin = async () => {
    setCargandoGoogle(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/alumno/login`,
        queryParams: { hd: "alumnos.uta.cl", prompt: "select_account" },
      },
    });
  };

  if (googlePendiente) {
    return <CompletarPerfilAlumno />;
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 relative overflow-hidden bg-white bg-brutalist-noise border-b border-[#db2777]/10">
      {/* Elementos decorativos de fondo (Glows) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#db2777]/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#db2777]/3 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase">
            Portal del Alumno
          </h1>
          <p className="text-[#db2777] font-tech font-bold mt-1 text-xs tracking-[0.2em] uppercase">Feria de Ciencias 2026</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-[#db2777]/15 shadow-sm shadow-[#db2777]/10 relative overflow-hidden">

          {/* Subtle top stripe */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#db2777]"></div>

          {errorGoogle && (
            <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-500/30 rounded-2xl text-rose-600 text-xs font-tech">
              ⚠ {errorGoogle}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={cargandoGoogle}
            className="w-full py-4 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-[#db2777]/40 font-tech text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {cargandoGoogle ? (
              <Spinner />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>Ingresar con cuenta @alumnos.uta.cl</span>
          </button>

        </div>
      </div>
    </div>
  );
}
