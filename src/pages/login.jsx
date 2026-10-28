import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppContext } from "../context/AppContext";
import { authFeria, abrirSesion, formatearRut, mensajeError } from "../lib/authFeria";

const inputCls =
  "w-full px-4 py-4 border border-rose-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition duration-300";
const btnCls =
  "w-full bg-[#0b6e99] hover:bg-[#095a7e] text-white font-bold py-4 px-6 rounded-lg active:scale-[0.98] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base uppercase tracking-wider";

function destinoPorRol(role) {
  if (role === "admin") return "/admin/categorias-proyectos";
  if (role === "ayudante") return "/admin/registroLogin";
  return "/categorias";
}

function Login() {
  // paso: "rut" | "password" | "definir"
  const [paso, setPaso] = useState("rut");
  const [rut, setRut] = useState(() => {
    const r = new URLSearchParams(window.location.search).get("rut") ?? "";
    return /^JUR/i.test(r) ? r.toUpperCase() : formatearRut(r);
  });
  const [rol, setRol] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const procesado = useRef(false);
  const { user } = useContext(AppContext);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  // Con sesión ya abierta (p. ej. al volver de Google), ir a su panel
  useEffect(() => {
    if (user) navigate(destinoPorRol(user.role), { replace: true });
  }, [user, navigate]);

  const loginGoogle = async () => {
    setCargandoGoogle(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const entrar = async (r) => {
    if (!r.ok) {
      setMensaje(mensajeError(r.error));
      setCargando(false);
      return;
    }
    const abierta = await abrirSesion(r.token_hash);
    if (!abierta) {
      setMensaje("No se pudo abrir la sesión. Inténtalo nuevamente.");
      setCargando(false);
      return;
    }
    navigate(destinoPorRol(r.usuario.role), { replace: true });
  };

  const consultarRut = async (rutIngresado) => {
    setMensaje("");
    setCargando(true);
    const r = await authFeria("estado_rut", { rut: rutIngresado });
    setCargando(false);

    switch (r.estado) {
      case "activo":
        setRol(r.role);
        setPaso("password");
        break;
      case "pendiente":
        setRol(r.role);
        setPaso("definir");
        break;
      case "no_registrado":
      case "pendiente_vencido":
        setMensaje(mensajeError(r.estado));
        break;
      case "bloqueado":
        setMensaje(mensajeError("bloqueado"));
        break;
      default:
        setMensaje(mensajeError(r.error ?? "error_servidor"));
    }
  };

  // Enlaces del QR:
  //   /login?rut=...            visitante recién registrado (RUT ya escrito)
  //   /login?rut=...&code=...   jurado (entra directo con su código)
  useEffect(() => {
    if (procesado.current) return;
    const params = new URLSearchParams(location.search);
    const r = params.get("rut");
    const code = params.get("code");
    if (!r) return;
    procesado.current = true;
    // Saca las credenciales de la barra de direcciones / historial
    window.history.replaceState({}, "", "/login");

    const rutFmt = /^JUR/i.test(r) ? r.toUpperCase() : formatearRut(r);
    if (code) {
      setCargando(true);
      authFeria("login", { rut: rutFmt, password: code }).then(entrar);
    } else {
      consultarRut(rutFmt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRutChange = (e) => {
    const v = e.target.value;
    setRut(/^JUR/i.test(v) ? v.toUpperCase() : formatearRut(v));
  };

  const submitRut = (e) => {
    e.preventDefault();
    consultarRut(rut);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);
    const r = await authFeria("login", { rut, password });
    await entrar(r);
  };

  const submitDefinir = async (e) => {
    e.preventDefault();
    setMensaje("");
    if (password !== confirmar) {
      setMensaje("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    const r = await authFeria("definir_password", { rut, password });
    await entrar(r);
  };

  const volver = () => {
    setPaso("rut");
    setPassword("");
    setConfirmar("");
    setMensaje("");
  };

  const soloNumeros = rol === "visitante";
  const campoPass = {
    type: "password",
    inputMode: soloNumeros ? "numeric" : "text",
    autoComplete: "off",
    maxLength: soloNumeros ? 6 : 100,
  };
  const limpiar = (v) => (soloNumeros ? v.replace(/\D/g, "") : v);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-rose-400/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ingreso a la Feria</h1>
          <p className="text-slate-500 mt-2 text-base">
            {paso === "rut" && "Escribe tu RUT para comenzar"}
            {paso === "password" && "Escribe tu contraseña"}
            {paso === "definir" && "Es tu primera vez: crea tu contraseña"}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-rose-200 shadow-2xl shadow-rose-500/10">
          {paso === "rut" && (
            <>
              <button
                type="button"
                onClick={loginGoogle}
                disabled={cargandoGoogle}
                className="w-full mb-6 py-4 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-rose-300 font-bold text-sm uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Administrador: entrar con Google
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-slate-400 text-xs uppercase tracking-widest">visitantes y jurados</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            <form onSubmit={submitRut} className="space-y-6">
              <div>
                <label htmlFor="rut" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  RUT
                </label>
                <input
                  id="rut"
                  type="text"
                  inputMode="text"
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={handleRutChange}
                  className={inputCls}
                  autoComplete="off"
                  required
                />
              </div>
              <button type="submit" disabled={cargando || !rut} className={btnCls}>
                {cargando ? "Verificando..." : "Continuar"}
              </button>
            </form>
            </>
          )}

          {paso === "password" && (
            <form onSubmit={submitPassword} className="space-y-6">
              <p className="text-slate-600 text-center font-semibold">{rut}</p>
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  {...campoPass}
                  placeholder={soloNumeros ? "6 números" : "Contraseña"}
                  value={password}
                  onChange={(e) => setPassword(limpiar(e.target.value))}
                  className={inputCls}
                  autoFocus
                  required
                />
              </div>
              <button type="submit" disabled={cargando || !password} className={btnCls}>
                {cargando ? "Ingresando..." : "Ingresar"}
              </button>
              <button type="button" onClick={volver} className="w-full text-slate-500 text-sm underline">
                Cambiar RUT
              </button>
            </form>
          )}

          {paso === "definir" && (
            <form onSubmit={submitDefinir} className="space-y-6">
              <p className="text-slate-600 text-center font-semibold">{rut}</p>
              <p className="text-slate-500 text-sm text-center">
                {soloNumeros
                  ? "Elige 6 números que puedas recordar. No uses números repetidos (111111), consecutivos (123456) ni parte de tu RUT."
                  : "Elige una contraseña de al menos 8 caracteres."}
              </p>
              <div>
                <label htmlFor="nueva" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nueva contraseña
                </label>
                <input
                  id="nueva"
                  {...campoPass}
                  placeholder={soloNumeros ? "6 números" : "Mínimo 8 caracteres"}
                  value={password}
                  onChange={(e) => setPassword(limpiar(e.target.value))}
                  className={inputCls}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmar" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Repítela
                </label>
                <input
                  id="confirmar"
                  {...campoPass}
                  placeholder="Repite la contraseña"
                  value={confirmar}
                  onChange={(e) => setConfirmar(limpiar(e.target.value))}
                  className={inputCls}
                  required
                />
              </div>
              <button type="submit" disabled={cargando || !password || !confirmar} className={btnCls}>
                {cargando ? "Guardando..." : "Guardar y entrar"}
              </button>
              <button type="button" onClick={volver} className="w-full text-slate-500 text-sm underline">
                Cambiar RUT
              </button>
            </form>
          )}

          {mensaje && (
            <div className="mt-6 p-4 rounded-2xl border bg-rose-50 border-rose-300 text-rose-700 text-base font-semibold">
              {mensaje}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
