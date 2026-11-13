import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { authFeria, mensajeError } from "../../lib/authFeria";
import { QRCodeSVG } from "qrcode.react";
import { PLAN_JURADOS, MOTIVO_INCLUSIVO } from "../../lib/asignacionJurados";

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

  // Asignación de proyectos: { [jurado_id]: [proyecto_id] } y catálogo de proyectos
  const [asignaciones, setAsignaciones] = useState({});
  const [proyectos, setProyectos] = useState([]);
  const [asignando, setAsignando] = useState(false);
  const [errorAsignaciones, setErrorAsignaciones] = useState("");

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

  const cargarAsignaciones = async () => {
    const [{ data: proy }, { data: filas, error }] = await Promise.all([
      supabase.from("proyectos").select("id, titulo, categorias(nombre)").order("id"),
      supabase.from("jurado_proyectos").select("jurado_id, proyecto_id"),
    ]);
    setProyectos(proy ?? []);
    if (error) {
      setErrorAsignaciones(
        "No se pudo leer la tabla jurado_proyectos. ¿Ejecutaste supabase/jurado_asignaciones.sql?"
      );
      return;
    }
    setErrorAsignaciones("");
    const mapa = {};
    for (const f of filas ?? []) (mapa[f.jurado_id] ??= []).push(f.proyecto_id);
    setAsignaciones(mapa);
  };

  useEffect(() => {
    cargarJurados();
    cargarAsignaciones();
  }, []);

  const tituloProyecto = (id) => proyectos.find((p) => p.id === id);

  const quitarProyecto = async (jurado, proyectoId) => {
    const { error } = await supabase
      .from("jurado_proyectos")
      .delete()
      .eq("jurado_id", jurado.id)
      .eq("proyecto_id", proyectoId);
    if (error) {
      setMensaje("No se pudo quitar el proyecto: " + error.message);
      setTipo("error");
      return;
    }
    cargarAsignaciones();
  };

  const agregarProyecto = async (jurado, proyectoId) => {
    if (!proyectoId) return;
    const { error } = await supabase
      .from("jurado_proyectos")
      .insert({ jurado_id: jurado.id, proyecto_id: Number(proyectoId) });
    if (error) {
      setMensaje("No se pudo asignar el proyecto: " + error.message);
      setTipo("error");
      return;
    }
    cargarAsignaciones();
  };

  // Crea (si faltan) los 5 jurados del plan y les asigna sus 4 proyectos.
  const handleCrearYAsignar = async () => {
    const hayCambios = Object.keys(asignaciones).length > 0;
    if (
      hayCambios &&
      !window.confirm("Ya hay asignaciones guardadas. Se reemplazarán por el plan de 5 jurados x 4 proyectos. ¿Continuar?")
    ) {
      return;
    }
    setAsignando(true);
    setMensaje("");
    try {
      const { data: existentes } = await supabase
        .from("usuarios")
        .select("id, nombre")
        .eq("role", "jurado");
      const nuevosCodigos = {};
      let creados = 0;

      for (const plan of PLAN_JURADOS) {
        let id = existentes?.find((j) => j.nombre === plan.nombre)?.id;
        if (!id) {
          const r = await authFeria("crear_jurado", { nombre: plan.nombre });
          if (!r.ok) throw new Error(`${plan.nombre}: ${mensajeError(r.error)}`);
          id = r.id;
          nuevosCodigos[r.id] = r.codigo;
          creados++;
        }
        const { error: eDel } = await supabase.from("jurado_proyectos").delete().eq("jurado_id", id);
        if (eDel) throw new Error(eDel.message);
        const { error: eIns } = await supabase
          .from("jurado_proyectos")
          .insert(plan.proyectos.map((proyecto_id) => ({ jurado_id: id, proyecto_id })));
        if (eIns) throw new Error(eIns.message);
      }

      setCodigos((prev) => ({ ...prev, ...nuevosCodigos }));
      setMensaje(
        creados > 0
          ? `Listo: ${creados} jurado(s) creado(s) y proyectos asignados. Guarda o imprime los QR ahora: no se podrán volver a ver.`
          : "Proyectos reasignados. Los jurados ya existían: si necesitas su QR, usa «Generar QR nuevo»."
      );
      setTipo("ok");
      await cargarJurados();
      await cargarAsignaciones();
    } catch (err) {
      setMensaje("No se pudo completar: " + err.message);
      setTipo("error");
    } finally {
      setAsignando(false);
    }
  };

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

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 space-y-2">
              <p>
                <strong>Plan de la feria:</strong> 5 jurados, 4 proyectos cada uno. El jurado 5 es inclusivo y recibe proyectos accesibles para una persona ciega.
              </p>
              <button
                type="button"
                onClick={handleCrearYAsignar}
                disabled={asignando}
                className="w-full bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {asignando ? "Creando..." : "Crear los 5 jurados y asignar proyectos"}
              </button>
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

                    <div className="mt-5 w-full border-t border-gray-100 pt-4 text-left">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Proyectos que evalúa ({(asignaciones[jurado.id] ?? []).length})
                      </p>
                      {errorAsignaciones ? (
                        <p className="text-xs text-red-600">{errorAsignaciones}</p>
                      ) : (
                        <>
                          <ul className="space-y-1.5">
                            {(asignaciones[jurado.id] ?? []).map((pid) => {
                              const pr = tituloProyecto(pid);
                              return (
                                <li key={pid} className="flex items-start justify-between gap-2 text-sm text-gray-800">
                                  <span>
                                    <span className="font-semibold">{pr?.titulo ?? `Proyecto ${pid}`}</span>
                                    {pr?.categorias?.nombre && (
                                      <span className="block text-xs text-gray-400">{pr.categorias.nombre}</span>
                                    )}
                                    {jurado.nombre.includes("inclusivo") && MOTIVO_INCLUSIVO[pid] && (
                                      <span className="block text-xs text-emerald-700">{MOTIVO_INCLUSIVO[pid]}</span>
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => quitarProyecto(jurado, pid)}
                                    className="text-red-500 hover:text-red-700 font-bold leading-none"
                                    title="Quitar este proyecto"
                                    aria-label={`Quitar ${pr?.titulo ?? pid}`}
                                  >
                                    ×
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          <select
                            value=""
                            onChange={(e) => agregarProyecto(jurado, e.target.value)}
                            className="mt-2 w-full text-sm border rounded-lg px-2 py-1.5 text-gray-700 bg-white"
                          >
                            <option value="">+ Asignar otro proyecto…</option>
                            {proyectos
                              .filter((p) => !(asignaciones[jurado.id] ?? []).includes(p.id))
                              .map((p) => (
                                <option key={p.id} value={p.id}>{p.titulo}</option>
                              ))}
                          </select>
                        </>
                      )}
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
