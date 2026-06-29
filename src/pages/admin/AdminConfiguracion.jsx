import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

function AdminConfiguracion() {
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion_feria")
        .select("*");

      if (error) throw error;

      // Si no hay registros, crear uno
      if (!data || data.length === 0) {
        const { data: newConfig, error: insertError } = await supabase
          .from("configuracion_feria")
          .insert({ coevaluaciones_activas: false })
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newConfig);
      } else {
        setConfig(data[0]);
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error al cargar la configuración");
      setTipo("error");
    } finally {
      setCargando(false);
    }
  };

  const handleToggleCoevaluaciones = async () => {
    setGuardando(true);
    setMensaje("");
    setTipo("");

    try {
      const { error } = await supabase
        .from("configuracion_feria")
        .update({
          coevaluaciones_activas: !config.coevaluaciones_activas,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      setConfig((prev) => ({
        ...prev,
        coevaluaciones_activas: !prev.coevaluaciones_activas,
      }));

      setMensaje(
        `Coevaluaciones ${!config.coevaluaciones_activas ? "activadas" : "desactivadas"} correctamente`
      );
      setTipo("ok");
    } catch (err) {
      console.error(err);
      setMensaje("Error al actualizar la configuración");
      setTipo("error");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Configuración de la Feria
        </h1>
        <p className="text-gray-600">Controla las opciones disponibles para alumnos y visitantes.</p>
      </div>

      {mensaje && (
        <div
          className={`p-4 rounded-lg border ${
            tipo === "error"
              ? "bg-red-50 border-red-300 text-red-700"
              : "bg-green-50 border-green-300 text-green-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Tarjeta de Coevaluaciones */}
      <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
              Coevaluación de Estudiantes
            </h2>
            <p className="text-gray-500 text-sm mb-3">
              Permite que los alumnos se evalúen a sí mismos y a sus compañeros de proyecto.
            </p>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${config?.coevaluaciones_activas ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
              <span className={`text-sm font-bold ${config?.coevaluaciones_activas ? "text-green-600" : "text-gray-500"}`}>
                {config?.coevaluaciones_activas ? "ACTIVO" : "INACTIVO"}
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleCoevaluaciones}
            disabled={guardando}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white transition-all duration-300 text-sm ${
              config?.coevaluaciones_activas
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {guardando
              ? "Actualizando..."
              : config?.coevaluaciones_activas
              ? "Desactivar"
              : "Activar"}
          </button>
        </div>
      </div>

      {/* Información */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <p className="text-sm text-blue-700 font-medium">
          ℹ️ Cuando la coevaluación está <strong>INACTIVA</strong>, los alumnos verán un mensaje indicando que aún no está disponible.
        </p>
      </div>
    </div>
  );
}

export default AdminConfiguracion;
