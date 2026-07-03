import { useState, useContext, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Login() {
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AppContext); // Obtener función login del context

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get("rut");
    const p = params.get("pin");
    if (r && p) {
      setRut(r);
      setPin(p);
      authenticate(r, p);
    }
  }, [location.search]);

  const authenticate = async (rutIngresado, pinIngresado) => {
    setMensaje("");
    setCargando(true);

    const rutNormalizado = rutIngresado.replace(/[.\-]/g, "").toUpperCase();

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

    if (usuario.pin_hash !== pinIngresado) {
      setMensaje("PIN incorrecto");
      setTipo("error");
      setCargando(false);
      return;
    }

    // Acceso restringido: solo el administrador puede ingresar.
    // Visitantes/jurados y ayudantes están bloqueados temporalmente.
    if (usuario.role !== "admin") {
      setMensaje("El acceso está deshabilitado. Solo el administrador puede ingresar.");
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

    // Redirigir después de un momento (solo admin llega hasta aquí)
    setTimeout(() => {
      navigate("/admin/categorias-proyectos");
    }, 1000);
  };

  const formatRUT = (value) => {
    // Remover caracteres no numéricos excepto guión
    let cleaned = value.replace(/[^\dkK-]/g, "").toUpperCase();

    // Si está vacío, retornar vacío
    if (!cleaned) return "";

    // Separar el dígito verificador (último carácter)
    let body = cleaned.replace(/-/g, "").slice(0, -1);
    let dv = cleaned.replace(/-/g, "").slice(-1);

    // Si no hay dígito verificador aún, solo formatear body
    if (!dv) {
      body = cleaned.replace(/-/g, "");
      dv = "";
    }

    // Formatear body con puntos: XX.XXX.XXX
    let formatted = "";
    for (let i = 0; i < body.length; i++) {
      if (i > 0 && (body.length - i) % 3 === 0) {
        formatted += ".";
      }
      formatted += body[i];
    }

    // Agregar dígito verificador con guión
    if (dv) {
      formatted += "-" + dv;
    }

    return formatted;
  };

  const handleRUTChange = (e) => {
    const formatted = formatRUT(e.target.value);
    setRut(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    authenticate(rut, pin);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Glows de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-rose-400/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">

          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 to-rose-600 bg-clip-text text-transparent tracking-tight">Portal de Evaluación</h1>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-rose-200 shadow-2xl shadow-rose-500/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                RUT
              </label>
              <input
                type="text"
                placeholder="Ej: 12.345.678-9"
                value={rut}
                onChange={handleRUTChange}
                className="w-full px-4 py-3.5 border border-rose-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition duration-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                PIN de Acceso
              </label>
              <input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3.5 border border-rose-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition duration-300"
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
              className="w-full bg-gradient-to-r from-white to-[#db2777] hover:from-slate-100 hover:to-rose-500 text-slate-900 font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all duration-300 shadow-md shadow-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
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