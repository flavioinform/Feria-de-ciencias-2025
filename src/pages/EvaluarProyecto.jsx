import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppContext } from "../context/AppContext";

function EvaluarProyecto() {
  const { proyectoId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  const [proyecto, setProyecto] = useState(null);
  const [criterios, setCriterios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // valores elegidos por criterio: { criterioId: puntaje }
  const [valores, setValores] = useState({});
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState(""); // "success" | "error"

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 1) Traer datos del proyecto
        const { data: proy, error: proyError } = await supabase
          .from("proyectos")
          .select("id, titulo, participantes, stand_num")
          .eq("id", proyectoId)
          .maybeSingle();

        if (proyError || !proy) {
          console.error(proyError);
          setError("No se pudo cargar el proyecto.");
          setLoading(false);
          return;
        }

        setProyecto(proy);

        // 2) Traer la rúbrica "Presentación"
        const { data: rubrica, error: rubError } = await supabase
          .from("rubricas")
          .select("id, nombre")
          .eq("nombre", "Presentación")
          .maybeSingle();

        if (rubError || !rubrica) {
          console.error(rubError);
          setError("No se pudo cargar la rúbrica de evaluación.");
          setLoading(false);
          return;
        }

        // 3) Traer criterios de esa rúbrica
        const { data: crits, error: critError } = await supabase
          .from("criterios")
          .select("id, nombre, peso, orden")
          .eq("rubrica_id", rubrica.id)
          .order("orden", { ascending: true });

        if (critError) {
          console.error(critError);
          setError("No se pudieron cargar los criterios.");
        } else {
          setCriterios(crits);
        }
      } catch (err) {
        console.error("Error inesperado:", err);
        setError("Ocurrió un error inesperado.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [proyectoId]);

  const handleChangePuntaje = (criterioId, puntaje) => {
    setValores((prev) => ({
      ...prev,
      [criterioId]: puntaje,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipoMensaje("");
    setEnviando(true);

    // Validar que estén todos los criterios respondidos
    const faltan = criterios.some((c) => !valores[c.id]);
    if (faltan) {
      setMensaje("Debes evaluar todos los criterios.");
      setTipoMensaje("error");
      setEnviando(false);
      return;
    }

    // Validar que haya un usuario logueado
    if (!user || !user.id) {
      setMensaje("Debes iniciar sesión para evaluar.");
      setTipoMensaje("error");
      setEnviando(false);
      return;
    }

    try {
      const visitanteId = user.id;

      // 0) Revisar si ya existe evaluación para este proyecto y este usuario
      const { data: evalExistente, error: evalExistError } = await supabase
        .from("evaluaciones")
        .select("id")
        .eq("proyecto_id", proyectoId)
        .eq("visitante_id", visitanteId)
        .maybeSingle();

      if (evalExistError) {
        console.error("Error al buscar evaluación previa:", evalExistError);
        setMensaje("Ocurrió un error al verificar tu evaluación previa.");
        setTipoMensaje("error");
        return;
      }

      // Si ya había evaluación, mostramos mensaje y redirigimos igual
      if (evalExistente) {
        setMensaje("Ya habías evaluado este proyecto.");
        setTipoMensaje("error");

        setTimeout(() => {
          navigate(-1);
        }, 1200);

        return;
      }

      // 1) Calcular nota final (promedio ponderado)
      const sumPesos = criterios.reduce((acc, c) => acc + c.peso, 0);
      const sumPonderado = criterios.reduce(
        (acc, c) => acc + (valores[c.id] || 0) * c.peso,
        0
      );
      const notaFinal = sumPesos > 0 ? sumPonderado / sumPesos : null;

      // 2) Insertar en tabla evaluaciones
      const { data: evalInsert, error: evalError } = await supabase
        .from("evaluaciones")
        .insert({
          proyecto_id: proyectoId,
          visitante_id: visitanteId,
          nota_final: notaFinal,
          observacion_general: observacion || null,
        })
        .select("id")
        .single();

      if (evalError) {
        console.error("Error al insertar evaluación:", evalError);
        setMensaje(`Error al guardar la evaluación: ${evalError.message}`);
        setTipoMensaje("error");
        return;
      }

      const evaluacionId = evalInsert.id;

      // 3) Insertar detalle por criterio
      const detalles = criterios.map((c) => ({
        evaluacion_id: evaluacionId,
        criterio_id: c.id,
        puntaje: valores[c.id],
        comentario: null,
      }));

      const { error: detError } = await supabase
        .from("evaluacion_detalle")
        .insert(detalles);

      if (detError) {
        console.error("Error al insertar detalle:", detError);
        setMensaje(`Error al guardar el detalle: ${detError.message}`);
        setTipoMensaje("error");
        return;
      }

      // Si todo salió bien
      setMensaje("¡Evaluación registrada correctamente!");
      setTipoMensaje("success");

      // Limpiar formulario
      setValores({});
      setObservacion("");

      // Redirigir después de 1 segundo
      setTimeout(() => {
        navigate(-1);
      }, 1000);
    } catch (err) {
      console.error("Error inesperado:", err);
      setMensaje(`Error inesperado: ${err.message}`);
      setTipoMensaje("error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 relative overflow-hidden">
      {/* Luces de fondo (Glows) */}
      <div className="absolute top-10 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Volver */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300"
        >
          ← Volver a Proyectos
        </button>

        {/* Header del Proyecto */}
        {proyecto && (
          <div className="mb-8 bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-850 shadow-xl shadow-black/30 relative overflow-hidden">
            {/* Decoración lateral */}
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-cyan-500 to-blue-600" />
            
            <div className="flex items-center gap-2 mb-2.5">
              {proyecto.stand_num && (
                <span className="inline-flex px-3 py-1 bg-cyan-500/10 border border-cyan-400/25 text-cyan-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Stand #{proyecto.stand_num}
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                PROYECTO EVALUADO
              </span>
            </div>
            
            <h1 className="text-2xl font-extrabold text-white mb-2 leading-snug tracking-tight">
              {proyecto.titulo}
            </h1>
            {proyecto.participantes && (
              <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                <span className="text-slate-500">Participantes: </span>
                {proyecto.participantes}
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-rose-950/20 border border-rose-500/30 text-rose-350 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-450" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Formulario */}
        {!loading && !error && criterios.length > 0 && (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-800 space-y-8 shadow-2xl shadow-black/50"
          >
            <div>
              <h2 className="text-xl font-extrabold text-white mb-1.5 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Presentación del Proyecto
              </h2>
              <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                Califica cada criterio del <span className="text-cyan-400">1 al 4</span> basándote en la rúbrica formal, donde 4 representa un desempeño excelente y 1 un desempeño insuficiente.
              </p>
            </div>

            <div className="space-y-6">
              {criterios.map((c, index) => (
                <div
                  key={c.id}
                  className="border border-slate-800/80 rounded-2xl p-5 bg-slate-950/40 hover:bg-slate-950/70 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-slate-900 rounded-lg text-slate-500 font-bold text-xs">
                      {index + 1}
                    </span>
                    <p className="font-extrabold text-slate-200 text-sm pt-0.5 tracking-tight">{c.nombre}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {[
                      { label: "Deficiente", value: 1, color: "hover:border-rose-500/40 hover:bg-rose-500/5 active:bg-rose-500/10", activeColor: "bg-rose-500/10 border-rose-500/80 text-rose-400 font-bold" },
                      { label: "Regular", value: 2, color: "hover:border-amber-500/40 hover:bg-amber-500/5 active:bg-amber-500/10", activeColor: "bg-amber-500/10 border-amber-500/80 text-amber-400 font-bold" },
                      { label: "Bueno", value: 3, color: "hover:border-teal-500/40 hover:bg-teal-500/5 active:bg-teal-500/10", activeColor: "bg-teal-500/10 border-teal-500/80 text-teal-400 font-bold" },
                      { label: "Muy bueno", value: 4, color: "hover:border-cyan-500/40 hover:bg-cyan-500/5 active:bg-cyan-500/10", activeColor: "bg-cyan-500/10 border-cyan-500/80 text-cyan-400 font-bold" },
                    ].map((opt) => {
                      const isSelected = valores[c.id] === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`flex items-center justify-center gap-1.5 cursor-pointer rounded-xl border px-3 py-3 transition-all duration-300 select-none text-center
                            ${isSelected
                              ? opt.activeColor
                              : `bg-slate-950/60 border-slate-850 text-slate-400 ${opt.color}`}`}
                        >
                          <input
                            type="radio"
                            name={`criterio-${c.id}`}
                            value={opt.value}
                            checked={isSelected}
                            onChange={() => handleChangePuntaje(c.id, opt.value)}
                            className="hidden"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Observaciones generales */}
            <div>
              <label htmlFor="observacion-general" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>Comentarios u Observaciones Generales (Opcional)</span>
              </label>
              <textarea
                id="observacion-general"
                rows={3}
                placeholder="Escribe sugerencias de mejora, aspectos destacados o notas complementarias sobre la presentación del proyecto..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-800 rounded-2xl bg-slate-950/80 text-white placeholder-slate-650 text-xs resize-none focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 outline-none transition duration-300"
              />
            </div>

            {/* Mensaje */}
            {mensaje && (
              <div
                className={`p-4 rounded-2xl border text-sm font-semibold ${
                  tipoMensaje === "error"
                    ? "bg-rose-950/20 border-rose-500/30 text-rose-350"
                    : "bg-emerald-950/20 border-emerald-500/30 text-emerald-350"
                }`}
              >
                <div className="flex items-center gap-2">
                  {tipoMensaje === "error" ? (
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

            {/* Botón */}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all duration-300 shadow-md shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
            >
              {enviando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando evaluación...
                </span>
              ) : (
                "Registrar evaluación"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default EvaluarProyecto;