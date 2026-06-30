import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

function AdminAyudantes() {
  const [form, setForm] = useState({ nombre: "", rut: "", pin: "" });
  const [ayudantes, setAyudantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    fetchAyudantes();
  }, []);

  const fetchAyudantes = async () => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, rut, role")
        .eq("role", "ayudante");

      if (error) throw error;
      setAyudantes(data || []);
    } catch (err) {
      console.error("Error al cargar ayudantes:", err);
      setMensaje("Error al cargar ayudantes");
      setTipo("error");
    } finally {
      setCargando(false);
    }
  };

  const formatRUT = (value) => {
    let cleaned = value.replace(/[^\dkK-]/g, "").toUpperCase();
    if (!cleaned) return "";
    let body = cleaned.replace(/-/g, "").slice(0, -1);
    let dv = cleaned.replace(/-/g, "").slice(-1);
    if (!dv) { body = cleaned.replace(/-/g, ""); dv = ""; }
    let formatted = "";
    for (let i = 0; i < body.length; i++) {
      if (i > 0 && (body.length - i) % 3 === 0) formatted += ".";
      formatted += body[i];
    }
    if (dv) formatted += "-" + dv;
    return formatted;
  };

  const handleRUTChange = (e) => setForm((prev) => ({ ...prev, rut: formatRUT(e.target.value) }));
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");
    setCreando(true);

    try {
      const rutNormalizado = form.rut.replace(/[.\-]/g, "").toUpperCase();

      const { data: existente } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rut", rutNormalizado)
        .maybeSingle();

      if (existente) {
        setMensaje("Este RUT ya está registrado");
        setTipo("error");
        setCreando(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("usuarios")
        .insert({
          nombre: form.nombre,
          rut: rutNormalizado,
          pin_hash: form.pin,
          role: "ayudante",
          viene_por_alguien: false,
          por_quien_vino: null,
        });

      if (insertError) throw insertError;

      setMensaje("Ayudante creado correctamente");
      setTipo("ok");
      setForm({ nombre: "", rut: "", pin: "" });
      fetchAyudantes();
    } catch (err) {
      console.error("Error:", err);
      setMensaje("Error al crear ayudante");
      setTipo("error");
    } finally {
      setCreando(false);
    }
  };

  const handleDeleteAyudante = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${nombre}?`)) return;
    try {
      const { error } = await supabase.from("usuarios").delete().eq("id", id);
      if (error) throw error;
      setMensaje("Ayudante eliminado correctamente");
      setTipo("ok");
      fetchAyudantes();
    } catch (err) {
      console.error("Error:", err);
      setMensaje("Error al eliminar ayudante");
      setTipo("error");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Gestión de Ayudantes</h1>
        <p className="text-gray-500 text-sm">Crea y gestiona los ayudantes que pueden registrar visitantes.</p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-4">Crear nuevo ayudante</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: María García"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RUT</label>
              <input
                type="text"
                name="rut"
                value={form.rut}
                onChange={handleRUTChange}
                placeholder="12.345.678-9"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PIN de acceso</label>
              <input
                type="text"
                name="pin"
                value={form.pin}
                onChange={handleChange}
                placeholder="Ej: Ayuda2026"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          {mensaje && (
            <div className={`p-3 rounded-lg border text-sm font-medium ${
              tipo === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
            }`}>
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={creando}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creando ? "Creando..." : "Crear ayudante"}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          Ayudantes activos
          <span className="ml-2 text-sm font-normal text-gray-400">({ayudantes.length})</span>
        </h2>

        {cargando ? (
          <div className="text-center py-8 text-gray-400 text-sm">Cargando ayudantes...</div>
        ) : ayudantes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No hay ayudantes creados aún</div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-2">
              {ayudantes.map((ayudante) => (
                <div key={ayudante.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{ayudante.nombre}</p>
                    <p className="text-xs text-gray-500">{ayudante.rut}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteAyudante(ayudante.id, ayudante.nombre)}
                    className="text-red-500 hover:text-red-700 font-medium text-xs px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Nombre</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">RUT</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ayudantes.map((ayudante) => (
                    <tr key={ayudante.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-800 font-medium">{ayudante.nombre}</td>
                      <td className="py-3 px-4 text-gray-500">{ayudante.rut}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteAyudante(ayudante.id, ayudante.nombre)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminAyudantes;
