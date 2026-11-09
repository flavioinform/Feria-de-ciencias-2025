import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

  // Con sesión ya abierta (p. ej. al volver de Google), ir a su panel
  useEffect(() => {
    if (user) navigate(destinoPorRol(user.role), { replace: true });
  }, [user, navigate]);

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
    if (esVisitante && password.length < 4) {
      setMensaje("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
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

  const esVisitante = rol === "visitante";
  const campoPass = {
    type: "password",
    inputMode: "text",
    autoComplete: "off",
    maxLength: esVisitante ? 8 : 100,
    autoCapitalize: "none",
    autoCorrect: "off",
  };
  const limpiar = (v) => (esVisitante ? v.replace(/[^A-Za-z0-9]/g, "") : v);

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
                  placeholder="Contraseña"
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
                {esVisitante
                  ? "Elige de 4 a 8 letras o números que puedas recordar. Evita repetidos (1111), secuencias (1234) y parte de tu RUT."
                  : "Elige una contraseña de al menos 8 caracteres."}
              </p>
              <div>
                <label htmlFor="nueva" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nueva contraseña
                </label>
                <input
                  id="nueva"
                  {...campoPass}
                  placeholder={esVisitante ? "4 a 8 letras o números" : "Mínimo 8 caracteres"}
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
