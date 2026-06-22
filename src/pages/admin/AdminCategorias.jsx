import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(false);

  const navigate = useNavigate();

  const normalizeName = (s = "") =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // Mapeo de colores según la tabla de Banderines (Kinesiología, Introducción a la Física, etc.)
  const colorMap = {
    [normalizeName("Kinesiología")]: {
      colorName: "Rojo",
      bgClass: "bg-red-500",
      textClass: "text-red-500",
      borderClass: "border-red-500",
    },
    [normalizeName("Introducción a la Física")]: {
      colorName: "Amarillo",
      bgClass: "bg-yellow-400",
      textClass: "text-yellow-400",
      borderClass: "border-yellow-400",
    },
    [normalizeName("Formulación de proyectos")]: { // Alias in case DB has this name
      colorName: "Amarillo",
      bgClass: "bg-yellow-400",
      textClass: "text-yellow-400",
      borderClass: "border-yellow-400",
    },
    [normalizeName("Mecánica Clásica")]: {
      colorName: "Verde",
      bgClass: "bg-green-500",
      textClass: "text-green-500",
      borderClass: "border-green-500",
    },
    [normalizeName("Mecánica")]: { // Alias
      colorName: "Verde",
      bgClass: "bg-green-500",
      textClass: "text-green-500",
      borderClass: "border-green-500",
    },
    [normalizeName("Electromagnetismo")]: {
      colorName: "Azul",
      bgClass: "bg-blue-500",
      textClass: "text-blue-500",
      borderClass: "border-blue-500",
    },
    [normalizeName("Física Contemporánea")]: {
      colorName: "Violeta",
      bgClass: "bg-purple-500",
      textClass: "text-purple-500",
      borderClass: "border-purple-500",
    },
    [normalizeName("Invitados Especiales")]: {
      colorName: "Blanco",
      bgClass: "bg-white",
      textClass: "text-gray-100", // To ensure it's visible against white if needed
      borderClass: "border-white",
    },
  };

  const getColors = (nombre) => {
    const key = normalizeName(nombre);
    return (
      colorMap[key] || {
        colorName: "Gris (No asignado)",
        bgClass: "bg-gray-400",
        textClass: "text-gray-400",
        borderClass: "border-gray-400",
      }
    );
  };

  useEffect(() => {
    async function fetchCategorias() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from("categorias").select("id, nombre");

      if (error) {
        console.error("Error al obtener las categorías:", error);
        setError("No se pudieron cargar las categorías.");
      } else {
        setCategorias(data);
      }

      setLoading(false);
    }

    fetchCategorias();
  }, []);

  const handleExportar = async () => {
    setExportando(true);
    try {
      const { data, error } = await supabase
        .from("participantes")
        .select(`
          nombre, 
          rut, 
          proyectos (
            titulo, 
            stand_num, 
            categorias (
              nombre
            )
          )
        `);

      if (error) throw error;

      const workbook = new ExcelJS.Workbook();

      // Agrupar los datos por categoría
      const agrupadosPorCategoria = {};

      data.forEach((est) => {
        // En supabase, proyectos es un array si es 1:N o un objeto si es N:1
        const proy = Array.isArray(est.proyectos) ? est.proyectos[0] : est.proyectos;
        const catNombre = proy?.categorias?.nombre || "Sin categoría";
        
        if (!agrupadosPorCategoria[catNombre]) {
          agrupadosPorCategoria[catNombre] = [];
        }

        agrupadosPorCategoria[catNombre].push({
          nombre: est.nombre,
          rut: est.rut,
          proyecto: proy?.titulo || "Sin proyecto",
          stand: proy?.stand_num || 0, // 0 si no tiene para ordenarlo al final
          categoria: catNombre,
        });
      });

      // Crear una hoja por cada categoría
      Object.keys(agrupadosPorCategoria).sort().forEach((catNombre) => {
        // Excel restringe nombres de hojas a 31 caracteres y sin caracteres especiales
        let nombreHoja = catNombre.substring(0, 31).replace(/[\[\]\/\*\?\:]/g, "");
        const sheet = workbook.addWorksheet(nombreHoja);

        sheet.columns = [
          { header: "Stand", key: "stand", width: 10 },
          { header: "Proyecto", key: "proyecto", width: 45 },
          { header: "Estudiante", key: "nombre", width: 35 },
          { header: "RUT", key: "rut", width: 15 },
          { header: "Categoría", key: "categoria", width: 30 },
        ];

        // Estilo a la cabecera
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF333333" },
        };

        const colorInfo = getColors(catNombre);
        let rowColor = "FFFFFFFF"; // Blanco por defecto
        
        // Tonos más suaves para que el texto negro sea legible en Excel
        switch(colorInfo.colorName) {
            case "Rojo": rowColor = "FFFCA5A5"; break; // red-300
            case "Amarillo": rowColor = "FFFDE047"; break; // yellow-300
            case "Verde": rowColor = "FF86EFAC"; break; // green-300
            case "Azul": rowColor = "FF93C5FD"; break; // blue-300
            case "Violeta": rowColor = "FFD8B4FE"; break; // purple-300
        }

        // Ordenar: Primero por stand, luego por proyecto, luego por nombre
        const estudiantesOrdenados = agrupadosPorCategoria[catNombre].sort((a, b) => {
          if (a.stand !== b.stand) return a.stand - b.stand;
          if (a.proyecto !== b.proyecto) return a.proyecto.localeCompare(b.proyecto);
          return a.nombre.localeCompare(b.nombre);
        });

        estudiantesOrdenados.forEach((est) => {
          const row = sheet.addRow({
            stand: est.stand === 0 ? "-" : est.stand,
            proyecto: est.proyecto,
            nombre: est.nombre,
            rut: est.rut,
            categoria: est.categoria,
          });

          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: rowColor },
            };
            cell.border = {
              top: { style: "thin", color: { argb: "FFDDDDDD" } },
              left: { style: "thin", color: { argb: "FFDDDDDD" } },
              bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
              right: { style: "thin", color: { argb: "FFDDDDDD" } },
            };
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "Reporte_Feria_Ciencias.xlsx");
    } catch (err) {
      console.error("Error al exportar:", err);
      alert("Hubo un error al generar el Excel. Revisa la consola.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Categorías y Proyectos</h1>
        
        <button
          onClick={handleExportar}
          disabled={exportando || loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportando ? (
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          )}
          {exportando ? "Generando Excel..." : "Exportar Reporte"}
        </button>
      </div>
      <p className="text-slate-600 mb-8">
        Selecciona una categoría para ver los proyectos inscritos. El color del banderín está indicado para cada categoría.
      </p>

      {loading && <p className="text-slate-500">Cargando categorías...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((cat) => {
            const style = getColors(cat.nombre);
            return (
              <div
                key={cat.id}
                onClick={() => navigate(`/admin/proyectos/categoria/${cat.id}`)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden flex flex-col items-center text-center"
              >
                <div className={`absolute top-0 left-0 w-full h-2 ${style.bgClass}`}></div>
                <h2 className="text-xl font-bold text-slate-800 mt-2 mb-2">{cat.nombre}</h2>
                <div className="flex items-center gap-2 mt-auto pt-4">
                  <span className={`w-4 h-4 rounded-full ${style.bgClass} border border-slate-300`}></span>
                  <span className="text-sm font-medium text-slate-600">
                    Banderín: {style.colorName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminCategorias;
