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

  // ---------- DESCARGAR EXCEL (CSV) ----------
  const handleDownloadExcel = () => {
    if (!datos || !datos.length) return;

    const headers = ["Por quién vino", "Total visitantes"];

    const rows = datos.map((item) => [
      item.por_quien_vino,
      item.total,
    ]);

    const csvContent = [headers, ...rows]
      .map((cols) =>
        cols
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "por_quien_vino.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-black">
          ¿Por quién vinieron?
        </h1>

        <button
          onClick={handleDownloadExcel}
          disabled={loading || !datos.length}
          className="px-4 py-2 rounded-lg text-sm font-semibold 
                     bg-green-600 text-white hover:bg-green-700
                     disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-sm"
        >
          Descargar Excel
        </button>
      </div>

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
