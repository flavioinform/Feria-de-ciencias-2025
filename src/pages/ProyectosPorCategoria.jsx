import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppContext } from "../context/AppContext";

function ProyectosPorCategoria() {
  const { idCategoria } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  const [categoria, setCategoria] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [evaluados, setEvaluados] = useState(new Set()); // IDs de proyectos ya evaluados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const { data: catData, error: catError } = await supabase
          .from("categorias")
          .select("id, nombre")
          .eq("id", idCategoria)
          .maybeSingle();

        if (catError) {
          setError("No se pudo cargar la categoría.");
          setLoading(false);
          return;
        }

        setCategoria(catData);

        const { data: proyData, error: proyError } = await supabase
          .from("proyectos")
          .select("id, titulo, descripcion, stand_num, image, participantes")
          .eq("categorias_id", idCategoria)
          .order("stand_num", { ascending: true });

        if (proyError) {
          setError("No se pudieron cargar los proyectos.");
          setLoading(false);
          return;
        }

        setProyectos(proyData || []);

        // Obtener proyectos ya evaluados por este usuario
        if (user?.id && proyData?.length > 0) {
          const proyIds = proyData.map((p) => p.id);
          const { data: evalsData } = await supabase
            .from("evaluaciones")
            .select("proyecto_id")
            .eq("visitante_id", user.id)
            .in("proyecto_id", proyIds);

          if (evalsData) {
            setEvaluados(new Set(evalsData.map((e) => e.proyecto_id)));
          }
        }
      } catch (err) {
        console.error("Error inesperado:", err);
        setError("Error inesperado al cargar los datos.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [idCategoria, user]);

  const normalizeName = (s = "") =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  const colorMap = {
    [normalizeName("Intro física")]: {
      accent: "text-slate-600", border: "border-slate-400 group-hover:border-slate-600",
      glow: "shadow-[6px_6px_0px_#94a3b8] group-hover:shadow-[6px_6px_0px_#475569]",
      badge: "bg-slate-600 text-white", btn: "bg-slate-600 hover:bg-slate-700 text-white shadow-[4px_4px_0px_#94a3b8]",
    },
    [normalizeName("Kinesiología")]: {
      accent: "text-red-600", border: "border-red-400 group-hover:border-red-600",
      glow: "shadow-[6px_6px_0px_#f87171] group-hover:shadow-[6px_6px_0px_#dc2626]",
      badge: "bg-red-600 text-white", btn: "bg-red-600 hover:bg-red-700 text-white shadow-[4px_4px_0px_#f87171]",
    },
    [normalizeName("Mecánica clásica")]: {
      accent: "text-green-600", border: "border-green-400 group-hover:border-green-600",
      glow: "shadow-[6px_6px_0px_#4ade80] group-hover:shadow-[6px_6px_0px_#16a34a]",
      badge: "bg-green-600 text-white", btn: "bg-green-600 hover:bg-green-700 text-white shadow-[4px_4px_0px_#4ade80]",
    },
    [normalizeName("Electromagnetismo")]: {
      accent: "text-blue-600", border: "border-blue-400 group-hover:border-blue-600",
      glow: "shadow-[6px_6px_0px_#60a5fa] group-hover:shadow-[6px_6px_0px_#2563eb]",
      badge: "bg-blue-600 text-white", btn: "bg-blue-600 hover:bg-blue-700 text-white shadow-[4px_4px_0px_#60a5fa]",
    },
    [normalizeName("Física contemporánea")]: {
      accent: "text-violet-600", border: "border-violet-400 group-hover:border-violet-600",
      glow: "shadow-[6px_6px_0px_#a78bfa] group-hover:shadow-[6px_6px_0px_#7c3aed]",
      badge: "bg-violet-600 text-white", btn: "bg-violet-600 hover:bg-violet-700 text-white shadow-[4px_4px_0px_#a78bfa]",
    },
  };

  const getColors = (nombre) => {
    const key = normalizeName(nombre);
    return colorMap[key] || {
      accent: "text-[#db2777]", border: "border-[#db2777]/50 group-hover:border-[#db2777]",
      glow: "shadow-[6px_6px_0px_#fbcfe8] group-hover:shadow-[6px_6px_0px_#db2777]",
      badge: "bg-[#db2777] text-white", btn: "bg-[#db2777] hover:bg-pink-700 text-white shadow-[4px_4px_0px_#fbcfe8]",
    };
  };

  const colors = getColors(categoria?.nombre);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 relative overflow-hidden bg-brutalist-noise font-tech">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 bg-white border-2 border-slate-300 hover:border-slate-900 px-4 py-2.5 shadow-[4px_4px_0px_#cbd5e1] hover:shadow-[4px_4px_0px_#0f172a] active:translate-y-1 active:shadow-none transition-all duration-200"
        >
          ← Volver a Categorías
        </button>

        {/* Título */}
        <div className="mb-10">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-3 ${colors.badge}`}>
            Inscritos
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">
            {categoria ? categoria.nombre : "Proyectos"}
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl font-medium">
            Proyectos pertenecientes a esta categoría. Los proyectos que ya evaluaste aparecen en gris.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-900"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-500 text-rose-700 p-4 font-bold">
            {error}
          </div>
        )}

        {/* Sin proyectos */}
        {!loading && !error && proyectos.length === 0 && (
          <div className="bg-white border-2 border-slate-200 p-12 text-center text-slate-500 shadow-[6px_6px_0px_#e2e8f0]">
            <p className="font-bold uppercase tracking-wider">No hay proyectos registrados para esta categoría.</p>
          </div>
        )}

        {/* Lista de proyectos */}
        {!loading && !error && proyectos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {proyectos.map((proyecto) => {
              const yaEvaluado = evaluados.has(proyecto.id);

              return (
                <div
                  key={proyecto.id}
                  className={`group bg-white flex flex-col justify-between transition-all duration-300 border-2
                    ${yaEvaluado
                      ? "border-slate-200 shadow-[4px_4px_0px_#e2e8f0] grayscale opacity-70 cursor-not-allowed"
                      : `${colors.border} ${colors.glow} cursor-pointer`
                    }`}
                >
                  <div className={yaEvaluado ? "pointer-events-none" : ""}>
                    {/* Imagen */}
                    {proyecto.image ? (
                      <div className="w-full flex items-center justify-center border-b-2 border-slate-200 aspect-video overflow-hidden relative">
                        <img
                          src={proyecto.image}
                          alt={proyecto.titulo}
                          className={`w-full h-full object-cover transition-transform duration-500 ${!yaEvaluado ? "group-hover:scale-105" : ""}`}
                        />
                      </div>
                    ) : (
                      <div className="w-full bg-slate-100 flex flex-col items-center justify-center p-12 border-b-2 border-slate-200 aspect-video text-slate-400 gap-2">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-widest">Sin imagen</span>
                      </div>
                    )}

                    <div className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-3">
                        {proyecto.stand_num && (
                          <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-wider ${yaEvaluado ? "bg-slate-400 text-white" : colors.badge}`}>
                            Stand #{proyecto.stand_num}
                          </span>
                        )}
                        {yaEvaluado && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-600 text-white">
                            ✓ Ya evaluado
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-snug tracking-tight">
                        {proyecto.titulo}
                      </h2>

                      {proyecto.participantes && (
                        <p className="text-xs text-slate-600 mb-3 font-bold">
                          <span className="text-slate-400 uppercase tracking-widest mr-1">Participantes:</span>
                          {proyecto.participantes}
                        </p>
                      )}

                      {proyecto.descripcion && (
                        <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3">
                          {proyecto.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 pt-0 mt-2">
                    {yaEvaluado ? (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-slate-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Evaluación completada</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/evaluar/${proyecto.id}`)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-widest border-2 border-transparent transition-all duration-200 active:translate-y-1 active:shadow-none ${colors.btn}`}
                      >
                        <span>Evaluar proyecto</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProyectosPorCategoria;
