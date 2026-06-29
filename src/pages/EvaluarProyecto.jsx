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
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState(""); // "success" | "error"

  // Criterios fijos del jurado (no dependen de la BD)
  const CRITERIOS_JURADO = [
    { id: "j1", nombre: "Claridad en la explicación del proyecto", peso: 1.0, orden: 1 },
    { id: "j2", nombre: "Dominio del tema", peso: 1.0, orden: 2 },
    { id: "j3", nombre: "Capacidad comunicativa", peso: 1.0, orden: 3 },
    { id: "j4", nombre: "Relevancia e impacto del proyecto", peso: 1.0, orden: 4 },
    { id: "j5", nombre: "Originalidad y creatividad", peso: 1.0, orden: 5 },
    { id: "j6", nombre: "Recursos visuales y materiales", peso: 1.0, orden: 6 },
    { id: "j7", nombre: "Trabajo en equipo", peso: 1.0, orden: 7 },
  ];

  useEffect(() => {
    // No ejecutar hasta que el usuario esté disponible en el contexto
    if (user === null) return;

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

        // Determinar si el usuario es jurado
        const esJurado = user?.rut?.startsWith("JUR");

        if (esJurado) {
          // Para el jurado usamos criterios fijos (no dependen de la BD)
          setCriterios(CRITERIOS_JURADO);
        } else {
          // Para visitantes: cargar rúbrica desde la BD
          const { data: rubrica, error: rubError } = await supabase
            .from("rubricas")
            .select("id, nombre")
            .ilike("nombre", "Presentaci%")
            .maybeSingle();

          if (rubError || !rubrica) {
            console.error("Rúbrica no encontrada:", rubError);
            setError("No se pudo cargar la rúbrica de evaluación.");
            setLoading(false);
            return;
          }

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
        }
      } catch (err) {
        console.error("Error inesperado:", err);
        setError("Ocurrió un error inesperado.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [proyectoId, user]);

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
          observacion_general: null,
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

      // 3) Insertar detalle por criterio (solo si los criterios vienen de la BD, no hardcodeados del jurado)
      const esJurado = user?.rut?.startsWith("JUR");
      if (!esJurado) {
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
      } // fin if (!esJurado)

      // Si todo salió bien
      setMensaje("¡Evaluación registrada correctamente!");
      setTipoMensaje("success");

      setValores({});

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
    <div className="min-h-screen bg-white py-12 px-4 relative overflow-hidden">
      {/* Luces de fondo (Glows) */}
      <div className="absolute top-10 left-1/3 w-80 h-80 bg-rose-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-400/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Volver */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-[#db2777] bg-white hover:bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300"
        >
          ← Volver a Proyectos
        </button>

        {/* Header del Proyecto */}
        {proyecto && (
          <div className="mb-8 bg-white rounded-3xl p-6 border border-rose-200 shadow-xl shadow-rose-500/10 relative overflow-hidden">
            {/* Decoración lateral */}
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-[#db2777] to-rose-400" />

            <div className="flex items-center gap-2 mb-2.5">
              {proyecto.stand_num && (
                <span className="inline-flex px-3 py-1 bg-rose-50 border border-rose-300 text-[#db2777] rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Stand #{proyecto.stand_num}
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                PROYECTO EVALUADO
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 mb-2 leading-snug tracking-tight">
              {proyecto.titulo}
            </h1>
            {proyecto.participantes && (
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                <span className="text-slate-400">Participantes: </span>
                {proyecto.participantes}
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#db2777]"></div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-300 text-rose-600 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
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
            className="bg-white rounded-3xl p-8 border border-rose-200 space-y-8 shadow-2xl shadow-rose-500/10"
          >
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1.5 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#db2777] animate-pulse"></span>
                {user?.rut?.startsWith("JUR") || user?.role === "jurado" ? "Evaluación Oficial del Jurado" : "Presentación del Proyecto"}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Califica cada criterio del <span className="text-[#db2777]">1 al {user?.rut?.startsWith("JUR") || user?.role === "jurado" ? "7" : "4"}</span>.
              </p>
            </div>

            <div className="space-y-6">
              {criterios.map((c, index) => (
                <div
                  key={c.id}
                  className="border border-rose-200 rounded-2xl p-5 bg-white hover:bg-rose-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-rose-50 border border-rose-200 rounded-lg text-[#db2777] font-bold text-xs">
                      {index + 1}
                    </span>
                    <p className="font-extrabold text-slate-800 text-sm pt-0.5 tracking-tight">{c.nombre}</p>
                  </div>

                  <div className="flex justify-between items-center gap-1 sm:gap-2 mt-2">
                    {Array.from({ length: user?.rut?.startsWith("JUR") || user?.role === "jurado" ? 7 : 4 }, (_, i) => i + 1).map((val) => {
                      const isSelected = valores[c.id] === val;
                      return (
                        <label
                          key={val}
                          className={`flex-1 flex items-center justify-center cursor-pointer rounded-lg border py-3 transition-all duration-300 select-none text-center font-bold text-sm sm:text-base
                            ${isSelected
                              ? "bg-[#db2777]/10 border-[#db2777] text-[#db2777] scale-105 shadow-md shadow-rose-500/20"
                              : "bg-white border-rose-200 text-slate-500 hover:border-[#db2777]/50 hover:bg-rose-50"}`}
                        >
                          <input
                            type="radio"
                            name={`criterio-${c.id}`}
                            value={val}
                            checked={isSelected}
                            onChange={() => handleChangePuntaje(c.id, val)}
                            className="hidden"
                          />
                          <span>{val}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Mensaje */}
            {mensaje && (
              <div
                className={`p-4 rounded-2xl border text-sm font-semibold ${
                  tipoMensaje === "error"
                    ? "bg-rose-50 border-rose-300 text-rose-600"
                    : "bg-emerald-50 border-emerald-300 text-emerald-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {tipoMensaje === "error" ? (
                    <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
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
              className="w-full bg-gradient-to-r from-white to-[#db2777] hover:from-rose-50 hover:to-rose-500 text-slate-900 font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all duration-300 shadow-md shadow-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
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