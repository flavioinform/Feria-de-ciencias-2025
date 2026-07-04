import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

function AdminCoevaluaciones() {
  const [categorias, setCategorias] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [coevaluaciones, setCoevaluaciones] = useState([]);
  const [usuarios, setUsuarios] = useState({});
  const [participantes, setParticipantes] = useState([]);

  const [filtros, setFiltros] = useState({ categoria: "", proyecto: "" });
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [rehabilitandoId, setRehabilitandoId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: cats } = await supabase.from("categorias").select("id, nombre");
      setCategorias(cats || []);

      const { data: parts } = await supabase.from("participantes").select("id, nombre, rut, proyecto_id");
      const partMap = {};
      parts?.forEach((p) => { partMap[p.id] = p; });
      setUsuarios(partMap);
      setParticipantes(parts || []);

      const { data: coeval, error: coevalError } = await supabase
        .from("coevaluaciones")
        .select("*, proyectos(id, titulo, categorias_id)");

      if (coevalError) console.error("Error cargando coevaluaciones:", coevalError);
      setCoevaluaciones(coeval || []);

      const { data: proy } = await supabase.from("proyectos").select("id, titulo, categorias_id");
      setProyectos(proy || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  // Los ids de la BD llegan como número y el value del <select> es string,
  // por eso comparamos siempre con String() para evitar falsos negativos.
  const proyectosFilterados = filtros.categoria
    ? proyectos.filter((p) => String(p.categorias_id) === String(filtros.categoria))
    : proyectos;

  const coevaluacionesFilteradas = coevaluaciones.filter((c) => {
    if (filtros.categoria && String(c.proyectos?.categorias_id) !== String(filtros.categoria)) return false;
    if (filtros.proyecto && String(c.proyecto_id) !== String(filtros.proyecto)) return false;
    return true;
  });

  // ── Rehabilitar coevaluación de un participante (solo con proyecto elegido) ──
  const participantesDelProyecto = filtros.proyecto
    ? participantes.filter((p) => String(p.proyecto_id) === String(filtros.proyecto))
    : [];

  // Cuántos compañeros coevaluó cada participante en el proyecto seleccionado
  const contarEvaluados = (evaluadorId) =>
    coevaluaciones.filter(
      (c) =>
        String(c.proyecto_id) === String(filtros.proyecto) &&
        String(c.evaluador_id) === String(evaluadorId)
    ).length;

  const rehabilitar = async (persona) => {
    const totalCompaneros = participantesDelProyecto.length;
    const ok = window.confirm(
      `¿Rehabilitar la coevaluación de ${persona.nombre}?\n\n` +
      `Se borrarán sus coevaluaciones de este proyecto y podrá volver a ` +
      `evaluar a sus ${totalCompaneros} compañeros la próxima vez que ingrese.`
    );
    if (!ok) return;

    setRehabilitandoId(persona.id);
    try {
      const { error } = await supabase
        .from("coevaluaciones")
        .delete()
        .eq("proyecto_id", filtros.proyecto)
        .eq("evaluador_id", persona.id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al rehabilitar la coevaluación");
    } finally {
      setRehabilitandoId(null);
    }
  };

  const exportToCSV = () => {
    setExportando(true);
    try {
      const datos = coevaluacionesFilteradas.map((c) => ({
        "Categoría": categorias.find((cat) => cat.id === proyectos.find((p) => p.id === c.proyecto_id)?.categorias_id)?.nombre || "-",
        "Proyecto": proyectos.find((p) => p.id === c.proyecto_id)?.titulo || "-",
        "Evaluador": usuarios[c.evaluador_id]?.nombre || "-",
        "Evaluado": usuarios[c.evaluado_id]?.nombre || "-",
        "Tiempo": c.tiempo_actividades,
        "Asistencia": c.asistencia,
        "Motivación": c.motivacion_equipo,
        "Informe": c.apoyo_informe,
        "Presentación": c.presentacion,
        "Promedio": c.promedio?.toFixed(2),
      }));

      const headers = Object.keys(datos[0]);
      const csv = [
        headers.join(","),
        ...datos.map((row) =>
          headers.map((h) => {
            const val = row[h];
            return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute("download", `coevaluaciones_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Error al exportar");
    } finally {
      setExportando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Coevaluaciones de Estudiantes</h1>
        <p className="text-gray-500 text-sm">Ver, filtrar y exportar evaluaciones entre compañeros.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select
              value={filtros.categoria}
              onChange={(e) => setFiltros((prev) => ({ ...prev, categoria: e.target.value, proyecto: "" }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Proyecto</label>
            <select
              value={filtros.proyecto}
              onChange={(e) => setFiltros((prev) => ({ ...prev, proyecto: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              <option value="">Todos los proyectos</option>
              {proyectosFilterados.map((proy) => (
                <option key={proy.id} value={proy.id}>{proy.titulo}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rehabilitar coevaluación por participante (requiere proyecto elegido) */}
      {filtros.proyecto && (
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
            Rehabilitar coevaluación
          </h2>
          <p className="text-gray-500 text-xs mb-3">
            Borra las coevaluaciones de un participante en este proyecto para que pueda volver a evaluar a sus compañeros.
          </p>

          {participantesDelProyecto.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">Este proyecto no tiene participantes registrados.</p>
          ) : (
            <div className="space-y-2">
              {participantesDelProyecto.map((persona) => {
                const evaluados = contarEvaluados(persona.id);
                const total = participantesDelProyecto.length;
                const completo = evaluados >= total;
                return (
                  <div
                    key={persona.id}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{persona.nombre}</p>
                      <p className="text-xs text-gray-500">
                        Coevaluó {evaluados} de {total}
                        {completo && evaluados > 0 && (
                          <span className="ml-2 text-green-600 font-semibold">✓ Completo</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => rehabilitar(persona)}
                      disabled={evaluados === 0 || rehabilitandoId === persona.id}
                      className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border border-pink-300 text-pink-600 hover:bg-pink-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={evaluados === 0 ? "Este participante aún no ha coevaluado" : "Borrar sus coevaluaciones y rehabilitar"}
                    >
                      {rehabilitandoId === persona.id ? "Rehabilitando..." : "Rehabilitar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Botón Exportar + contador */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{coevaluacionesFilteradas.length}</span> evaluaciones encontradas
        </p>
        <button
          onClick={exportToCSV}
          disabled={coevaluacionesFilteradas.length === 0 || exportando}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exportando ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      {/* ── MOBILE: tarjetas ── */}
      <div className="md:hidden space-y-3">
        {coevaluacionesFilteradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500 text-sm">
            No hay coevaluaciones registradas con estos filtros
          </div>
        ) : (
          coevaluacionesFilteradas.map((c) => {
            const categoria = categorias.find(
              (cat) => cat.id === proyectos.find((p) => p.id === c.proyecto_id)?.categorias_id
            );
            const proyecto = proyectos.find((p) => p.id === c.proyecto_id);

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{categoria?.nombre || "-"}</p>
                    <p className="font-bold text-gray-800 text-sm">{proyecto?.titulo || "-"}</p>
                  </div>
                  <span className="text-xl font-black text-pink-600">{c.promedio?.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                  <div><span className="font-semibold text-gray-700">Evaluador:</span> {usuarios[c.evaluador_id]?.nombre || "-"}</div>
                  <div><span className="font-semibold text-gray-700">Evaluado:</span> {usuarios[c.evaluado_id]?.nombre || "-"}</div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[
                    { label: "Tiempo", val: c.tiempo_actividades },
                    { label: "Asistencia", val: c.asistencia },
                    { label: "Motivación", val: c.motivacion_equipo },
                    { label: "Informe", val: c.apoyo_informe },
                    { label: "Presentación", val: c.presentacion },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[9px] text-gray-400 font-medium uppercase">{item.label}</p>
                      <p className="font-bold text-gray-800 text-sm">{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── DESKTOP: tabla ── */}
      <div className="hidden md:block bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left font-bold text-gray-900">Categoría</th>
                <th className="px-4 py-3 text-left font-bold text-gray-900">Proyecto</th>
                <th className="px-4 py-3 text-left font-bold text-gray-900">Evaluador</th>
                <th className="px-4 py-3 text-left font-bold text-gray-900">Evaluado</th>
                <th className="px-3 py-3 text-center font-bold text-gray-900 text-xs">Tiempo</th>
                <th className="px-3 py-3 text-center font-bold text-gray-900 text-xs">Asistencia</th>
                <th className="px-3 py-3 text-center font-bold text-gray-900 text-xs">Motivación</th>
                <th className="px-3 py-3 text-center font-bold text-gray-900 text-xs">Informe</th>
                <th className="px-3 py-3 text-center font-bold text-gray-900 text-xs">Presentación</th>
                <th className="px-4 py-3 text-center font-bold text-gray-900">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {coevaluacionesFilteradas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                    No hay coevaluaciones registradas con estos filtros
                  </td>
                </tr>
              ) : (
                coevaluacionesFilteradas.map((c) => {
                  const categoria = categorias.find(
                    (cat) => cat.id === proyectos.find((p) => p.id === c.proyecto_id)?.categorias_id
                  );
                  const proyecto = proyectos.find((p) => p.id === c.proyecto_id);

                  return (
                    <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 text-xs">{categoria?.nombre || "-"}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium text-xs">{proyecto?.titulo || "-"}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{usuarios[c.evaluador_id]?.nombre || "-"}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{usuarios[c.evaluado_id]?.nombre || "-"}</td>
                      <td className="px-3 py-3 text-center font-semibold">{c.tiempo_actividades}</td>
                      <td className="px-3 py-3 text-center font-semibold">{c.asistencia}</td>
                      <td className="px-3 py-3 text-center font-semibold">{c.motivacion_equipo}</td>
                      <td className="px-3 py-3 text-center font-semibold">{c.apoyo_informe}</td>
                      <td className="px-3 py-3 text-center font-semibold">{c.presentacion}</td>
                      <td className="px-4 py-3 text-center font-bold text-pink-600">{c.promedio?.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminCoevaluaciones;
