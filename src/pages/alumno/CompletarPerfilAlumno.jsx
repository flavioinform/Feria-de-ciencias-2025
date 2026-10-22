import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAlumno } from "../../context/AlumnoContext";

// ── Módulo 11 SII ─────────────────────────────────────────────────────────────
function calcularDV(rutStr) {
  const digits = String(rutStr).replace(/\D/g, "");
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

function formatearRutBD(numero, dv) {
  const limpio = numero.replace(/\D/g, "");
  const conPuntos = limpio.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conPuntos}-${dv.toUpperCase()}`;
}

function validarRutNumero(v) {
  if (!v) return "El número de RUT es obligatorio.";
  const n = parseInt(v.replace(/\D/g, ""), 10);
  if (isNaN(n) || n < 1_000_000 || n > 40_000_000)
    return "RUT debe estar entre 1.000.000 y 40.000.000.";
  return "";
}

function validarDV(dv, rutNumero) {
  if (!dv) return "El dígito verificador es obligatorio.";
  const calculado = calcularDV(rutNumero);
  if (dv.toUpperCase() !== calculado)
    return `DV incorrecto. El esperado es: ${calculado}`;
  return "";
}

function validarNombres(v) {
  if (!v.trim()) return "El nombre es obligatorio.";
  if (v.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
  return "";
}

function validarApellido(v, campo) {
  if (!v.trim()) return `El ${campo} es obligatorio.`;
  if (v.trim().length < 2) return `El ${campo} debe tener al menos 2 caracteres.`;
  return "";
}

function cls(error, valid) {
  const base =
    "w-full px-4 py-3.5 rounded-xl border-2 outline-none transition-all duration-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-offset-0 font-tech";
  if (error)
    return `${base} border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10`;
  if (valid)
    return `${base} border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/10`;
  return `${base} border-[#db2777]/15 focus:border-[#db2777] focus:ring-[#db2777]/10`;
}

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-[#db2777]" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const FieldError = ({ msg }) =>
  msg ? <p className="mt-1.5 text-rose-500 text-xs font-semibold tracking-wide">⚠ {msg}</p> : null;

// ── Componente ────────────────────────────────────────────────────────────────
export default function CompletarPerfilAlumno() {
  const { googlePendiente, loginAlumno } = useAlumno();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombres: googlePendiente?.given_name ?? "",
    apellidos: googlePendiente?.family_name ?? "",
    rutNumero: "",
    rutDV: "",
    categoriaId: "",
    proyectoId: "",
  });
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cargandoProyectos, setCargandoProyectos] = useState(false);

  useEffect(() => {
    supabase
      .from("categorias")
      .select("id, nombre")
      .order("orden")
      .then(({ data, error }) => {
        if (!error && data) setCategorias(data);
      });
  }, []);

  useEffect(() => {
    if (!form.categoriaId) {
      setProyectos([]);
      setForm((f) => ({ ...f, proyectoId: "" }));
      return;
    }
    setCargandoProyectos(true);
    setForm((f) => ({ ...f, proyectoId: "" }));
    supabase
      .from("proyectos")
      .select("id, titulo, categorias_id")
      .eq("categorias_id", form.categoriaId)
      .order("titulo")
      .then(({ data, error }) => {
        setCargandoProyectos(false);
        setProyectos(!error && data ? data : []);
      });
  }, [form.categoriaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const dv = calcularDV(form.rutNumero);
    if (dv) setForm((f) => ({ ...f, rutDV: dv }));
  }, [form.rutNumero]);

  const validate = useCallback(
    (campo, valor, extra = {}) => {
      switch (campo) {
        case "nombres":
          return validarNombres(valor);
        case "apellidos":
          return validarApellido(valor, "apellido");
        case "rutNumero":
          return validarRutNumero(valor);
        case "rutDV":
          return validarDV(valor, extra.rutNumero ?? form.rutNumero);
        case "categoriaId":
          return valor ? "" : "Selecciona una asignatura.";
        case "proyectoId":
          return valor ? "" : "Selecciona un proyecto.";
        default:
          return "";
      }
    },
    [form.rutNumero]
  );

  const handleChange = (campo, valor) => {
    let v = valor;
    if (campo === "rutNumero") v = valor.replace(/\D/g, "");
    if (campo === "rutDV")
      v = valor.replace(/[^0-9kK]/g, "").slice(0, 1).toUpperCase();

    setForm((f) => ({ ...f, [campo]: v }));
    if (tocados[campo]) {
      const err = validate(campo, v, campo === "rutDV" ? { rutNumero: form.rutNumero } : {});
      setErrores((e) => ({ ...e, [campo]: err }));
    }
  };

  const handleBlur = (campo) => {
    setTocados((t) => ({ ...t, [campo]: true }));
    const err = validate(campo, form[campo], campo === "rutDV" ? { rutNumero: form.rutNumero } : {});
    setErrores((e) => ({ ...e, [campo]: err }));
  };

  const isValid = (campo) => tocados[campo] && !errores[campo] && Boolean(form[campo]);

  const validateAll = () => {
    const e = {
      nombres: validate("nombres", form.nombres),
      apellidos: validate("apellidos", form.apellidos),
      rutNumero: validate("rutNumero", form.rutNumero),
      rutDV: validate("rutDV", form.rutDV, { rutNumero: form.rutNumero }),
      categoriaId: validate("categoriaId", form.categoriaId),
      proyectoId: validate("proyectoId", form.proyectoId),
    };
    setErrores(e);
    return Object.values(e).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorEnvio("");
    setTocados({
      nombres: true,
      apellidos: true,
      rutNumero: true,
      rutDV: true,
      categoriaId: true,
      proyectoId: true,
    });
    if (!validateAll() || !googlePendiente) return;

    setCargando(true);

    const rut = formatearRutBD(form.rutNumero, form.rutDV);
    const nombreCompleto = `${form.nombres.trim()} ${form.apellidos.trim()}`;

    try {
      // El servidor valida el dominio @alumnos.uta.cl desde el token, vincula
      // un registro previo con ese RUT o crea uno nuevo.
      const { data: filaId, error: errorRpc } = await supabase.rpc("fn_registrar_alumno", {
        p_nombre: nombreCompleto,
        p_rut: rut,
        p_proyecto_id: Number(form.proyectoId),
      });

      if (errorRpc) {
        setCargando(false);
        setErrorEnvio(errorRpc.message);
        return;
      }

      const { data: filaCompleta, error: errorFetch } = await supabase
        .from("participantes")
        .select(
          "*, proyectos(id, titulo, descripcion, image, categorias_id, categorias(nombre))"
        )
        .eq("id", filaId)
        .single();

      setCargando(false);

      if (errorFetch || !filaCompleta) {
        setErrorEnvio("Tu registro se guardó, pero no pudimos cargar tu proyecto. Vuelve a intentar iniciar sesión.");
        return;
      }

      loginAlumno(filaCompleta);
      navigate("/alumno/proyecto");
    } catch (err) {
      setCargando(false);
      setErrorEnvio("Error inesperado: " + err.message);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 relative overflow-hidden bg-white bg-brutalist-noise border-b border-[#db2777]/10">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#db2777]/5 rounded-full blur-[110px] pointer-events-none" />

      <div className="max-w-lg w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase">
            Completa tu Perfil
          </h1>
          <p className="text-[#db2777] font-tech font-bold mt-1 text-xs tracking-[0.2em] uppercase">
            Feria de Ciencias 2026
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-[#db2777]/15 shadow-sm shadow-[#db2777]/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#db2777]"></div>

          <p className="text-slate-500 text-xs font-tech mb-6">
            Ingresaste con <span className="font-bold text-slate-700">{googlePendiente?.email}</span>.
            Es tu primera vez, completa estos datos para inscribirte.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombres" className="block text-xs font-bold text-slate-600 font-tech uppercase tracking-widest mb-2">
                  Nombres <span className="text-rose-500" aria-hidden>*</span>
                </label>
                <input
                  id="nombres"
                  type="text"
                  value={form.nombres}
                  onChange={(e) => handleChange("nombres", e.target.value)}
                  onBlur={() => handleBlur("nombres")}
                  className={cls(tocados.nombres && errores.nombres, isValid("nombres"))}
                  autoComplete="given-name"
                />
                <FieldError msg={tocados.nombres && errores.nombres} />
              </div>
              <div>
                <label htmlFor="apellidos" className="block text-xs font-bold text-slate-600 font-tech uppercase tracking-widest mb-2">
                  Apellidos <span className="text-rose-500" aria-hidden>*</span>
                </label>
                <input
                  id="apellidos"
                  type="text"
                  value={form.apellidos}
                  onChange={(e) => handleChange("apellidos", e.target.value)}
                  onBlur={() => handleBlur("apellidos")}
                  className={cls(tocados.apellidos && errores.apellidos, isValid("apellidos"))}
                  autoComplete="family-name"
                />
                <FieldError msg={tocados.apellidos && errores.apellidos} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 font-tech uppercase tracking-widest mb-2">
                RUT del Estudiante <span className="text-rose-500" aria-hidden>*</span>
              </label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    id="rutNumero"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 12345678"
                    maxLength={8}
                    value={form.rutNumero}
                    onChange={(e) => handleChange("rutNumero", e.target.value)}
                    onBlur={() => handleBlur("rutNumero")}
                    className={cls(tocados.rutNumero && errores.rutNumero, isValid("rutNumero"))}
                    aria-label="Número de RUT sin puntos"
                  />
                  <FieldError msg={tocados.rutNumero && errores.rutNumero} />
                </div>
                <span className="pt-3 text-[#db2777] font-black text-lg select-none">–</span>
                <div className="w-24">
                  <input
                    id="rutDV"
                    type="text"
                    placeholder="DV"
                    maxLength={1}
                    value={form.rutDV}
                    onChange={(e) => handleChange("rutDV", e.target.value)}
                    onBlur={() => handleBlur("rutDV")}
                    className={`${cls(tocados.rutDV && errores.rutDV, isValid("rutDV"))} text-center font-mono font-bold uppercase tracking-widest text-[#db2777]`}
                    aria-label="Dígito verificador (0-9 o K)"
                  />
                  <FieldError msg={tocados.rutDV && errores.rutDV} />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="categoriaId" className="block text-xs font-bold text-slate-600 font-tech uppercase tracking-widest mb-2">
                Asignatura <span className="text-rose-500" aria-hidden>*</span>
              </label>
              <select
                id="categoriaId"
                value={form.categoriaId}
                onChange={(e) => handleChange("categoriaId", e.target.value)}
                onBlur={() => handleBlur("categoriaId")}
                className={cls(tocados.categoriaId && errores.categoriaId, isValid("categoriaId"))}
              >
                <option value="" className="bg-white text-slate-400">— Selecciona una asignatura —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-900 font-tech">
                    {c.nombre}
                  </option>
                ))}
              </select>
              <FieldError msg={tocados.categoriaId && errores.categoriaId} />
            </div>

            <div>
              <label htmlFor="proyectoId" className="block text-xs font-bold text-slate-600 font-tech uppercase tracking-widest mb-2 flex items-center">
                Proyecto <span className="text-rose-500 mr-1" aria-hidden>*</span>
                {cargandoProyectos && (
                  <span className="ml-2.5 inline-flex align-middle text-[#db2777]">
                    <Spinner />
                  </span>
                )}
              </label>
              <select
                id="proyectoId"
                value={form.proyectoId}
                onChange={(e) => handleChange("proyectoId", e.target.value)}
                onBlur={() => handleBlur("proyectoId")}
                disabled={!form.categoriaId || cargandoProyectos}
                className={`${cls(tocados.proyectoId && errores.proyectoId, isValid("proyectoId"))} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <option value="" className="bg-white text-slate-400">
                  {!form.categoriaId
                    ? "Selecciona primero una asignatura"
                    : proyectos.length === 0 && !cargandoProyectos
                      ? "No hay proyectos vigentes en esta categoría"
                      : "— Selecciona tu proyecto —"}
                </option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900 font-tech">
                    {p.titulo}
                  </option>
                ))}
              </select>
              <FieldError msg={tocados.proyectoId && errores.proyectoId} />
            </div>

            {errorEnvio && (
              <div className="flex gap-3 items-start p-4 bg-rose-50 border-2 border-rose-500/30 rounded-2xl text-rose-600 text-sm font-tech">
                <p className="text-rose-500 text-xs">{errorEnvio}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-4 bg-transparent border-2 border-[#db2777] text-slate-900 hover:bg-[#db2777] hover:text-white font-tech text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[4px_4px_0px_#db2777] hover:shadow-[0px_0px_0px_transparent] active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {cargando ? (
                <>
                  <Spinner />
                  <span>Guardando...</span>
                </>
              ) : (
                "Completar Inscripción"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
