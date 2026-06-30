import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { QRCodeSVG } from "qrcode.react";

function AdminJurados() {
  const [jurados, setJurados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "" });
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");

  const cargarJurados = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .like("rut", "JUR%") // Identificamos a los jurados por el prefijo JUR
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

  const generarPin = () => Math.floor(1000 + Math.random() * 9000).toString();
  const generarRutJurado = () => "JUR" + Math.floor(100000 + Math.random() * 900000).toString();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");

    if (!form.nombre.trim()) {
      setMensaje("El nombre es obligatorio.");
      setTipo("error");
      return;
    }

    const rutGenerado = generarRutJurado();
    const nuevoPin = generarPin();

    const { error: errorInsert } = await supabase.from("usuarios").insert({
      nombre: form.nombre,
      rut: rutGenerado,
      pin_hash: nuevoPin,
      role: "visitante", // Usamos visitante para respetar la restricción CHECK de la BD
      viene_por_alguien: false,
      por_quien_vino: null
    });

    if (errorInsert) {
      console.error("Error de Supabase al registrar jurado:", errorInsert);
      setMensaje("Error al registrar jurado: " + (errorInsert.message || "Error desconocido"));
      setTipo("error");
    } else {
      setMensaje("Jurado registrado correctamente.");
      setTipo("ok");
      setForm({ nombre: "" });
      cargarJurados();
    }
  };

  const baseUrl = window.location.origin;

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
              className="w-full bg-black text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Registrar Jurado
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
                const loginUrl = `${baseUrl}/login?rut=${jurado.rut}&pin=${jurado.pin_hash}`;
                return (
                  <div key={jurado.id} className="bg-white rounded-2xl shadow p-6 border border-gray-100 flex flex-col items-center text-center">
                    <h3 className="font-bold text-gray-800 text-lg">{jurado.nombre}</h3>
                    <p className="text-gray-500 text-sm mb-4">ID: {jurado.rut}</p>
                    
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                      <QRCodeSVG value={loginUrl} size={150} />
                    </div>
                    
                    <p className="mt-3 text-xs text-gray-400 break-all w-full px-2 text-center">
                      Escanea para iniciar sesión<br />
                      PIN: <span className="font-bold text-gray-700">{jurado.pin_hash}</span>
                    </p>
                    <a
                      href={loginUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Probar Enlace
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AdminJurados;
