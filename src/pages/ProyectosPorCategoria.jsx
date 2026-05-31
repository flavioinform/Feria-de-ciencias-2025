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
    <div className="min-h-screen bg-slate-950 py-12 px-4 relative overflow-hidden">
      {/* Luces de fondo (Glows) */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-cyan-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300"
        >
          ← Volver a Categorías
        </button>

        {/* Título */}
        <div className="mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
            Inscritos
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent tracking-tight">
            {categoria ? categoria.nombre : "Proyectos"}
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl">
            Proyectos pertenecientes a esta categoría científica presentados en la feria de ciencias.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-950/20 border border-rose-500/30 text-rose-350 p-4 rounded-2xl">
            {error}
          </div>
        )}

        {/* Sin proyectos */}
        {!loading && !error && proyectos.length === 0 && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-12 text-center text-slate-450">
            <svg className="w-12 h-12 text-slate-650 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h0a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            No hay proyectos registrados para esta categoría todavía.
          </div>
        )}

        {/* Lista de proyectos */}
        {!loading && !error && proyectos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {proyectos.map((proyecto) => (
              <div
                key={proyecto.id}
                className="group bg-slate-900/40 backdrop-blur-xl rounded-3xl transition-all duration-300 border border-slate-800 hover:border-cyan-500/40 overflow-hidden shadow-xl shadow-black/40 hover:shadow-cyan-500/5 flex flex-col justify-between"
              >
                <div>
                  {/* Imagen del proyecto */}
                  {proyecto.image ? (
                    <div className="w-full bg-slate-950 flex items-center justify-center p-4 border-b border-slate-900/80 aspect-video overflow-hidden relative">
                      <img
                        src={proyecto.image}
                        alt={proyecto.titulo}
                        className="w-full h-full object-cover rounded-2xl group-hover:scale-102 transition-all duration-500"
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-slate-950/60 flex flex-col items-center justify-center p-12 border-b border-slate-900/80 aspect-video text-slate-600 gap-2">
                      <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-semibold">Sin imagen de prototipo</span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Stand y Cabecera */}
                    <div className="flex items-center gap-2 mb-3.5">
                      {proyecto.stand_num && (
                        <span className="inline-flex px-3 py-1 bg-cyan-500/10 border border-cyan-400/25 text-cyan-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Stand #{proyecto.stand_num}
                        </span>
                      )}
                    </div>

                    {/* Título */}
                    <h2 className="text-xl font-extrabold text-white mb-2.5 leading-snug tracking-tight group-hover:text-cyan-400 transition-colors">
                      {proyecto.titulo}
                    </h2>

                    {/* Participantes */}
                    {proyecto.participantes && (
                      <p className="text-xs text-slate-400 mb-4 font-semibold">
                        <span className="text-slate-500">Participantes:</span>{" "}
                        {proyecto.participantes}
                      </p>
                    )}

                    {/* Descripción */}
                    {proyecto.descripcion && (
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {proyecto.descripcion}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0 mt-4">
                  <button
                    onClick={() => navigate(`/evaluar/${proyecto.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl active:scale-[0.98] transition-all duration-300 shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/25"
                  >
                    <span>Evaluar proyecto</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
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