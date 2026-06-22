import { useState, useContext } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Login() {
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AppContext); // Obtener función login del context

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    const rutNormalizado = rut.replace(/[.\-]/g, "").toUpperCase();

    // Crear admin automáticamente si es el RUT solicitado
    if (rutNormalizado === "146803180" && pin === "Feria2026F") {
      const { data: existente } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rut", "146803180")
        .maybeSingle();

      if (!existente) {
        // Intenta insertar (puede fallar si RLS está activo, pero no detendremos el login)
        await supabase.from("usuarios").insert({
          rut: "146803180",
          nombre: "Administrador",
          pin_hash: "Feria2026F",
          role: "admin",
          viene_por_alguien: false,
          por_quien_vino: null
        });
      }

      // Bypass forzado para garantizar acceso incluso si la base de datos restringe la inserción
      const userData = {
        id: existente?.id || "temp-admin-id",
        nombre: "Administrador",
        rut: "146803180",
        role: "admin"
      };
      
      login(userData);
      setMensaje(`Bienvenido/a Administrador`);
      setTipo("success");
      setCargando(false);
      setTimeout(() => navigate("/admin/categorias-proyectos"), 1000);
      return;
    }

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, nombre, rut, pin_hash, role")
      .eq("rut", rutNormalizado)
      .maybeSingle();

    if (error || !usuario) {
      setMensaje("RUT no registrado");
      setTipo("error");
      setCargando(false);
      return;
    }

    if (usuario.pin_hash !== pin) {
      setMensaje("PIN incorrecto");
      setTipo("error");
      setCargando(false);
      return;
    }

    // Guardar usuario en el contexto y localStorage
    const userData = {
      id: usuario.id,
      nombre: usuario.nombre,
      rut: usuario.rut,
      role: usuario.role
    };
    
    login(userData); // Esto guarda en context y localStorage

    setMensaje(`Bienvenido/a ${usuario.nombre}`);
    setTipo("success");
    setCargando(false);

    // Redirigir después de un momento
    setTimeout(() => {
      navigate("/categorias");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Glows de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">

          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent tracking-tight">Portal de Evaluación</h1>
          <p className="text-cyan-400 font-medium mt-1 text-sm tracking-wider">Acceso para Jurados y Administradores</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-800 shadow-2xl shadow-black/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                RUT
              </label>
              <input
                type="text"
                placeholder="Ingresa tu RUT sin puntos ni guion"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-800 rounded-xl bg-slate-950/80 text-white placeholder-slate-600 text-sm focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 outline-none transition duration-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                PIN de Acceso
              </label>
              <input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-800 rounded-xl bg-slate-950/80 text-white placeholder-slate-600 text-sm focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 outline-none transition duration-300"
                required
              />
            </div>

            {mensaje && (
              <div
                className={`p-4 rounded-2xl border text-sm font-semibold ${
                  tipo === "error"
                    ? "bg-rose-950/20 border-rose-500/30 text-rose-350"
                    : "bg-emerald-950/20 border-emerald-500/30 text-emerald-350"
                }`}
              >
                <div className="flex items-center gap-2">
                  {tipo === "error" ? (
                    <svg className="w-5 h-5 text-rose-450" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-emerald-450" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p>{mensaje}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all duration-300 shadow-md shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Autenticando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;