// src/components/BotonDescargarExcel.jsx
import React from "react";

function boton({ items }) {
  const handleDownloadExcel = () => {
    if (!items || !items.length) return;

    const headers = ["Posición", "Proyecto", "Evaluaciones", "Promedio"];

    const rows = items.map((row, idx) => [
      idx + 1,
      row.titulo ? row.titulo.replace(/"/g, '""') : "",
      row.cantidad,
      row.promedio.toFixed(2),
    ]);

    const csvContent =
      [headers, ...rows]
        .map((cols) => cols.map((v) => `"${v}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "resultados_jurado.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
  <button
  type="button"
  onClick={handleDownloadExcel}
  disabled={!items || items.length === 0}
  className="px-4 py-2 rounded-lg text-sm font-semibold 
             bg-[#0b6e99] text-white hover:bg-[#095a7e]
             disabled:opacity-20 disabled:cursor-not-allowed
             transition-colors"
>
  Descargar en Excel
</button>

  );
}

export default boton;
