import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppContext } from "../context/AppContext";

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();
  const { user } = useContext(AppContext);

  // Detectar si es jurado
  const esJurado = user?.rut?.startsWith("JUR") || user?.role === "jurado";

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

  // Mapeo de colores basado en los Banderines del sistema (Light Theme - Colores Fuertes)
  const colorMap = {
    [normalizeName("Intro física")]: {
      accent: "text-amber-500",
      bg: "bg-white",
      border: "border-amber-400 group-hover:border-amber-500",
      glow: "shadow-[6px_6px_0px_#fbbf24] group-hover:shadow-[6px_6px_0px_#d97706]",
      badge: "bg-amber-500 text-white border-amber-600",
      grid: "bg-[linear-gradient(to_right,#fbbf24_1px,transparent_1px),linear-gradient(to_bottom,#fbbf24_1px,transparent_1px)]",
      bgHeader: "bg-amber-50",
      titleHover: "group-hover:text-amber-600",
    },
    [normalizeName("Kinesiología")]: {
      accent: "text-red-600",
      bg: "bg-white",
      border: "border-red-400 group-hover:border-red-600",
      glow: "shadow-[6px_6px_0px_#f87171] group-hover:shadow-[6px_6px_0px_#dc2626]",
      badge: "bg-red-600 text-white border-red-700",
      grid: "bg-[linear-gradient(to_right,#f87171_1px,transparent_1px),linear-gradient(to_bottom,#f87171_1px,transparent_1px)]",
      bgHeader: "bg-red-50",
      titleHover: "group-hover:text-red-700",
    },
    [normalizeName("Mecánica clásica")]: {
      accent: "text-green-600",
      bg: "bg-white",
      border: "border-green-400 group-hover:border-green-600",
      glow: "shadow-[6px_6px_0px_#4ade80] group-hover:shadow-[6px_6px_0px_#16a34a]",
      badge: "bg-green-600 text-white border-green-700",
      grid: "bg-[linear-gradient(to_right,#4ade80_1px,transparent_1px),linear-gradient(to_bottom,#4ade80_1px,transparent_1px)]",
      bgHeader: "bg-green-50",
      titleHover: "group-hover:text-green-700",
    },
    [normalizeName("Electromagnetismo")]: {
      accent: "text-blue-600",
      bg: "bg-white",
      border: "border-blue-400 group-hover:border-blue-600",
      glow: "shadow-[6px_6px_0px_#60a5fa] group-hover:shadow-[6px_6px_0px_#2563eb]",
      badge: "bg-blue-600 text-white border-blue-700",
      grid: "bg-[linear-gradient(to_right,#60a5fa_1px,transparent_1px),linear-gradient(to_bottom,#60a5fa_1px,transparent_1px)]",
      bgHeader: "bg-blue-50",
      titleHover: "group-hover:text-blue-700",
    },
    [normalizeName("Física contemporánea")]: {
      accent: "text-violet-600",
      bg: "bg-white",
      border: "border-violet-400 group-hover:border-violet-600",
      glow: "shadow-[6px_6px_0px_#a78bfa] group-hover:shadow-[6px_6px_0px_#7c3aed]",
      badge: "bg-violet-600 text-white border-violet-700",
      grid: "bg-[linear-gradient(to_right,#a78bfa_1px,transparent_1px),linear-gradient(to_bottom,#a78bfa_1px,transparent_1px)]",
      bgHeader: "bg-violet-50",
      titleHover: "group-hover:text-violet-700",
    },
  };

  const getColors = (nombre) => {
    const key = normalizeName(nombre);
    return (
      colorMap[key] || {
        accent: "text-[#db2777]",
        bg: "bg-white",
        border: "border-[#db2777]/50 group-hover:border-[#db2777]",
        glow: "shadow-[6px_6px_0px_#fbcfe8] group-hover:shadow-[6px_6px_0px_#db2777]",
        badge: "bg-[#db2777] text-white border-[#be185d]",
        grid: "bg-[linear-gradient(to_right,#fbcfe8_1px,transparent_1px),linear-gradient(to_bottom,#fbcfe8_1px,transparent_1px)]",
        bgHeader: "bg-pink-50",
        titleHover: "group-hover:text-[#db2777]",
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
    <div className="min-h-screen bg-slate-50 py-16 px-4 relative overflow-hidden bg-brutalist-noise font-tech">
      <div className="mx-auto max-w-6xl relative z-10">
        {/* Título */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none bg-[#db2777]/10 border-2 border-[#db2777] text-[#db2777] text-xs font-bold uppercase tracking-widest mb-4">
            Explorar Ciencia
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">
            Categorías Científicas
          </h1>
          <p className="text-slate-600 mt-2 text-sm max-w-md mx-auto font-medium">
            Selecciona un área científica para explorar y visualizar los proyectos presentados por los alumnos.
          </p>
        </div>

        {/* Pauta de Evaluación para Jurados */}
        {esJurado && (
          <div className="mb-12 bg-white border-2 border-[#db2777] p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-[#db2777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pauta de Evaluación del Jurado
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border-b-2 border-[#db2777] bg-slate-50 px-4 py-3 text-left font-bold text-slate-900">Criterio</th>
                    <th className="border-b-2 border-[#db2777] bg-slate-50 px-4 py-3 text-left font-bold text-slate-900">Descripción del criterio a evaluar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Claridad en la explicación del proyecto</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-700">Explican de forma clara, ordenada y comprensible en qué consiste el proyecto, su funcionamiento y propósito.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Dominio del tema</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-700">Demuestran conocimiento del proyecto, explican conceptos clave con propiedad y pueden responder dudas básicas del público.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Capacidad comunicativa</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-700">Se expresan con seguridad, cercanía y buen uso del lenguaje. Mantienen la atención del público durante la presentación.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Relevancia e impacto del proyecto</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-700">El proyecto aborda una problemática actual o presenta una aplicación con sentido, impacto o valor en su área.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Originalidad y creatividad</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-700">El proyecto destaca por su enfoque innovador, el uso creativo de materiales o su forma de presentación.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Recursos visuales y materiales</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-700">El stand, maqueta, póster o material visual apoya de forma efectiva la comprensión del proyecto y está bien presentado.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-800">Trabajo en equipo</td>
                    <td className="px-4 py-3 text-slate-700">Se nota una participación equilibrada del grupo, colaboración y organización en la presentación.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">Califica cada criterio del 1 al 7 según tu evaluación.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#db2777]"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto">
            <div className="bg-rose-50 border-2 border-rose-500 text-rose-700 p-4 rounded-none shadow-[4px_4px_0px_rgba(239,68,68,0.2)]">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-rose-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="font-bold">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Grid de categorías */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.map((cat) => {
              const colors = getColors(cat.nombre);

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelected(cat.id);
                    navigate(`/proyectos/categoria/${cat.id}`);
                  }}
                  className={`group relative cursor-pointer transition-all duration-300 transform hover:-translate-y-1`}
                >
                  <div
                    className={`h-full overflow-hidden border-2 bg-white ${colors.border} transition-all duration-300 ${colors.glow} flex flex-col`}
                  >
                    {/* Header colorido */}
                    <div className={`h-28 flex items-center justify-center relative overflow-hidden ${colors.bgHeader} border-b-2 border-slate-200 transition-colors`}>
                      {/* Patrón de fondo técnico (cuadrícula clara) */}
                      <div className={`absolute inset-0 opacity-[0.4] ${colors.grid} bg-[size:14px_14px]`}></div>

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
                            strokeWidth={2}
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                      </div>

                      {/* Badge de selección o indicador */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${colors.badge}`}>
                          Física
                        </span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 bg-white flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className={`text-xl font-black mb-2 text-slate-900 ${colors.titleHover} transition-colors uppercase tracking-tight`}>
                          {cat.nombre}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                          Haz clic para ver y calificar los proyectos inscritos en esta categoría de la feria.
                        </p>
                      </div>
                      
                      {/* Enlace técnico */}
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${colors.accent} uppercase tracking-widest group-hover:gap-2.5 transition-all mt-auto`}>
                        <span>Explorar Proyectos</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
