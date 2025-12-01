// src/pages/admin/AdminResultadosJurado.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function AdminResultadosJurado() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function fetchDatos() {
      setLoading(true);
      setMensaje("");

      // Traemos todas las evaluaciones con el proyecto asociado
      const { data, error } = await supabase
        .from("evaluaciones")
        .select("proyecto_id, nota_final, proyectos(titulo)");

      if (error) {
        console.error(error);
        setMensaje("Error al cargar las evaluaciones.");
        setLoading(false);
        return;
      }

      // Agrupamos por proyecto_id en JS
      const mapa = new Map();

      data.forEach((row) => {
        const id = row.proyecto_id;
        const titulo = row.proyectos?.titulo || "Sin título";
        const actual = mapa.get(id) || {
          proyecto_id: id,
          titulo,
          sumaNotas: 0,
          cantidad: 0,
        };
        actual.sumaNotas += row.nota_final || 0;
        actual.cantidad += 1;
        mapa.set(id, actual);
      });

      // Convertimos a array y calculamos promedio
      const lista = Array.from(mapa.values())
        .map((item) => ({
          ...item,
          promedio: item.cantidad > 0 ? item.sumaNotas / item.cantidad : 0,
        }))
        .sort((a, b) => b.promedio - a.promedio); // ordenado de mayor a menor

      setItems(lista);
      setLoading(false);
    }

    fetchDatos();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">
        Resultados – Evaluaciones de jurado
      </h1>

      {loading && <p>Cargando...</p>}
      {mensaje && <p className="text-red-600">{mensaje}</p>}

      {!loading && !mensaje && items.length === 0 && (
        <p>No hay evaluaciones registradas aún.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden text-black">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Proyecto</th>
                <th className="px-4 py-2 text-right">Evaluaciones</th>
                <th className="px-4 py-2 text-right">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.proyecto_id} className="border-t">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{row.titulo}</td>
                  <td className="px-4 py-2 text-right">{row.cantidad}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {row.promedio.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminResultadosJurado;
