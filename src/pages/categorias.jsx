import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();

  // Mapeo de colores por categoría (nombres EXACTOS de la BD)
  const colorMap = {
    "Introducción a la física": {
      bg: "bg-green-500",
      hover: "hover:bg-green-600",
      border: "border-green-600",
      selected: "bg-green-700",
      text: "text-green-900",
      lightBg: "bg-green-50",
    },
    Electromagnetismo: {
      bg: "bg-red-500",
      hover: "hover:bg-red-600",
      border: "border-red-600",
      selected: "bg-red-700",
      text: "text-red-900",
      lightBg: "bg-red-50",
    },
    "Física contemporánea": {
      bg: "bg-blue-500",
      hover: "hover:bg-blue-600",
      border: "border-blue-600",
      selected: "bg-blue-700",
      text: "text-blue-900",
      lightBg: "bg-blue-50",
    },
    "Formulación de proyectos": {
      bg: "bg-yellow-500",
      hover: "hover:bg-yellow-600",
      border: "border-yellow-600",
      selected: "bg-yellow-700",
      text: "text-yellow-900",
      lightBg: "bg-yellow-50",
    },
    Mecánica: {
      bg: "bg-orange-500",
      hover: "hover:bg-orange-600",
      border: "border-orange-600",
      selected: "bg-orange-700",
      text: "text-orange-900",
      lightBg: "bg-orange-50",
    },
  };

  // Colores por defecto si no está en el mapa
  const getColors = (nombre) => {
    return (
      colorMap[nombre] || {
        bg: "bg-red-500",
        hover: "hover:bg-red-600",
        border: "border-red-600",
        selected: "bg-red-700",
        text: "text-red-900",
        lightBg: "bg-red-50",
      }
    );
  };

  useEffect(() => {
    async function fetchCategorias() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre")
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error al obtener las categorías:", error);
        setError("No se pudieron cargar las categorías.");
      } else {
        console.log("Categorías obtenidas:", data);
        setCategorias(data);
      }

      setLoading(false);
    }

    fetchCategorias();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Título */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Categorías de Física
          </h1>
          <p className="text-gray-600">
            Selecciona una categoría para explorar los proyectos
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto">
            <div className="bg-red-50 border-2 border-red-300 text-red-700 p-4 rounded-xl shadow-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Grid de categorías */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    isSelected ? "scale-105" : ""
                  }`}
                >
                  <div
                    className={`rounded-2xl shadow-lg overflow-hidden border-4 transition-all duration-300 ${
                      isSelected
                        ? `${colors.selected} ${colors.border} shadow-2xl`
                        : `${colors.bg} border-transparent ${colors.hover} shadow-md hover:shadow-xl`
                    }`}
                  >
                    {/* Header colorido */}
                    <div className="h-32 flex items-center justify-center relative overflow-hidden">
                      {/* Patrón de fondo */}
                      <div className="absolute inset-0 opacity-10">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle, white 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }}
                        ></div>
                      </div>

                      {/* Icono decorativo */}
                      <div className="relative z-10">
                        <svg
                          className="w-16 h-16 text-white"
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

                      {/* Badge de selección */}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-white rounded-full p-1 shadow-lg">
                            <svg
                              className="w-6 h-6 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="bg-white p-6">
                      <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>
                        {cat.nombre}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Haz clic para ver proyectos de esta categoría
                      </p>
                    </div>

                    {/* Barra inferior decorativa */}
                    <div
                      className={`h-2 ${
                        isSelected ? colors.selected : colors.bg
                      } transition-all`}
                    ></div>
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
