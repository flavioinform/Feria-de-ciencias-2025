import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAlumno } from "../../context/AlumnoContext";

// ── Utilidades RUT ────────────────────────────────────────────────────────────
function calcularDV(rutNumero) {
  const digits = String(rutNumero).replace(/\D/g, "");
  if (digits.length < 7) return "";
  let suma = 0,
    factor = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    suma += Number(digits[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const r = 11 - (suma % 11);
  if (r === 11) return "0";
  if (r === 10) return "K";
  return String(r);
}

function formatearRutInput(raw) {
  const limpio = raw.replace(/[^0-9kK]/g, "");
  if (!limpio) return "";
  if (limpio.length === 1) return limpio;
  const dv = limpio.slice(-1).toUpperCase();
  const numero = limpio.slice(0, -1);
  const conPuntos = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conPuntos}-${dv}`;
}

function obtenerClave(rutFormateado) {
  const partes = rutFormateado.split("-");
  if (partes.length < 2) return "";
  const numero = partes[0].replace(/\./g, "");
  return numero.slice(-4);
}

// ── Helpers UI ────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-[#db2777]" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const FieldError = ({ msg }) =>
  msg ? <p className="mt-1.5 text-rose-500 text-xs font-semibold tracking-wide">⚠ {msg}</p> : null;

function inputCls(error) {
  const base =
    "w-full px-4 py-3.5 rounded-xl border-2 outline-none transition-all duration-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-offset-0 font-tech";
  return error
    ? `${base} border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20`
    : `${base} border-[#db2777]/15 focus:border-[#db2777] focus:ring-[#db2777]/10`;
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function AlumnoLogin() {
  const [rutDisplay, setRutDisplay] = useState("");
  const [password, setPassword] = useState("");
  const [errorRut, setErrorRut] = useState("");
  const [errorPass, setErrorPass] = useState("");
  const [cargando, setCargando] = useState(false);

  const { loginAlumno } = useAlumno();
  const navigate = useNavigate();

  const handleRutChange = (e) => {
    setRutDisplay(formatearRutInput(e.target.value));
    setErrorRut("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorRut("");
    setErrorPass("");

    const partes = rutDisplay.split("-");
    if (partes.length !== 2 || !partes[0] || !partes[1]) {
      setErrorRut("Ingresa un RUT válido (ej: 12.345.678-9)");
      return;
    }
    const numero = partes[0].replace(/\./g, "");
    const dvIngresado = partes[1].toUpperCase();
    const dvCalculado = calcularDV(numero);

    if (dvIngresado !== dvCalculado) {
      setErrorRut(`RUT inválido. El dígito verificador debería ser ${dvCalculado}`);
      return;
    }
    if (!password) {
      setErrorPass("Ingresa tu contraseña");
      return;
    }

    setCargando(true);

    const { data, error } = await supabase
      .from("participantes")
      .select(
        "*, proyectos(id, titulo, descripcion, image, categorias_id, categorias(nombre))"
      )
      .eq("rut", rutDisplay)
      .single();

    setCargando(false);

    if (error || !data) {
      setErrorRut("RUT no registrado en la feria");
      return;
    }

    const claveEsperada = obtenerClave(rutDisplay);
    if (password !== claveEsperada) {
      setErrorPass("Contraseña incorrecta");
      return;
    }

    loginAlumno(data);
    navigate("/alumno/proyecto");
  };

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

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* RUT */}
            <div>
              <label htmlFor="rut-alumno" className="block text-xs font-bold text-slate-700 font-tech uppercase tracking-wider mb-2">
                RUT del Alumno <span className="text-[#db2777]" aria-hidden>*</span>
              </label>
              <input
                id="rut-alumno"
                type="text"
                inputMode="text"
                placeholder="Ej: 12.345.678-9"
                maxLength={12}
                value={rutDisplay}
                onChange={handleRutChange}
                className={inputCls(errorRut)}
                autoComplete="off"
              />
              <FieldError msg={errorRut} />
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="pass-alumno" className="block text-xs font-bold text-slate-700 font-tech uppercase tracking-wider">
                  Contraseña <span className="text-[#db2777]" aria-hidden>*</span>
                </label>
                <span className="text-slate-500 text-[10px] font-tech">Últimos 4 dígitos del RUT (sin DV)</span>
              </div>
              <input
                id="pass-alumno"
                type="password"
                inputMode="numeric"
                placeholder="••••"
                maxLength={4}
                value={password}
                onChange={(e) => { setPassword(e.target.value.replace(/\D/g, "")); setErrorPass(""); }}
                className={inputCls(errorPass)}
                autoComplete="current-password"
              />
              <FieldError msg={errorPass} />
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-4 bg-transparent border-2 border-[#db2777] text-slate-900 hover:bg-[#db2777] hover:text-white font-tech text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[4px_4px_0px_#db2777] hover:shadow-[0px_0px_0px_transparent] active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {cargando ? (
                <>
                  <Spinner />
                  <span>Verificando...</span>
                </>
              ) : (
                "Ingresar al Portal"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
