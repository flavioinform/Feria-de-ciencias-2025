import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAlumno } from "../../context/AlumnoContext";

function AlumnoCoevaluacion() {
  const { alumno } = useAlumno();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState(null);
  const [compañeros, setCompañeros] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [yaEvaluado, setYaEvaluado] = useState(false);
  const [coevaluacionActiva, setCoevaluacionActiva] = useState(true);
  // true si el alumno ya había coevaluado antes y ahora solo le faltan
  // integrantes nuevos que se incorporaron al proyecto
  const [soloNuevos, setSoloNuevos] = useState(false);

  const ESCALA = {
    7: "Excelente",
    5: "Aceptable",
    3: "Insuficiente",
    0: "Nunca",
  };

  const CRITERIOS = [
    { id: "tiempo_actividades", nombre: "Tiempo a actividades" },
    { id: "asistencia", nombre: "Asistencia" },
    { id: "motivacion_equipo", nombre: "Motivación en equipo" },
    { id: "apoyo_informe", nombre: "Apoyo en informe" },
    { id: "presentacion", nombre: "Presentación" },
  ];

  useEffect(() => {
    if (!alumno) {
      navigate("/alumno/login");
      return;
    }
    fetchData();
  }, [alumno, navigate]);

  const fetchData = async () => {
    try {
      const { data: config } = await supabase
        .from("configuracion_feria")
        .select("coevaluaciones_activas")
        .single();

      if (!config?.coevaluaciones_activas) {
        setCoevaluacionActiva(false);
        setCargando(false);
        return;
      }

      const proyectoId = alumno?.proyectos?.id;

      if (!proyectoId) {
        setMensaje("No se encontró el proyecto asociado");
        setTipo("error");
        setCargando(false);
        return;
      }

      setProyecto({
        id: alumno.proyectos.id,
        titulo: alumno.proyectos.titulo,
        categoria_id: alumno.proyectos.categorias_id,
      });

      const { data: compañerosList, error: compError } = await supabase
        .from("participantes")
        .select("id, nombre, rut")
        .eq("proyecto_id", proyectoId);

      const listaCompleta = !compError && compañerosList ? compañerosList : [];

      // Compañeros que este alumno YA coevaluó (por evaluado_id)
      const { data: evalExistentes } = await supabase
        .from("coevaluaciones")
        .select("evaluado_id")
        .eq("proyecto_id", proyectoId)
        .eq("evaluador_id", alumno.id);

      const yaEvaluadosIds = new Set(
        (evalExistentes || []).map((ev) => String(ev.evaluado_id))
      );

      // Solo mostramos los que faltan por coevaluar (pendientes).
      // Si se incorporó un integrante nuevo, aquí aparece únicamente ese.
      const pendientes = listaCompleta.filter(
        (c) => !yaEvaluadosIds.has(String(c.id))
      );

      // Ya coevaluó a todos sus compañeros actuales → pantalla de "ya evaluaste"
      if (listaCompleta.length > 0 && pendientes.length === 0) {
        setYaEvaluado(true);
        setCargando(false);
        return;
      }

      // Si ya había enviado coevaluaciones antes, avisamos que solo debe
      // evaluar a los integrantes nuevos.
      setSoloNuevos(yaEvaluadosIds.size > 0);
      setCompañeros(pendientes);
    } catch (err) {
      console.error(err);
      setMensaje("Error al cargar datos");
      setTipo("error");
    } finally {
      setCargando(false);
    }
  };

  const handleCalificacion = (compañeroId, criterio, valor) => {
    setEvaluaciones((prev) => ({
      ...prev,
      [compañeroId]: {
        ...(prev[compañeroId] || {}),
        [criterio]: valor,
      },
    }));
  };

  const formularioCompleto = compañeros.length > 0 && compañeros.every((comp) => {
    const ev = evaluaciones[comp.id];
    if (!ev) return false;
    return (
      [0, 3, 5, 7].includes(ev.tiempo_actividades) &&
      [0, 3, 5, 7].includes(ev.asistencia) &&
      [0, 3, 5, 7].includes(ev.motivacion_equipo) &&
      [0, 3, 5, 7].includes(ev.apoyo_informe) &&
      [0, 3, 5, 7].includes(ev.presentacion)
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");

    if (compañeros.length === 0) {
      setMensaje("No hay compañeros para evaluar");
      setTipo("error");
      return;
    }

    for (const compañero of compañeros) {
      const ev = evaluaciones[compañero.id];
      if (!ev || ev.tiempo_actividades === null || ev.asistencia === null ||
          ev.motivacion_equipo === null || ev.apoyo_informe === null || ev.presentacion === null ||
          ev.tiempo_actividades === "" || ev.asistencia === "" ||
          ev.motivacion_equipo === "" || ev.apoyo_informe === "" || ev.presentacion === "") {
        setMensaje(`⚠️ Debes calificar TODOS los criterios para ${compañero.nombre}`);
        setTipo("error");
        return;
      }
    }

    setEnviando(true);

    try {
      const evaluacionesArray = Object.entries(evaluaciones).map(
        ([evaluado_id, criterios]) => ({
          proyecto_id: alumno.proyectos.id,
          evaluador_id: alumno.id,
          evaluado_id,
          ...criterios,
        })
      );

      const { error } = await supabase
        .from("coevaluaciones")
        .upsert(evaluacionesArray, {
          onConflict: "proyecto_id,evaluador_id,evaluado_id",
        });

      if (error) throw error;

      setMensaje("¡Coevaluaciones guardadas correctamente!");
      setTipo("ok");

      setTimeout(() => {
        navigate("/alumno/proyecto");
      }, 1500);
    } catch (err) {
      console.error(err);
      setMensaje("Error al guardar las evaluaciones");
      setTipo("error");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#db2777]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
            Coevaluación de Compañeros
          </h1>
          <p className="text-slate-500 text-sm">
            Evalúa a tus compañeros y a ti mismo en los siguientes criterios.
          </p>
        </div>

        {!coevaluacionActiva ? (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 sm:p-8 text-center">
            <svg className="w-14 h-14 text-yellow-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-yellow-700 mb-2">Coevaluación No Disponible</h2>
            <p className="text-yellow-600 mb-5 text-sm sm:text-base">
              La evaluación entre compañeros aún no está activa. El administrador la habilitará cuando sea el momento.
            </p>
            <button
              onClick={() => navigate("/alumno/proyecto")}
              className="px-6 py-2.5 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 transition-colors text-sm"
            >
              Volver al Proyecto
            </button>
          </div>
        ) : yaEvaluado ? (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 sm:p-8 text-center">
            <svg className="w-14 h-14 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-green-700 mb-2">¡Ya evaluaste! ✓</h2>
            <p className="text-green-600 mb-5 text-sm sm:text-base">
              Tus evaluaciones de compañeros han sido registradas correctamente.
            </p>
            <button
              onClick={() => navigate("/alumno/proyecto")}
              className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Volver al Proyecto
            </button>
          </div>
        ) : (
          <>
            {soloNuevos && (
              <div className="mb-5 p-4 rounded-lg border-2 border-[#db2777]/30 bg-[#db2777]/5 text-sm text-slate-700 flex items-start gap-3">
                <svg className="w-5 h-5 text-[#db2777] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                  Ya coevaluaste a tus compañeros anteriores. Se incorporó
                  {compañeros.length > 1 ? "n nuevos integrantes" : " un nuevo integrante"} al
                  proyecto: solo debes coevaluar a quien aparece a continuación.
                </p>
              </div>
            )}

            {mensaje && (
              <div className={`mb-5 p-4 rounded-lg border text-sm ${
                tipo === "error"
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-green-50 border-green-300 text-green-700"
              }`}>
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── MOBILE: tarjetas por persona ── */}
              <div className="md:hidden space-y-4">
                {compañeros.map((comp) => {
                  const evalComp = evaluaciones[comp.id] || {};
                  const valores = CRITERIOS.map((c) => evalComp[c.id]);
                  const valoresValidos = valores.filter((v) => [0,3,5,7].includes(v));
                  const promedio = valoresValidos.length === CRITERIOS.length
                    ? (valoresValidos.reduce((a, b) => a + b, 0) / CRITERIOS.length).toFixed(2)
                    : "-";

                  return (
                    <div key={comp.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{comp.nombre}</p>
                          {comp.id === alumno.id && (
                            <span className="text-[10px] bg-[#db2777]/10 text-[#db2777] px-2 py-0.5 rounded font-bold">TÚ</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Promedio</p>
                          <p className="text-xl font-black text-[#db2777]">{promedio}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {CRITERIOS.map((crit) => (
                          <div key={`${comp.id}-${crit.id}`} className="flex items-center justify-between gap-2">
                            <label className="text-xs text-slate-600 flex-1">{crit.nombre}</label>
                            <select
                              value={evalComp[crit.id] ?? ""}
                              onChange={(e) =>
                                handleCalificacion(comp.id, crit.id, e.target.value !== "" ? parseInt(e.target.value) : null)
                              }
                              className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-medium focus:ring-2 focus:ring-[#db2777] focus:border-transparent outline-none bg-white min-w-[120px]"
                            >
                              <option value="">— Seleccionar —</option>
                              <option value="7">7 - Excelente</option>
                              <option value="5">5 - Aceptable</option>
                              <option value="3">3 - Insuficiente</option>
                              <option value="0">0 - Nunca</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP: tabla ── */}
              <div className="hidden md:block overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Participante</th>
                      {CRITERIOS.map((crit) => (
                        <th key={crit.id} className="px-3 py-3 text-center font-bold text-slate-900 text-xs">
                          {crit.nombre}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-bold text-slate-900">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compañeros.map((comp) => {
                      const evalComp = evaluaciones[comp.id] || {};
                      const valores = CRITERIOS.map((c) => evalComp[c.id]);
                      const valoresValidos = valores.filter((v) => [0,3,5,7].includes(v));
                      const promedio = valoresValidos.length === CRITERIOS.length
                        ? (valoresValidos.reduce((a, b) => a + b, 0) / CRITERIOS.length).toFixed(2)
                        : "-";

                      return (
                        <tr key={comp.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {comp.nombre}
                            {comp.id === alumno.id && (
                              <span className="ml-2 text-[10px] bg-[#db2777]/10 text-[#db2777] px-2 py-0.5 rounded font-bold">TÚ</span>
                            )}
                          </td>
                          {CRITERIOS.map((crit) => (
                            <td key={`${comp.id}-${crit.id}`} className="px-3 py-3 text-center">
                              <select
                                value={evalComp[crit.id] ?? ""}
                                onChange={(e) =>
                                  handleCalificacion(comp.id, crit.id, e.target.value !== "" ? parseInt(e.target.value) : null)
                                }
                                className="px-2 py-1 border border-slate-300 rounded-md text-xs font-medium focus:ring-2 focus:ring-[#db2777] focus:border-transparent outline-none"
                              >
                                <option value="">-</option>
                                <option value="7">7 - Excelente</option>
                                <option value="5">5 - Aceptable</option>
                                <option value="3">3 - Insuficiente</option>
                                <option value="0">0 - Nunca</option>
                              </select>
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-bold text-[#db2777]">
                            {promedio}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/alumno/proyecto")}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-slate-300 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !formularioCompleto}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#db2777] to-rose-500 text-white font-bold rounded-lg hover:from-rose-600 hover:to-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title={!formularioCompleto ? "⚠️ Completa todas las evaluaciones" : ""}
                >
                  {enviando ? "Guardando..." : formularioCompleto ? "Guardar Evaluaciones" : "Guardar (Incompleto)"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default AlumnoCoevaluacion;
