import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Estudiantes de logística: entran con su cuenta institucional de Google y solo
// ven "Registro de logística". El admin autoriza (o quita) correos aquí; la
// lista vive en `staff_google` (rol interno "ayudante") y la base de datos la
// usa para decidir qué puede hacer cada cuenta.
const DOMINIOS = ["@alumnos.uta.cl", "@estudiantes.uta.cl"];

function AdminLogistica() {
  const [form, setForm] = useState({ nombre: "", email: "" });
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");

  const cargar = async () => {
    const { data, error } = await supabase
      .from("staff_google")
      .select("id, nombre, email")
      .eq("role", "ayudante")
      .order("created_at", { ascending: false });
    if (error) {
      setMensaje("Error al cargar el equipo de logística");
      setTipo("error");
    } else {
      setLista(data || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    const email = form.email.trim().toLowerCase();

    if (!DOMINIOS.some((d) => email.endsWith(d))) {
      setMensaje(`El correo debe ser institucional (${DOMINIOS.join(" o ")}).`);
      setTipo("error");
      return;
    }

    setGuardando(true);
    const { error } = await supabase
      .from("staff_google")
      .insert({ nombre: form.nombre.trim(), email, role: "ayudante" });
    setGuardando(false);

    if (error) {
      setMensaje(error.code === "23505" ? "Ese correo ya está autorizado." : "No se pudo autorizar.");
      setTipo("error");
      return;
    }
    setMensaje("Autorizado. Ya puede entrar con su cuenta de Google en /login.");
    setTipo("ok");
    setForm({ nombre: "", email: "" });
    cargar();
  };

  const quitar = async (p) => {
    if (!window.confirm(`¿Quitar el acceso de ${p.nombre}?`)) return;
    const { error } = await supabase.from("staff_google").delete().eq("id", p.id);
    if (error) {
      setMensaje("No se pudo quitar el acceso.");
      setTipo("error");
      return;
    }
    setMensaje("Acceso eliminado.");
    setTipo("ok");
    cargar();
  };

  const inputCls =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Equipo de logística</h1>
        <p className="text-gray-500 text-sm">
          Estudiantes que ayudan a registrar visitantes. Solo ven la sección "Registro de logística".
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-4">Autorizar estudiante</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} className={inputCls} required />
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
            disabled={guardando}
            className="px-6 py-2.5 bg-[#0b6e99] hover:bg-[#095a7d] text-white font-bold rounded-lg text-sm disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Autorizar"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          Autorizados <span className="ml-1 text-sm font-normal text-gray-400">({lista.length})</span>
        </h2>
        {cargando ? (
          <p className="text-center py-6 text-gray-400 text-sm">Cargando...</p>
        ) : lista.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm">Aún no hay estudiantes autorizados</p>
        ) : (
          <div className="space-y-2">
            {lista.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                </div>
                <button
                  onClick={() => quitar(p)}
                  className="shrink-0 ml-3 text-red-500 hover:text-red-700 font-medium text-xs px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"
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

export default AdminLogistica;
