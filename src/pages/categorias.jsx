import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();

  // 🔧 Normalizar nombre (para evitar problemas de tildes, mayúsculas y espacios)
  const normalizeName = (s = "") =>
    s
      .normalize("NFD") // separa letra + tilde
      .replace(/[\u0300-\u036f]/g, "") // quita tildes
      .toLowerCase()
      .trim();

  // ORDEN FIJO usando nombres NORMALIZADOS
  const ordenCategorias = [
    normalizeName("Introducción a la física"),   // verde
    normalizeName("Formulación de proyectos"),   // amarillo
    normalizeName("Mecánica"),                   // naranjo
    normalizeName("Electromagnetismo"),          // rojo
    normalizeName("Física contemporánea"),       // azul
  ];

  // Mapeo de colores usando claves NORMALIZADAS para acentos sutiles tecnológicos
  const colorMap = {
    [normalizeName("Introducción a la física")]: {
      accent: "text-emerald-400",
      bg: "from-emerald-950/20 to-slate-900/60",
      border: "border-emerald-500/20 group-hover:border-emerald-500/60",
      glow: "shadow-emerald-500/5 hover:shadow-emerald-500/10",
      badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    },
    [normalizeName("Formulación de proyectos")]: {
      accent: "text-amber-400",
      bg: "from-amber-950/20 to-slate-900/60",
      border: "border-amber-500/20 group-hover:border-amber-500/60",
      glow: "shadow-amber-500/5 hover:shadow-amber-500/10",
      badge: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    },
    [normalizeName("Mecánica")]: {
      accent: "text-orange-400",
      bg: "from-orange-950/20 to-slate-900/60",
      border: "border-orange-500/20 group-hover:border-orange-500/60",
      glow: "shadow-orange-500/5 hover:shadow-orange-500/10",
      badge: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
    },
    [normalizeName("Electromagnetismo")]: {
      accent: "text-rose-400",
      bg: "from-rose-950/20 to-slate-900/60",
      border: "border-rose-500/20 group-hover:border-rose-500/60",
      glow: "shadow-rose-500/5 hover:shadow-rose-500/10",
      badge: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    },
    [normalizeName("Física contemporánea")]: {
      accent: "text-cyan-400",
      bg: "from-cyan-950/20 to-slate-900/60",
      border: "border-cyan-500/20 group-hover:border-cyan-500/60",
      glow: "shadow-cyan-500/5 hover:shadow-cyan-500/10",
      badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
    },
  };

  const getColors = (nombre) => {
    const key = normalizeName(nombre);
    return (
      colorMap[key] || {
        accent: "text-cyan-400",
        bg: "from-cyan-950/20 to-slate-900/60",
        border: "border-cyan-500/20 group-hover:border-cyan-500/60",
        glow: "shadow-cyan-500/5 hover:shadow-cyan-500/10",
        badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
      }
    );
  };

  useEffect(() => {
    async function fetchCategorias() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre");

      if (error) {
        console.error("Error al obtener las categorías:", error);
        setError("No se pudieron cargar las categorías.");
      } else {
        const ordenadas = [...data].sort((a, b) => {
          const keyA = normalizeName(a.nombre);
          const keyB = normalizeName(b.nombre);

          const idxA = ordenCategorias.indexOf(keyA);
          const idxB = ordenCategorias.indexOf(keyB);

          const posA = idxA === -1 ? 999 : idxA;
          const posB = idxB === -1 ? 999 : idxB;

          return posA - posB;
        });

        setCategorias(ordenadas);
      }

      setLoading(false);
    }

    fetchCategorias();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 py-16 px-4 relative overflow-hidden">
      {/* Glows decorativos */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="mx-auto max-w-6xl relative z-10">
        {/* Título */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
            Explorar Ciencia
          </span>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent tracking-tight">
            Categorías Científicas
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-md mx-auto">
            Selecciona una área científica para explorar y visualizar los proyectos presentados por los alumnos.
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
          <div className="max-w-md mx-auto">
            <div className="bg-rose-950/20 border-2 border-rose-500/30 text-rose-350 p-4 rounded-2xl shadow-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-rose-450"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Grid de categorías */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categorias.map((cat) => {
              const colors = getColors(cat.nombre);
              const isSelected = selected === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelected(cat.id);
                    navigate(`/proyectos/categoria/${cat.id}`);
                  }}
                  className={`group relative cursor-pointer transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.99]`}
                >
                  <div
                    className={`rounded-3xl shadow-xl overflow-hidden border-2 bg-gradient-to-b ${colors.bg} ${colors.border} transition-all duration-300 ${colors.glow}`}
                  >
                    {/* Header colorido */}
                    <div className="h-28 flex items-center justify-center relative overflow-hidden bg-slate-950/40 border-b border-slate-900">
                      {/* Patrón de fondo técnico */}
                      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_14px]"></div>

                      {/* Icono decorativo */}
                      <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                        <svg
                          className={`w-12 h-12 ${colors.accent}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                      </div>

                      {/* Badge de selección o indicador */}
                      <div className="absolute top-4 right-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.badge}`}>
                          Física
                        </span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 bg-slate-900/40 backdrop-blur-md">
                      <h3 className={`text-lg font-extrabold mb-1 text-white group-hover:text-cyan-400 transition-colors tracking-tight`}>
                        {cat.nombre}
                      </h3>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed mb-4">
                        Haz clic para ver y calificar los proyectos inscritos en esta categoría de la feria.
                      </p>
                      
                      {/* Enlace técnico */}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-widest group-hover:gap-2.5 transition-all">
                        <span>Explorar Proyectos</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    </div>
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

export default Categorias;
