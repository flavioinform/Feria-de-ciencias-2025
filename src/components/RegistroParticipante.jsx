// =============================================================================
// SQL para crear la tabla `participantes` en Supabase (si no existe aún):
//
// CREATE TABLE IF NOT EXISTS public.participantes (
//   id          uuid NOT NULL DEFAULT gen_random_uuid(),
//   nombre      text NOT NULL,
//   rut         text NOT NULL,
//   proyecto_id uuid NOT NULL,
//   created_at  timestamp with time zone DEFAULT now(),
//   CONSTRAINT participantes_pkey PRIMARY KEY (id),
//   CONSTRAINT participantes_proyecto_id_fkey
//     FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id)
// );
// ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "insert_participantes" ON participantes FOR INSERT WITH CHECK (true);
// CREATE POLICY "select_participantes" ON participantes FOR SELECT USING (true);
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

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

// ── Validaciones ──────────────────────────────────────────────────────────────
function validarNombres(v) {
  if (!v.trim()) return "El nombre es obligatorio.";
  if (v.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
  return "";
}

function validarPrimerApellido(v) {
  if (!v.trim()) return "El primer apellido es obligatorio.";
  if (v.trim().length < 2) return "El primer apellido debe tener al menos 2 caracteres.";
  return "";
}

function validarSegundoApellido(v) {
  if (!v.trim()) return "El segundo apellido es obligatorio.";
  if (v.trim().length < 2) return "El segundo apellido debe tener al menos 2 caracteres.";
  return "";
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

// ── Helpers de estilo ─────────────────────────────────────────────────────────
function cls(error, valid) {
  const base =
    "w-full px-4 py-3.5 rounded-xl border-2 outline-none transition-all duration-300 bg-black/60 text-white placeholder-slate-600 text-sm focus:ring-2 focus:ring-offset-0 font-tech";
  if (error)
    return `${base} border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10`;
  if (valid)
    return `${base} border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/10`;
  return `${base} border-[#f490b1]/15 focus:border-[#f490b1] focus:ring-[#f490b1]/10`;
}

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-[#f490b1]" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const FieldError = ({ msg }) =>
  msg ? <p className="mt-1.5 text-rose-450 text-xs font-semibold tracking-wide">⚠ {msg}</p> : null;

// ── Componente principal ──────────────────────────────────────────────────────
export default function RegistroParticipante() {
  const initialForm = {
    nombres: "",
    primerApellido: "",
    segundoApellido: "",
    rutNumero: "",
    rutDV: "",
    categoriaId: "",
    proyectoId: "",
  };

  const [form, setForm] = useState(initialForm);
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [cargando, setCargando] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cargandoProyectos, setCargandoProyectos] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Cargar categorías al montar
  useEffect(() => {
    supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre")
      .then(({ data, error }) => {
        if (!error && data) setCategorias(data);
      });
  }, []);

  // Cargar proyectos cuando cambia la categoría
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
      .then(({ data, error }) => {
        setCargandoProyectos(false);
        setProyectos(!error && data ? data : []);
      });
  }, [form.categoriaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calcular DV mientras escribe el número
  useEffect(() => {
    const dv = calcularDV(form.rutNumero);
    if (dv) setForm((f) => ({ ...f, rutDV: dv }));
  }, [form.rutNumero]);

  // Validar un campo individual
  const validate = useCallback(
    (campo, valor, extra = {}) => {
      switch (campo) {
        case "nombres":
          return validarNombres(valor);
        case "primerApellido":
          return validarPrimerApellido(valor);
        case "segundoApellido":
          return validarSegundoApellido(valor);
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

  const validateAll = () => {
    const e = {
      nombres: validate("nombres", form.nombres),
      primerApellido: validate("primerApellido", form.primerApellido),
      segundoApellido: validate("segundoApellido", form.segundoApellido),
      rutNumero: validate("rutNumero", form.rutNumero),
      rutDV: validate("rutDV", form.rutDV, { rutNumero: form.rutNumero }),
      categoriaId: validate("categoriaId", form.categoriaId),
      proyectoId: validate("proyectoId", form.proyectoId),
    };
    setErrores(e);
    return Object.values(e).every((v) => !v);
  };

  const handleChange = (campo, valor) => {
    let v = valor;
    if (campo === "rutNumero") v = valor.replace(/\D/g, "");
    if (campo === "rutDV")
      v = valor
        .replace(/[^0-9kK]/g, "")
        .slice(0, 1)
        .toUpperCase();

    setForm((f) => ({ ...f, [campo]: v }));
    if (tocados[campo]) {
      const err = validate(
        campo,
        v,
        campo === "rutDV" ? { rutNumero: form.rutNumero } : {}
      );
      setErrores((e) => ({ ...e, [campo]: err }));
    }
  };

  const handleBlur = (campo) => {
    setTocados((t) => ({ ...t, [campo]: true }));
    const err = validate(
      campo,
      form[campo],
      campo === "rutDV" ? { rutNumero: form.rutNumero } : {}
    );
    setErrores((e) => ({ ...e, [campo]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTocados({
      nombres: true,
      primerApellido: true,
      segundoApellido: true,
      rutNumero: true,
      rutDV: true,
      categoriaId: true,
      proyectoId: true,
    });
    if (!validateAll()) return;

    setCargando(true);
    setResultado(null);

    const rut = formatearRutBD(form.rutNumero, form.rutDV);
    const proyectoSeleccionado = proyectos.find((p) => p.id === form.proyectoId);
    const nombreCompleto = `${form.nombres.trim()} ${form.primerApellido.trim()} ${form.segundoApellido.trim()}`;

    // ── Verificar si el RUT ya está registrado en la base de datos ──
    try {
      const { data: existente, error: errorCheck } = await supabase
        .from("participantes")
        .select("id, nombre, proyecto_id")
        .eq("rut", rut)
        .maybeSingle();

      if (errorCheck) {
        setCargando(false);
        setResultado({
          ok: false,
          errorMsg: "Error al verificar el RUT en la base de datos: " + errorCheck.message,
        });
        return;
      }

      if (existente) {
        let nombreProyecto = "otro proyecto";
        if (existente.proyecto_id) {
          const { data: proy } = await supabase
            .from("proyectos")
            .select("titulo")
            .eq("id", existente.proyecto_id)
            .maybeSingle();
          if (proy) {
            nombreProyecto = `"${proy.titulo}"`;
          }
        }

        setCargando(false);
        setResultado({
          ok: false,
          errorMsg: `El RUT ${rut} ya se encuentra registrado para el participante "${existente.nombre}" en el proyecto ${nombreProyecto}. Cada estudiante puede participar en un solo proyecto.`,
        });
        return;
      }
    } catch (err) {
      setCargando(false);
      setResultado({
        ok: false,
        errorMsg: "Error inesperado al validar el RUT: " + err.message,
      });
      return;
    }
    // ───────────────────────────────────────────────────────────────

    const { data, error } = await supabase
      .from("participantes")
      .insert({ nombre: nombreCompleto, rut, proyecto_id: form.proyectoId })
      .select()
      .single();

    setCargando(false);

    if (error) {
      setResultado({ ok: false, errorMsg: error.message });
    } else {
      setResultado({
        ok: true,
        data: {
          nombre: nombreCompleto,
          rut,
          proyecto: proyectoSeleccionado?.titulo ?? "—",
        },
      });
    }
  };

  const handleNuevoRegistro = () => {
    setForm(initialForm);
    setErrores({});
    setTocados({});
    setResultado(null);
    setProyectos([]);
  };

  const isValid = (campo) =>
    tocados[campo] && !errores[campo] && Boolean(form[campo]);

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (resultado?.ok) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#050505] bg-brutalist-noise">
        <div className="max-w-md w-full bg-[#0d0d0d]/90 backdrop-blur-xl rounded-3xl p-8 text-center border-2 border-[#f490b1]/15 shadow-[8px_8px_0px_rgba(244,144,177,0.06)] relative overflow-hidden">
          
          {/* Subtle top stripe */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#f490b1]"></div>

          <div className="flex justify-center mb-6">
            <img 
              src="https://i.giphy.com/138K59Sf88gGA.gif" 
              alt="Sonic Running" 
              className="w-28 h-28 object-contain select-none filter drop-shadow-[0_0_12px_#f490b1] hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h2 className="text-3xl font-display font-black text-white mb-2 uppercase leading-none">
            ¡Registro Exitoso!
          </h2>
          <p className="text-slate-400 mb-6 text-xs font-tech">
            Los datos han sido validados y guardados correctamente en la base de datos de la Feria.
          </p>
          <div className="bg-black/60 border border-[#f490b1]/10 rounded-2xl p-5 text-left space-y-4 mb-6">
            {[
              { label: "Nombre del Alumno", value: resultado.data.nombre },
              {
                label: "RUT Asociado",
                value: resultado.data.rut,
                mono: true,
              },
              { label: "Proyecto Científico Inscrito", value: resultado.data.proyecto },
            ].map(({ label, value, mono }) => (
              <div key={label} className="border-b border-[#f490b1]/10 last:border-0 pb-3 last:pb-0 font-tech">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  {label}
                </p>
                <p
                  className={`text-slate-200 font-bold ${mono ? "font-mono text-[#f490b1] text-sm" : "text-sm"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={handleNuevoRegistro}
            className="w-full py-4 bg-transparent border-2 border-[#f490b1] text-white hover:bg-[#f490b1] hover:text-[#050505] font-tech text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[4px_4px_0px_#f490b1] hover:shadow-[0px_0px_0px_transparent] active:translate-x-1 active:translate-y-1 cursor-pointer"
          >
            Registrar Otro Participante
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#050505] bg-brutalist-noise border-b border-[#f490b1]/10 relative overflow-hidden">
      {/* Decors */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#f490b1]/5 rounded-full blur-[110px] pointer-events-none" />

      <div className="max-w-lg w-full relative z-10">
        {/* Encabezado */}
        <div className="text-center mb-8">

          <h1 className="text-4xl font-display font-black text-white uppercase tracking-wider">
            Registro de Alumnos
          </h1>
          <p className="text-[#f490b1] font-tech font-bold uppercase tracking-widest mt-1 text-xs">Feria de Ciencias 2026</p>
        </div>

        <div className="bg-[#0d0d0d]/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-[#f490b1]/15 shadow-[8px_8px_0px_rgba(244,144,177,0.06)] relative overflow-hidden">
          
          {/* Subtle top stripe */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#f490b1]"></div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* ── Nombre y Apellidos ── */}
            <div className="space-y-4">
              {/* Nombres */}
              <div>
                <label
                  htmlFor="nombres"
                  className="block text-xs font-bold text-slate-350 font-tech uppercase tracking-widest mb-2"
                >
                  Nombres <span className="text-rose-450" aria-hidden>*</span>
                </label>
                <input
                  id="nombres"
                  type="text"
                  placeholder="Ej: Juan Ignacio"
                  value={form.nombres}
                  onChange={(e) => handleChange("nombres", e.target.value)}
                  onBlur={() => handleBlur("nombres")}
                  className={cls(
                    tocados.nombres && errores.nombres,
                    isValid("nombres")
                  )}
                  autoComplete="given-name"
                />
                <FieldError msg={tocados.nombres && errores.nombres} />
              </div>

              {/* Grid para apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primer Apellido */}
                <div>
                  <label
                    htmlFor="primerApellido"
                    className="block text-xs font-bold text-slate-350 font-tech uppercase tracking-widest mb-2"
                  >
                    1er Apellido <span className="text-rose-450" aria-hidden>*</span>
                  </label>
                  <input
                    id="primerApellido"
                    type="text"
                    placeholder="Ej: Pérez"
                    value={form.primerApellido}
                    onChange={(e) => handleChange("primerApellido", e.target.value)}
                    onBlur={() => handleBlur("primerApellido")}
                    className={cls(
                      tocados.primerApellido && errores.primerApellido,
                      isValid("primerApellido")
                    )}
                    autoComplete="family-name"
                  />
                  <FieldError msg={tocados.primerApellido && errores.primerApellido} />
                </div>

                {/* Segundo Apellido */}
                <div>
                  <label
                    htmlFor="segundoApellido"
                    className="block text-xs font-bold text-slate-350 font-tech uppercase tracking-widest mb-2"
                  >
                    2do Apellido <span className="text-rose-450" aria-hidden>*</span>
                  </label>
                  <input
                    id="segundoApellido"
                    type="text"
                    placeholder="Ej: González"
                    value={form.segundoApellido}
                    onChange={(e) => handleChange("segundoApellido", e.target.value)}
                    onBlur={() => handleBlur("segundoApellido")}
                    className={cls(
                      tocados.segundoApellido && errores.segundoApellido,
                      isValid("segundoApellido")
                    )}
                    autoComplete="additional-name"
                  />
                  <FieldError msg={tocados.segundoApellido && errores.segundoApellido} />
                </div>
              </div>
            </div>

            {/* ── RUT ── */}
            <div>
              <label className="block text-xs font-bold text-slate-355 font-tech uppercase tracking-widest mb-2">
                RUT del Estudiante <span className="text-rose-455" aria-hidden>*</span>
              </label>
              <div className="flex gap-3 items-start">
                {/* Número */}
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
                    className={cls(
                      tocados.rutNumero && errores.rutNumero,
                      isValid("rutNumero")
                    )}
                    aria-label="Número de RUT sin puntos"
                  />
                  <FieldError msg={tocados.rutNumero && errores.rutNumero} />
                </div>

                {/* Separador */}
                <span className="pt-3 text-[#f490b1] font-black text-lg select-none">
                  –
                </span>

                {/* Dígito verificador */}
                <div className="w-24">
                  <input
                    id="rutDV"
                    type="text"
                    placeholder="DV"
                    maxLength={1}
                    value={form.rutDV}
                    onChange={(e) => handleChange("rutDV", e.target.value)}
                    onBlur={() => handleBlur("rutDV")}
                    className={`${cls(
                      tocados.rutDV && errores.rutDV,
                      isValid("rutDV")
                    )} text-center font-mono font-bold uppercase tracking-widest text-[#f490b1]`}
                    aria-label="Dígito verificador (0-9 o K)"
                  />
                  <FieldError msg={tocados.rutDV && errores.rutDV} />
                </div>
              </div>

            </div>

            {/* ── Asignatura ── */}
            <div>
              <label
                htmlFor="categoriaId"
                className="block text-xs font-bold text-slate-355 font-tech uppercase tracking-widest mb-2"
              >
                Filtro por Asignatura <span className="text-rose-455" aria-hidden>*</span>
              </label>
              <select
                id="categoriaId"
                value={form.categoriaId}
                onChange={(e) => handleChange("categoriaId", e.target.value)}
                onBlur={() => handleBlur("categoriaId")}
                className={cls(
                  tocados.categoriaId && errores.categoriaId,
                  isValid("categoriaId")
                )}
              >
                <option value="" className="bg-[#050505] text-slate-400">— Selecciona una asignatura —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#050505] text-white font-tech">
                    {c.nombre}
                  </option>
                ))}
              </select>
              <FieldError msg={tocados.categoriaId && errores.categoriaId} />
            </div>

            {/* ── Proyecto ── */}
            <div>
              <label
                htmlFor="proyectoId"
                className="block text-xs font-bold text-slate-355 font-tech uppercase tracking-widest mb-2 flex items-center"
              >
                Selección de Proyecto <span className="text-rose-455 mr-1" aria-hidden>*</span>
                {cargandoProyectos && (
                  <span className="ml-2.5 inline-flex align-middle text-[#f490b1]">
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
                className={`${cls(
                  tocados.proyectoId && errores.proyectoId,
                  isValid("proyectoId")
                )} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <option value="" className="bg-[#050505] text-slate-400">
                  {!form.categoriaId
                    ? "Selecciona primero una asignatura para cargar proyectos"
                    : proyectos.length === 0 && !cargandoProyectos
                      ? "No hay proyectos vigentes en esta categoría"
                      : "— Selecciona tu proyecto —"}
                </option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#050505] text-white font-tech">
                    {p.titulo}
                  </option>
                ))}
              </select>
              <FieldError msg={tocados.proyectoId && errores.proyectoId} />
            </div>

            {/* ── Error de envío ── */}
            {resultado?.ok === false && (
              <div className="flex gap-3 items-start p-4 bg-rose-950/20 border-2 border-rose-500/30 rounded-2xl text-rose-300 text-sm font-tech">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-bold uppercase tracking-wider text-xs">Error de Registro</p>
                  <p className="text-rose-455 mt-0.5 text-xs">{resultado.errorMsg}</p>
                </div>
              </div>
            )}

            {/* ── Botón de envío ── */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-4 bg-transparent border-2 border-[#f490b1] text-white hover:bg-[#f490b1] hover:text-[#050505] font-tech text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[4px_4px_0px_#f490b1] hover:shadow-[0px_0px_0px_transparent] active:translate-x-1 active:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {cargando ? (
                <>
                  <Spinner />
                  <span>Guardando Registro en BD...</span>
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
