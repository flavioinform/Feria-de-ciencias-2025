// src/pages/admin/AdminResultadosJurado.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function AdminResultados() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function fetchDatos() {
      setLoading(true);
      setMensaje("");

      // Traemos todas las evaluaciones con el proyecto asociado y el usuario que evaluó
      const { data, error } = await supabase
        .from("evaluaciones")
        .select("proyecto_id, nota_final, proyectos(titulo), usuarios(rut)");

      if (error) {
        console.error(error);
        setMensaje("Error al cargar las evaluaciones.");
        setLoading(false);
        return;
      }

      const mapaJurado = new Map();
      const mapaPublico = new Map();

      data.forEach((row) => {
        // Un jurado es quien tiene RUT que empiece por JUR o tenga rol jurado
        const esJurado = row.usuarios?.rut?.startsWith("JUR") || row.usuarios?.role === "jurado";
        
        const mapaDestino = esJurado ? mapaJurado : mapaPublico;

        const id = row.proyecto_id;
        const titulo = row.proyectos?.titulo || "Sin título";
        const actual = mapaDestino.get(id) || {
          proyecto_id: id,
          titulo,
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Resultados – Evaluaciones de jurado
      </h1>

      {loading && <p>Cargando...</p>}
      {mensaje && <p className="text-red-600">{mensaje}</p>}

      {!loading && !mensaje && (
        <div className="space-y-12">
          {/* TABLA JURADO */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-[#db2777]">Evaluaciones Oficiales del Jurado (Escala 1-7)</h2>
            {(!items.jurado || items.jurado.length === 0) ? (
              <p className="text-slate-500">No hay evaluaciones del jurado registradas aún.</p>
            ) : (
              <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Proyecto</th>
                      <th className="px-4 py-2 text-right">Cant. Evaluaciones</th>
                      <th className="px-4 py-2 text-right">Promedio Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.jurado.map((row, idx) => (
                      <tr key={row.proyecto_id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2 font-semibold text-slate-800">{row.titulo}</td>
                        <td className="px-4 py-2 text-right">{row.cantidad}</td>
                        <td className="px-4 py-2 text-right font-bold text-[#db2777]">
                          {row.promedio.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* TABLA PÚBLICO */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-emerald-600">Votación del Público General (Escala 1-4)</h2>
            {(!items.publico || items.publico.length === 0) ? (
              <p className="text-slate-500">No hay evaluaciones del público registradas aún.</p>
            ) : (
              <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Proyecto</th>
                      <th className="px-4 py-2 text-right">Votos del Público</th>
                      <th className="px-4 py-2 text-right">Promedio Popular</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.publico.map((row, idx) => (
                      <tr key={row.proyecto_id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2 font-semibold text-slate-800">{row.titulo}</td>
                        <td className="px-4 py-2 text-right">{row.cantidad}</td>
                        <td className="px-4 py-2 text-right font-bold text-emerald-600">
                          {row.promedio.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminResultados;
