import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppContext } from "../context/AppContext";

function EvaluarProyecto() {
  const { proyectoId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AppContext); // Movido aquí

  const [proyecto, setProyecto] = useState(null);
  const [criterios, setCriterios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // valores elegidos por criterio: { criterioId: puntaje }
  const [valores, setValores] = useState({});
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState(""); // "success" | "error"

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 1) Traer datos del proyecto
        const { data: proy, error: proyError } = await supabase
          .from("proyectos")
          .select("id, titulo, participantes, stand_num")
          .eq("id", proyectoId)
          .maybeSingle();

        if (proyError || !proy) {
          console.error(proyError);
          setError("No se pudo cargar el proyecto.");
          setLoading(false);
          return;
        }

        setProyecto(proy);

        // 2) Traer la rúbrica "Presentación"
        const { data: rubrica, error: rubError } = await supabase
          .from("rubricas")
          .select("id, nombre")
          .eq("nombre", "Presentación")
          .maybeSingle();

        if (rubError || !rubrica) {
          console.error(rubError);
          setError("No se pudo cargar la rúbrica de evaluación.");
          setLoading(false);
          return;
        }

        // 3) Traer criterios de esa rúbrica
        const { data: crits, error: critError } = await supabase
          .from("criterios")
          .select("id, nombre, peso, orden")
          .eq("rubrica_id", rubrica.id)
          .order("orden", { ascending: true });

        if (critError) {
          console.error(critError);
          setError("No se pudieron cargar los criterios.");
        } else {
          setCriterios(crits);
        }
      } catch (err) {
        console.error("Error inesperado:", err);
        setError("Ocurrió un error inesperado.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [proyectoId]);

  const handleChangePuntaje = (criterioId, puntaje) => {
    setValores((prev) => ({
      ...prev,
      [criterioId]: puntaje,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setMensaje("");
  setTipoMensaje("");
  setEnviando(true);

  // Validar que estén todos los criterios respondidos
  const faltan = criterios.some((c) => !valores[c.id]);
  if (faltan) {
    setMensaje("Debes evaluar todos los criterios.");
    setTipoMensaje("error");
    setEnviando(false);
    return;
  }

  // Validar que haya un usuario logueado
  if (!user || !user.id) {
    setMensaje("Debes iniciar sesión para evaluar.");
    setTipoMensaje("error");
    setEnviando(false);
    return;
  }

  try {
    const visitanteId = user.id;

    // 0) Revisar si ya existe evaluación para este proyecto y este usuario
    const { data: evalExistente, error: evalExistError } = await supabase
      .from("evaluaciones")
      .select("id")
      .eq("proyecto_id", proyectoId)
      .eq("visitante_id", visitanteId)
      .maybeSingle();

    if (evalExistError) {
      console.error("Error al buscar evaluación previa:", evalExistError);
      setMensaje("Ocurrió un error al verificar tu evaluación previa.");
      setTipoMensaje("error");
      return;
    }

    // Si ya había evaluación, mostramos mensaje y redirigimos igual
    if (evalExistente) {
      setMensaje("Ya habías evaluado este proyecto.");
      setTipoMensaje("error");

      setTimeout(() => {
        navigate(-1);
      }, 1000);

      return;
    }

    // 1) Calcular nota final (promedio ponderado)
    const sumPesos = criterios.reduce((acc, c) => acc + c.peso, 0);
    const sumPonderado = criterios.reduce(
      (acc, c) => acc + (valores[c.id] || 0) * c.peso,
      0
    );
    const notaFinal = sumPesos > 0 ? sumPonderado / sumPesos : null;

    // 2) Insertar en tabla evaluaciones
    const { data: evalInsert, error: evalError } = await supabase
      .from("evaluaciones")
      .insert({
        proyecto_id: proyectoId,
        visitante_id: visitanteId,
        nota_final: notaFinal,
        observacion_general: observacion || null,
      })
      .select("id")
      .single();

    if (evalError) {
      console.error("Error al insertar evaluación:", evalError);
      setMensaje(`Error al guardar la evaluación: ${evalError.message}`);
      setTipoMensaje("error");
      return;
    }

    const evaluacionId = evalInsert.id;

    // 3) Insertar detalle por criterio
    const detalles = criterios.map((c) => ({
      evaluacion_id: evaluacionId,
      criterio_id: c.id,
      puntaje: valores[c.id],
      comentario: null,
    }));

    const { error: detError } = await supabase
      .from("evaluacion_detalle")
      .insert(detalles);

    if (detError) {
      console.error("Error al insertar detalle:", detError);
      setMensaje(`Error al guardar el detalle: ${detError.message}`);
      setTipoMensaje("error");
      return;
    }

    // Si todo salió bien
    setMensaje("¡Evaluación registrada correctamente!");
    setTipoMensaje("success");

    // Limpiar formulario (opcional, porque igual vamos a navegar)
    setValores({});
    setObservacion("");

    // Redirigir después de 1 segundo
    setTimeout(() => {
      navigate(-1);
    }, 1000);
  } catch (err) {
    console.error("Error inesperado:", err);
    setMensaje(`Error inesperado: ${err.message}`);
    setTipoMensaje("error");
  } finally {
    setEnviando(false);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Volver */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition-colors"
        >
          <span className="inline-block rounded-full bg-white shadow px-3 py-1.5 hover:bg-slate-50">
            ← Volver
          </span>
        </button>

        {/* Header */}
        {proyecto && (
          <div className="mb-8 bg-white rounded-2xl shadow-md p-6 border border-slate-100">
         
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              {proyecto.titulo}
            </h1>
            {proyecto.participantes && (
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Participantes: </span>
                {proyecto.participantes}
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Formulario */}
        {!loading && !error && criterios.length > 0 && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-md p-6 border border-slate-100 space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-1">
                Evaluación de la presentación
              </h2>
              <p className="text-sm text-slate-500">
                Evalúa cada criterio del 1 al 4, donde 4 corresponde a un desempeño muy bueno y 1 a un desempeño deficiente.
              </p>
            </div>

            {criterios.map((c) => (
              <div
                key={c.id}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50"
              >
                <div className="flex justify-between items-center mb-3">
                  <p className="font-medium text-slate-800">{c.nombre}</p>
               
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {[
                    { label: "Muy bueno", value: 4 },
                    { label: "Bueno", value: 3 },
                    { label: "Regular", value: 2 },
                    { label: "Deficiente", value: 1 },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 transition-all ${
                        valores[c.id] === opt.value
                          ? "bg-indigo-600 border-indigo-600 text-white font-semibold"
                          : "bg-white border-slate-300 hover:border-indigo-400 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`criterio-${c.id}`}
                        value={opt.value}
                        checked={valores[c.id] === opt.value}
                        onChange={() => handleChangePuntaje(c.id, opt.value)}
                        className="hidden"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

           

            {/* Mensaje */}
            {mensaje && (
              <div
                className={`p-4 rounded-lg border-2 ${
                  tipoMensaje === "error"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-green-50 border-green-300 text-green-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {tipoMensaje === "error" ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p className="font-medium">{mensaje}</p>
                </div>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando evaluación...
                </span>
              ) : (
                "Registrar evaluación"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default EvaluarProyecto;