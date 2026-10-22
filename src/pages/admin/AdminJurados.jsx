import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { authFeria, mensajeError } from "../../lib/authFeria";
import { QRCodeSVG } from "qrcode.react";

function AdminJurados() {
  const [jurados, setJurados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "" });
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [creando, setCreando] = useState(false);
  // Los códigos se guardan con hash en la base: solo se pueden mostrar justo
  // después de crearlos o regenerarlos. { [usuario_id]: codigo }
  const [codigos, setCodigos] = useState({});
  const [qrGrande, setQrGrande] = useState(null); // jurado con QR ampliado

  const baseUrl = window.location.origin;
  const urlLogin = (jurado) => `${baseUrl}/login?rut=${jurado.rut}&code=${codigos[jurado.id]}`;

  const cargarJurados = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre, rut, created_at")
      .eq("role", "jurado")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setJurados(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarJurados();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");

    if (!form.nombre.trim()) {
      setMensaje("El nombre es obligatorio.");
      setTipo("error");
      return;
    }

    setCreando(true);
    const r = await authFeria("crear_jurado", { nombre: form.nombre });
    setCreando(false);

    if (!r.ok) {
      setMensaje("Error al registrar jurado: " + mensajeError(r.error));
      setTipo("error");
      return;
    }

    setCodigos((prev) => ({ ...prev, [r.id]: r.codigo }));
    setMensaje("Jurado registrado. Descarga o muestra su QR ahora: el código no se podrá volver a ver.");
    setTipo("ok");
    setForm({ nombre: "" });
    cargarJurados();
  };

  const handleRegenerar = async (jurado) => {
    if (!window.confirm(`Se generará un código nuevo para ${jurado.nombre} y el QR anterior dejará de funcionar. ¿Continuar?`)) return;
    const r = await authFeria("regenerar_jurado", { usuario_id: jurado.id });
    if (!r.ok) {
      setMensaje("Error al regenerar el QR: " + mensajeError(r.error));
      setTipo("error");
      return;
    }
    setCodigos((prev) => ({ ...prev, [jurado.id]: r.codigo }));
    setMensaje(`Nuevo QR generado para ${jurado.nombre}.`);
    setTipo("ok");
  };

  const handleEliminar = async (jurado) => {
    if (!window.confirm(`¿Eliminar a ${jurado.nombre}? También se borrarán las evaluaciones que hizo.`)) return;
    const r = await authFeria("eliminar_usuario", { usuario_id: jurado.id });
    if (!r.ok) {
      setMensaje("Error al eliminar: " + mensajeError(r.error));
      setTipo("error");
      return;
    }
    setCodigos((prev) => {
      const { [jurado.id]: _quitado, ...resto } = prev;
      return resto;
    });
    cargarJurados();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">

        {/* Formulario de registro */}
        <div className="w-full md:w-1/3 bg-white rounded-2xl shadow p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Registrar Nuevo Jurado</h2>
          <p className="text-sm text-gray-500 mb-6">Solo necesitas el nombre. El sistema generará su acceso automáticamente.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Jurado</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: Dr. Juan Pérez"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                required
              />
            </div>

            {mensaje && (
              <div className={`p-3 rounded text-sm ${tipo === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={creando}
              className="w-full bg-black text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {creando ? "Registrando..." : "Registrar Jurado"}
            </button>
          </form>
        </div>

        {/* Lista de Jurados con QR */}
        <div className="w-full md:w-2/3">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Jurados Registrados (Códigos QR)</h2>
          {cargando ? (
            <p>Cargando jurados...</p>
          ) : jurados.length === 0 ? (
            <p className="text-gray-500">No hay jurados registrados aún.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {jurados.map((jurado) => {
                const tieneCodigo = Boolean(codigos[jurado.id]);
                return (
                  <div key={jurado.id} className="bg-white rounded-2xl shadow p-6 border border-gray-100 flex flex-col items-center text-center">
                    <h3 className="font-bold text-gray-800 text-lg">{jurado.nombre}</h3>
                    <p className="text-gray-500 text-sm mb-4">ID: {jurado.rut}</p>

                    {tieneCodigo ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setQrGrande(jurado)}
                          title="Clic para ampliar y escanear más rápido"
                          className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all"
                        >
                          <QRCodeSVG value={urlLogin(jurado)} size={150} />
                        </button>
                        <p className="mt-3 text-xs text-gray-400 w-full px-2 text-center">
                          Escanea para iniciar sesión.<br />
                          Este QR solo se ve ahora.
                        </p>
                        <button
                          type="button"
                          onClick={() => setQrGrande(jurado)}
                          className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Ampliar QR
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 px-2 mb-2">
                        El QR no se puede volver a mostrar. Si lo necesitas, genera uno nuevo.
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleRegenerar(jurado)}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Generar QR nuevo
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleEliminar(jurado)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal QR ampliado para escaneo rápido */}
      {qrGrande && codigos[qrGrande.id] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setQrGrande(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setQrGrande(null)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xl font-bold leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>

            <h3 className="font-bold text-gray-900 text-2xl mb-1">{qrGrande.nombre}</h3>
            <p className="text-gray-500 text-sm mb-6">ID: {qrGrande.rut}</p>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <QRCodeSVG
                value={urlLogin(qrGrande)}
                size={340}
                className="w-[70vw] h-[70vw] max-w-[340px] max-h-[340px]"
              />
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Escanea para iniciar sesión
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminJurados;
