import { useNavigate } from "react-router-dom";

// Vista de ejemplo: así ve el visitante un proyecto de "Física contemporánea".
// Los datos están fijos aquí a propósito: no se leen ni se guardan en la base de datos.
const proyecto = {
  titulo: "PRISM-UGV",
  descripcion:
    "Robot autónomo por IA con detección de gases. Se desplaza solo, evita obstáculos y mide la concentración de gases en el ambiente para alertar zonas de riesgo.",
  image: "/prism-ugv.png",
};

function EjemploPrismUgv() {
  const navigate = useNavigate();

  const colors = {
    badge: "bg-violet-600 text-white",
    border: "border-violet-400 group-hover:border-violet-600",
    glow: "shadow-[6px_6px_0px_#a78bfa] group-hover:shadow-[6px_6px_0px_#0b6e99]",
    btn: "bg-violet-600 hover:bg-violet-700 text-white shadow-[4px_4px_0px_#a78bfa]",
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 relative overflow-hidden bg-brutalist-noise font-tech">
      <div className="max-w-6xl mx-auto relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 bg-white border-2 border-slate-300 hover:border-slate-900 px-4 py-2.5 shadow-[4px_4px_0px_#cbd5e1] hover:shadow-[4px_4px_0px_#0f172a] active:translate-y-1 active:shadow-none transition-all duration-200"
        >
          ← Volver a Categorías
        </button>

        <div className="mb-10">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-3 ${colors.badge}`}>
            Inscritos
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">
            Física contemporánea
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl font-medium">
            Proyectos pertenecientes a esta categoría. Los proyectos que ya evaluaste aparecen en gris.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className={`group bg-white flex flex-col justify-between transition-all duration-300 border-2 cursor-pointer ${colors.border} ${colors.glow}`}>
            <div>
              <div className="w-full flex items-center justify-center border-b-2 border-slate-200 aspect-video overflow-hidden relative">
                <img
                  src={proyecto.image}
                  alt={proyecto.titulo}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-5 sm:p-6">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-snug tracking-tight">
                  {proyecto.titulo}
                </h2>
                <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3">
                  {proyecto.descripcion}
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 pt-0 mt-2">
              <button
                type="button"
                className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-widest border-2 border-transparent transition-all duration-200 active:translate-y-1 active:shadow-none ${colors.btn}`}
              >
                <span>Evaluar proyecto</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EjemploPrismUgv;
