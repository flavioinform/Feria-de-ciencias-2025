import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function AdminProyectosPorCategoria() {
  const { idCategoria } = useParams();
  const navigate = useNavigate();

  const [categoria, setCategoria] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);

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
          console.error(catError);
          setError("No se pudo cargar la categoría.");
          setLoading(false);
          return;
        }

        setCategoria(catData);

        const { data: proyData, error: proyError } = await supabase
          .from("proyectos")
          .select("id, titulo, descripcion, stand_num, image, participantes, estudiantes:participantes(nombre, rut)")
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
    <div>
      <button
        onClick={() => navigate("/admin/categorias-proyectos")}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        ← Volver a Categorías
      </button>

      <h1 className="text-3xl font-bold text-slate-800 mb-2">
        {categoria ? `Proyectos de ${categoria.nombre}` : "Proyectos"}
      </h1>
      <p className="text-slate-600 mb-8">
        Lista de proyectos inscritos en esta categoría.
      </p>

      {loading && <p className="text-slate-500">Cargando proyectos...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && proyectos.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500">
          No hay proyectos registrados para esta categoría todavía.
        </div>
      )}

      {!loading && !error && proyectos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proyectos.map((proyecto) => (
            <div
              key={proyecto.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
            >
              {proyecto.image ? (
                <div className="w-full h-48 bg-slate-100">
                  <img
                    src={proyecto.image}
                    alt={proyecto.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 border-b border-slate-200">
                  Sin imagen
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-slate-800 leading-tight">
                    {proyecto.titulo}
                  </h2>
                  {proyecto.stand_num && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2">
                      Stand {proyecto.stand_num}
                    </span>
                  )}
                </div>

                {proyecto.participantes && (
                  <p className="text-sm text-slate-600 mb-3">
                    <span className="font-semibold text-slate-700">Participantes:</span>{" "}
                    {proyecto.participantes}
                  </p>
                )}

                {proyecto.descripcion && (
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
                    {proyecto.descripcion}
                  </p>
                )}

                <button
                  onClick={() => setProyectoSeleccionado(proyecto)}
                  className="mt-auto w-full py-2.5 bg-slate-50 hover:bg-emerald-50 text-emerald-600 text-sm font-semibold rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors"
                >
                  Ver detalle completo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalles del proyecto */}
      {proyectoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0" 
            onClick={() => setProyectoSeleccionado(null)}
          ></div>
          
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col z-10 animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setProyectoSeleccionado(null)}
              className="absolute top-4 right-4 bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-20"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            {proyectoSeleccionado.image ? (
              <div className="w-full bg-slate-100 h-64 sm:h-96 flex-shrink-0 relative">
                <img
                  src={proyectoSeleccionado.image}
                  alt={proyectoSeleccionado.titulo}
                  className="w-full h-full object-contain bg-slate-900"
                />
              </div>
            ) : (
              <div className="w-full bg-slate-100 h-32 flex items-center justify-center text-slate-400">
                Sin imagen del prototipo
              </div>
            )}
            
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
                  {proyectoSeleccionado.titulo}
                </h2>
                {proyectoSeleccionado.stand_num && (
                  <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1.5 rounded-full whitespace-nowrap border border-emerald-200 shadow-sm">
                    Stand {proyectoSeleccionado.stand_num}
                  </span>
                )}
              </div>
              
              {(proyectoSeleccionado.participantes || (proyectoSeleccionado.estudiantes && proyectoSeleccionado.estudiantes.length > 0)) && (
                <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    Integrantes del equipo
                  </h3>
                  {proyectoSeleccionado.estudiantes && proyectoSeleccionado.estudiantes.length > 0 ? (
                    <div className="space-y-1 mt-3">
                      {proyectoSeleccionado.estudiantes.map((est, i) => (
                        <div key={i} className="flex items-center gap-2 text-slate-700">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                          <span className="font-medium capitalize">{est.nombre.toLowerCase()}</span>
                          {est.rut && <span className="text-slate-400 text-xs ml-1 font-mono">({est.rut})</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-700 font-medium mt-1">{proyectoSeleccionado.participantes}</p>
                  )}
                </div>
              )}
              
              {proyectoSeleccionado.descripcion && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                    Descripción del Proyecto
                  </h3>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {proyectoSeleccionado.descripcion}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProyectosPorCategoria;
