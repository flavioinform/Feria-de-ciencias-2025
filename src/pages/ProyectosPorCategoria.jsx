import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ProyectosPorCategoria() {
  const { idCategoria } = useParams();
  const navigate = useNavigate();

  const [categoria, setCategoria] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 1) Obtener nombre de la categoría
        const { data: catData, error: catError } = await supabase
          .from("categorias")
          .select("id, nombre")
          .eq("id", idCategoria)
          .maybeSingle();

        if (catError) {
          console.error(catError);
          setError("No se pudo cargar la categoría.");
          setLoading(false);
          return;
        }

        setCategoria(catData);

        // 2) Obtener proyectos de esa categoría
        const { data: proyData, error: proyError } = await supabase
          .from("proyectos")
          .select("id, titulo, descripcion, stand_num, image, participantes")
          .eq("categorias_id", idCategoria)
          .order("stand_num", { ascending: true });

        if (proyError) {
          console.error(proyError);
          setError("No se pudieron cargar los proyectos.");
        } else {
          setProyectos(proyData);
        }
      } catch (err) {
        console.error("Error inesperado:", err);
        setError("Error inesperado al cargar los datos.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [idCategoria]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition-colors"
        >
          <span className="inline-block rounded-full bg-white shadow px-3 py-1.5 hover:bg-slate-50">
            ← Volver
          </span>
        </button>

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
            {categoria ? categoria.nombre : "Proyectos"}
          </h1>
          <p className="text-slate-600">
            Proyectos pertenecientes a esta categoría de la feria de ciencias.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Sin proyectos */}
        {!loading && !error && proyectos.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-600">
            No hay proyectos registrados para esta categoría todavía.
          </div>
        )}

        {/* Lista de proyectos */}
        {!loading && !error && proyectos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"    >
            {proyectos.map((proyecto) => (
              <div
                key={proyecto.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden"
               
              >
                {/* Imagen - Ahora se ve completa */}
                {proyecto.image && (
                  <div className="w-full bg-slate-100 flex items-center justify-center p-4">
                    <img
                      src={proyecto.image}
                      alt={proyecto.titulo}
                      className="w-full h-auto max-h-80 object-contain rounded-lg"
                    />
                  </div>
                )}

                <div className="p-5"  >
                    
                  {/* Stand */}
                  {proyecto.stand_num && (
                    <span className="inline-block text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full mb-3">
                      Stand #{proyecto.stand_num}
                    </span>
                  )}

                  {/* Título */}
                  <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {proyecto.titulo}
                  </h2>

                  {/* Participantes */}
                  {proyecto.participantes && (
                    <p className="text-xs text-slate-500 mb-2">
                      <span className="font-semibold">Participantes:</span>{" "}
                      {proyecto.participantes}
                    </p>
                  )}

                  {/* Descripción */}
                  {proyecto.descripcion && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                      {proyecto.descripcion}
                    </p>
                  )}

                  {/* Botón */}
                  <div className="flex justify-end mt-4">
                    <button
                      className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                    
                    >
                      Evaluar proyecto →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProyectosPorCategoria;