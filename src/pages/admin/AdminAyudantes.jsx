import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Los ayudantes entran con su cuenta institucional de Google. Aquí el admin
// autoriza (o quita) correos: la lista vive en la tabla `staff_google` y la
// base de datos la usa para decidir quién es ayudante.
function AdminAyudantes() {
  const [form, setForm] = useState({ nombre: "", email: "" });
  const [ayudantes, setAyudantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");

  const fetchAyudantes = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_google")
        .select("id, nombre, email, role")
        .eq("role", "ayudante")
        .order("created_at", { ascending: false });

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

  useEffect(() => {
    fetchAyudantes();
  }, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");
    setCreando(true);

    try {
      const email = form.email.trim().toLowerCase();
      const { error } = await supabase
        .from("staff_google")
        .insert({ nombre: form.nombre.trim(), email, role: "ayudante" });

      if (error) {
        setMensaje(
          error.code === "23505" ? "Ese correo ya está autorizado" : "Error al autorizar ayudante"
        );
        setTipo("error");
        return;
      }

      setMensaje("Ayudante autorizado. Ya puede entrar con su cuenta de Google.");
      setTipo("ok");
      setForm({ nombre: "", email: "" });
      fetchAyudantes();
    } catch (err) {
      console.error("Error:", err);
      setMensaje("Error al autorizar ayudante");
      setTipo("error");
    } finally {
      setCreando(false);
    }
  };

  const handleDeleteAyudante = async (id, nombre) => {
    if (!window.confirm(`¿Quitar el acceso de ${nombre}?`)) return;
    const { error } = await supabase.from("staff_google").delete().eq("id", id);
    if (error) {
      setMensaje("Error al quitar el acceso");
      setTipo("error");
      return;
    }
    setMensaje("Acceso eliminado");
    setTipo("ok");
    fetchAyudantes();
  };

  const inputCls =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Gestión de Ayudantes</h1>
        <p className="text-gray-500 text-sm">
          Autoriza el correo institucional de quienes pueden registrar visitantes. Entran con "Entrar con Google" en /login.
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-4">Autorizar nuevo ayudante</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: María García"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Correo institucional</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="nombre@alumnos.uta.cl"
                className={inputCls}
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
            {creando ? "Guardando..." : "Autorizar ayudante"}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          Ayudantes autorizados
          <span className="ml-2 text-sm font-normal text-gray-400">({ayudantes.length})</span>
        </h2>

        {cargando ? (
          <div className="text-center py-8 text-gray-400 text-sm">Cargando ayudantes...</div>
        ) : ayudantes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No hay ayudantes autorizados aún</div>
        ) : (
          <div className="space-y-2">
            {ayudantes.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{a.nombre}</p>
                  <p className="text-xs text-gray-500">{a.email}</p>
                </div>
                <button
                  onClick={() => handleDeleteAyudante(a.id, a.nombre)}
                  className="text-red-500 hover:text-red-700 font-medium text-xs px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Quitar acceso
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAyudantes;
