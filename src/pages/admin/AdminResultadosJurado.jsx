// src/pages/admin/AdminResultadosJurado.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import BotonDescargarExcel from "../../components/boton";

function AdminResultadosJurado() {
  const [items, setItems] = useState({ jurado: [], publico: [] });
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [vistaActiva, setVistaActiva] = useState("jurado"); // "jurado" o "publico"
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
        .select("proyecto_id, nota_final, proyectos(titulo, categorias_id), usuarios(rut, role)");

      if (error) {
        console.error(error);
        setMensaje("Error al cargar las evaluaciones.");
        setLoading(false);
        return;
      }

      const mapaJurado = new Map();
      const mapaPublico = new Map();

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
      });

      // Convertimos a array y calculamos promedio para Jurado
      const listaJurado = Array.from(mapaJurado.values())
        .map((item) => ({
          ...item,
          promedio: item.cantidad > 0 ? item.sumaNotas / item.cantidad : 0,
        }))
        .sort((a, b) => b.promedio - a.promedio);

      // Convertimos a array y calculamos promedio para Público
      const listaPublico = Array.from(mapaPublico.values())
        .map((item) => ({
          ...item,
          promedio: item.cantidad > 0 ? item.sumaNotas / item.cantidad : 0,
        }))
        .sort((a, b) => b.promedio - a.promedio);

      setItems({ jurado: listaJurado, publico: listaPublico });
      setLoading(false);
    }

    fetchDatos();
  }, []);

  // Filtrar los datos según la categoría seleccionada
  const datosFiltradosJurado = items.jurado.filter(
    (item) => categoriaActiva === "todas" || item.categorias_id === categoriaActiva
  );
  
  const datosFiltradosPublico = items.publico.filter(
    (item) => categoriaActiva === "todas" || item.categorias_id === categoriaActiva
  );

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
          <div className="flex border-b border-slate-200 mb-6 font-tech">
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
          </div>
        </>
      )}
    </div>
  );
}

export default AdminResultadosJurado;
