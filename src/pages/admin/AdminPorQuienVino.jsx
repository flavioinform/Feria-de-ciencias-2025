// src/pages/admin/AdminPorQuienVino.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function AdminPorQuienVino() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function fetchDatos() {
      setLoading(true);
      setMensaje("");

      // 1) Leer todos los usuarios que marcaron "viene_por_alguien = true"
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, rut, nombre, viene_por_alguien, por_quien_vino")
        .eq("viene_por_alguien", true);

      if (error) {
        console.error(error);
        setMensaje("Error al cargar los datos.");
        setLoading(false);
        return;
      }

      // 2) Agrupar por "por_quien_vino"
      const map = new Map();
      data.forEach((u) => {
        const key = u.por_quien_vino || "Sin especificar";
        const arr = map.get(key) || [];
        arr.push(u);
        map.set(key, arr);
      });

      const lista = Array.from(map.entries()).map(
        ([quien, listaUsuarios]) => ({
          por_quien_vino: quien,
          total: listaUsuarios.length,
          usuarios: listaUsuarios,
        })
      );

      // 3) Ordenar por total descendente
      lista.sort((a, b) => b.total - a.total);

      setDatos(lista);
      setLoading(false);
    }

    fetchDatos();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-black">
        ¿Por quién vinieron?
      </h1>

      {loading && <p>Cargando...</p>}
      {mensaje && <p className="text-red-600">{mensaje}</p>}

      {!loading && !mensaje && datos.length === 0 && (
        <p>No hay registros con “viene_por_alguien = true”.</p>
      )}

      {!loading && datos.length > 0 && (
        <div className="space-y-4">
          {datos.map((item) => (
            <div
              key={item.por_quien_vino}
              className="text-black bg-white rounded-xl shadow border border-slate-200 p-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-lg">
                  {item.por_quien_vino}
                </h2>
                <span className="text-sm">
                  Total visitantes:{" "}
                  <span className="font-bold">{item.total}</span>
                </span>
              </div>

              {/* Si quieres ver el detalle de las personas, descomenta esto */}
              {/* 
              <ul className="text-sm text-slate-700 list-disc pl-5">
                {item.usuarios.map((u) => (
                  <li key={u.id}>
                    {u.nombre} ({u.rut})
                  </li>
                ))}
              </ul>
              */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPorQuienVino;
