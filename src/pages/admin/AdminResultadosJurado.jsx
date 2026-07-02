// src/pages/admin/AdminResultadosJurado.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import BotonDescargarExcel from "../../components/boton";

// Nombres de los criterios del jurado usados para los rankings especiales.
// Deben coincidir con los definidos en EvaluarProyecto.jsx (CRITERIOS_JURADO).
const CRITERIO_ORAL = "Capacidad comunicativa";
const CRITERIO_VISUAL = "Recursos visuales y materiales";

function AdminResultadosJurado() {
  const [items, setItems] = useState({ jurado: [], publico: [], oral: [], visual: [] });
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [vistaActiva, setVistaActiva] = useState("jurado"); // "jurado" | "publico" | "oral" | "visual"
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function fetchDatos() {
      setLoading(true);
      setMensaje("");

      // Traemos las categorías para el filtro
      const { data: catData, error: catError } = await supabase
        .from("categorias")
        .select("id, nombre")
        .order("nombre");
        
      if (!catError && catData) {
        setCategorias(catData);
      }

      // Traemos todas las evaluaciones con el proyecto asociado, categoría y usuario
      const { data, error } = await supabase
        .from("evaluaciones")
        .select("proyecto_id, nota_final, detalle_criterios, proyectos(titulo, categorias_id), usuarios(rut, role)");

      if (error) {
        console.error(error);
        setMensaje("Error al cargar las evaluaciones.");
        setLoading(false);
        return;
      }

      const mapaJurado = new Map();
      const mapaPublico = new Map();
      // Rankings especiales del jurado (por criterio)
      const mapaOral = new Map();
      const mapaVisual = new Map();

      // Acumula un puntaje por proyecto en el mapa indicado (ignora nulos)
      const acumularCriterio = (mapa, id, titulo, categorias_id, puntaje) => {
        if (puntaje == null || isNaN(puntaje)) return;
        const actual = mapa.get(id) || {
          proyecto_id: id,
          titulo,
          categorias_id,
          sumaNotas: 0,
          cantidad: 0,
        };
        actual.sumaNotas += Number(puntaje);
        actual.cantidad += 1;
        mapa.set(id, actual);
      };

      data.forEach((row) => {
        const esJurado = row.usuarios?.rut?.startsWith("JUR") || row.usuarios?.role === "jurado";
        const mapaDestino = esJurado ? mapaJurado : mapaPublico;

        const id = row.proyecto_id;
        const titulo = row.proyectos?.titulo || "Sin título";
        const categorias_id = row.proyectos?.categorias_id || null;

        const actual = mapaDestino.get(id) || {
          proyecto_id: id,
          titulo,
          categorias_id,
          sumaNotas: 0,
          cantidad: 0,
        };
        actual.sumaNotas += row.nota_final || 0;
        actual.cantidad += 1;
        mapaDestino.set(id, actual);

        // Rankings de presentación oral/visual: solo desde el jurado
        if (esJurado && row.detalle_criterios) {
          acumularCriterio(mapaOral, id, titulo, categorias_id, row.detalle_criterios[CRITERIO_ORAL]);
          acumularCriterio(mapaVisual, id, titulo, categorias_id, row.detalle_criterios[CRITERIO_VISUAL]);
        }
      });

      // Convierte un mapa acumulado en lista ordenada por promedio (desc)
      const aLista = (mapa) =>
        Array.from(mapa.values())
          .map((item) => ({
            ...item,
            promedio: item.cantidad > 0 ? item.sumaNotas / item.cantidad : 0,
          }))
          .sort((a, b) => b.promedio - a.promedio);

      setItems({
        jurado: aLista(mapaJurado),
        publico: aLista(mapaPublico),
        oral: aLista(mapaOral),
        visual: aLista(mapaVisual),
      });
      setLoading(false);
    }

    fetchDatos();
  }, []);

  // Filtrar los datos según la categoría seleccionada
  const filtrarPorCategoria = (lista) =>
    lista.filter(
      (item) => categoriaActiva === "todas" || item.categorias_id === categoriaActiva
    );

  const datosFiltradosJurado = filtrarPorCategoria(items.jurado);
  const datosFiltradosPublico = filtrarPorCategoria(items.publico);
  const datosFiltradosOral = filtrarPorCategoria(items.oral);
  const datosFiltradosVisual = filtrarPorCategoria(items.visual);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-black uppercase tracking-wider">
          Resultados de Evaluaciones
        </h1>
        
        {/* Filtro por Categoría */}
        <select
          value={categoriaActiva}
          onChange={(e) => setCategoriaActiva(e.target.value)}
          className="bg-white border-2 border-slate-200 text-black px-4 py-2 rounded-lg font-tech focus:ring-2 focus:ring-[#db2777] outline-none"
        >
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Cargando...</p>}
      {mensaje && <p className="text-red-600">{mensaje}</p>}

      {!loading && !mensaje && (
        <>
          {/* PESTAÑAS (TABS) */}
          <div className="flex flex-wrap border-b border-slate-200 mb-6 font-tech">
            <button
              onClick={() => setVistaActiva("jurado")}
              className={`px-6 py-3 text-sm font-bold uppercase transition-colors ${
                vistaActiva === "jurado"
                  ? "border-b-4 border-[#db2777] text-[#db2777]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Jurado Oficial (Escala 1-7)
            </button>
            <button
              onClick={() => setVistaActiva("publico")}
              className={`px-6 py-3 text-sm font-bold uppercase transition-colors ${
                vistaActiva === "publico"
                  ? "border-b-4 border-emerald-500 text-emerald-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Voto Público (Escala 1-4)
            </button>
            <button
              onClick={() => setVistaActiva("oral")}
              className={`px-6 py-3 text-sm font-bold uppercase transition-colors ${
                vistaActiva === "oral"
                  ? "border-b-4 border-amber-500 text-amber-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Mejor Presentación Oral
            </button>
            <button
              onClick={() => setVistaActiva("visual")}
              className={`px-6 py-3 text-sm font-bold uppercase transition-colors ${
                vistaActiva === "visual"
                  ? "border-b-4 border-indigo-500 text-indigo-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Mejor Presentación Visual
            </button>
          </div>

          <div className="space-y-6">
            {/* CONTENIDO JURADO */}
            {vistaActiva === "jurado" && (
              <section className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-[#db2777]">
                    Resultados del Jurado {categoriaActiva !== "todas" && "- Filtrado"}
                  </h2>
                  <BotonDescargarExcel items={datosFiltradosJurado} className="bg-[#db2777] hover:bg-pink-700 text-white" />
                </div>
                {(!datosFiltradosJurado || datosFiltradosJurado.length === 0) ? (
                  <p className="text-slate-500 bg-white p-6 rounded-xl border border-slate-200 text-center">
                    No hay evaluaciones del jurado para esta categoría.
                  </p>
                ) : (
                  <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden text-black">
                    <table className="w-full text-sm">
                      <thead className="bg-[#db2777]/10">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-[#db2777]">#</th>
                          <th className="px-4 py-3 text-left font-bold text-[#db2777]">Proyecto</th>
                          <th className="px-4 py-3 text-right font-bold text-[#db2777]">Cant. Evaluaciones</th>
                          <th className="px-4 py-3 text-right font-bold text-[#db2777]">Promedio Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosFiltradosJurado.map((row, idx) => (
                          <tr key={row.proyecto_id} className="border-t hover:bg-pink-50 transition-colors">
                            <td className="px-4 py-3">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{row.titulo}</td>
                            <td className="px-4 py-3 text-right">{row.cantidad}</td>
                            <td className="px-4 py-3 text-right font-black text-[#db2777] text-lg">
                              {row.promedio.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* CONTENIDO PÚBLICO */}
            {vistaActiva === "publico" && (
              <section className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-emerald-600">
                    Resultados del Público {categoriaActiva !== "todas" && "- Filtrado"}
                  </h2>
                  <BotonDescargarExcel items={datosFiltradosPublico} className="bg-emerald-600 hover:bg-emerald-700 text-white" />
                </div>
                {(!datosFiltradosPublico || datosFiltradosPublico.length === 0) ? (
                  <p className="text-slate-500 bg-white p-6 rounded-xl border border-slate-200 text-center">
                    No hay evaluaciones del público para esta categoría.
                  </p>
                ) : (
                  <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden text-black">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-emerald-700">#</th>
                          <th className="px-4 py-3 text-left font-bold text-emerald-700">Proyecto</th>
                          <th className="px-4 py-3 text-right font-bold text-emerald-700">Votos</th>
                          <th className="px-4 py-3 text-right font-bold text-emerald-700">Promedio Popular</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosFiltradosPublico.map((row, idx) => (
                          <tr key={row.proyecto_id} className="border-t hover:bg-emerald-50 transition-colors">
                            <td className="px-4 py-3">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{row.titulo}</td>
                            <td className="px-4 py-3 text-right">{row.cantidad}</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600 text-lg">
                              {row.promedio.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* MEJOR PRESENTACIÓN ORAL (JURADO) */}
            {vistaActiva === "oral" && (
              <section className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-amber-600">
                    Mejor Presentación Oral {categoriaActiva !== "todas" && "- Filtrado"}
                  </h2>
                  <BotonDescargarExcel items={datosFiltradosOral} className="bg-amber-500 hover:bg-amber-600 text-white" />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Ranking según el criterio <strong>«{CRITERIO_ORAL}»</strong> del jurado (escala 1-7).
                </p>
                {(!datosFiltradosOral || datosFiltradosOral.length === 0) ? (
                  <p className="text-slate-500 bg-white p-6 rounded-xl border border-slate-200 text-center">
                    No hay evaluaciones del jurado con este criterio para esta categoría.
                  </p>
                ) : (
                  <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden text-black">
                    <table className="w-full text-sm">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-amber-700">#</th>
                          <th className="px-4 py-3 text-left font-bold text-amber-700">Proyecto</th>
                          <th className="px-4 py-3 text-right font-bold text-amber-700">Cant. Evaluaciones</th>
                          <th className="px-4 py-3 text-right font-bold text-amber-700">Promedio Oral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosFiltradosOral.map((row, idx) => (
                          <tr key={row.proyecto_id} className="border-t hover:bg-amber-50 transition-colors">
                            <td className="px-4 py-3">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{row.titulo}</td>
                            <td className="px-4 py-3 text-right">{row.cantidad}</td>
                            <td className="px-4 py-3 text-right font-black text-amber-600 text-lg">
                              {row.promedio.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* MEJOR PRESENTACIÓN VISUAL (JURADO) */}
            {vistaActiva === "visual" && (
              <section className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-indigo-600">
                    Mejor Presentación Visual {categoriaActiva !== "todas" && "- Filtrado"}
                  </h2>
                  <BotonDescargarExcel items={datosFiltradosVisual} className="bg-indigo-500 hover:bg-indigo-600 text-white" />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Ranking según el criterio <strong>«{CRITERIO_VISUAL}»</strong> del jurado (escala 1-7).
                </p>
                {(!datosFiltradosVisual || datosFiltradosVisual.length === 0) ? (
                  <p className="text-slate-500 bg-white p-6 rounded-xl border border-slate-200 text-center">
                    No hay evaluaciones del jurado con este criterio para esta categoría.
                  </p>
                ) : (
                  <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden text-black">
                    <table className="w-full text-sm">
                      <thead className="bg-indigo-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-indigo-700">#</th>
                          <th className="px-4 py-3 text-left font-bold text-indigo-700">Proyecto</th>
                          <th className="px-4 py-3 text-right font-bold text-indigo-700">Cant. Evaluaciones</th>
                          <th className="px-4 py-3 text-right font-bold text-indigo-700">Promedio Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosFiltradosVisual.map((row, idx) => (
                          <tr key={row.proyecto_id} className="border-t hover:bg-indigo-50 transition-colors">
                            <td className="px-4 py-3">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{row.titulo}</td>
                            <td className="px-4 py-3 text-right">{row.cantidad}</td>
                            <td className="px-4 py-3 text-right font-black text-indigo-600 text-lg">
                              {row.promedio.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminResultadosJurado;
