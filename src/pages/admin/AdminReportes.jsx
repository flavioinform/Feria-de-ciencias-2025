import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportarReporteProyectos } from "../../lib/exportExcel";

// El correo del participante puede llamarse distinto según cómo se creó la tabla.
const correoDe = (p) => p.email ?? p.correo ?? p.email_institucional ?? "";

const ERRORES_CORREO = {
  no_autorizado: "Solo el administrador puede enviar correos.",
  correo_no_configurado:
    "El envío de correos aún no está configurado (faltan RESEND_API_KEY y MAIL_FROM en Supabase).",
  faltan_datos: "Escribe el asunto y el mensaje.",
  sin_destinatarios: "No hay destinatarios válidos seleccionados.",
  demasiados_destinatarios: "Máximo 500 destinatarios por envío.",
  error_servidor: "Ocurrió un error en el servidor.",
};

function Marca({ ok, textoFalta = "Falta" }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      ✓ Sí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      ✗ {textoFalta}
    </span>
  );
}

function AdminReportes() {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [soloIncompletos, setSoloIncompletos] = useState(false);

  // Correo
  const [seleccion, setSeleccion] = useState(new Set()); // correos elegidos
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo, texto }

  useEffect(() => {
    async function cargar() {
      const { data, error: err } = await supabase
        .from("proyectos")
        .select("id, titulo, descripcion, image, categorias(nombre), participantes(*)")
        .order("categorias_id")
        .order("titulo");
      if (err) setError("No se pudieron cargar los proyectos: " + err.message);
      else setProyectos(data ?? []);
      setCargando(false);
    }
    cargar();
  }, []);

  const filas = useMemo(
    () =>
      proyectos.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        asignatura: p.categorias?.nombre ?? "—",
        tieneImagen: Boolean(p.image && String(p.image).trim()),
        tieneDescripcion: Boolean(p.descripcion && p.descripcion.trim()),
        integrantes: (p.participantes ?? []).map((i) => ({
          id: i.id,
          nombre: i.nombre,
          correo: correoDe(i),
        })),
      })),
    [proyectos]
  );

  const incompleto = (f) => !f.tieneImagen || !f.tieneDescripcion || f.integrantes.length === 0;
  const resumen = {
    total: filas.length,
    sinImagen: filas.filter((f) => !f.tieneImagen).length,
    sinDescripcion: filas.filter((f) => !f.tieneDescripcion).length,
    sinIntegrantes: filas.filter((f) => f.integrantes.length === 0).length,
    completos: filas.filter((f) => !incompleto(f)).length,
  };
  const visibles = soloIncompletos ? filas.filter(incompleto) : filas;

  // ---------- Correos ----------
  const personas = useMemo(
    () =>
      filas.flatMap((f) =>
        f.integrantes.map((i) => ({ ...i, proyectoId: f.id, proyecto: f.titulo }))
      ),
    [filas]
  );
  const conCorreo = personas.filter((p) => p.correo);
  const sinCorreo = personas.length - conCorreo.length;

  const personasVisibles = conCorreo.filter(
    (p) =>
      (!filtroProyecto || String(p.proyectoId) === filtroProyecto) &&
      (!busqueda ||
        `${p.nombre} ${p.correo} ${p.proyecto}`.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const alternar = (correo) =>
    setSeleccion((prev) => {
      const sig = new Set(prev);
      if (sig.has(correo)) sig.delete(correo);
      else sig.add(correo);
      return sig;
    });

  const marcarVisibles = () =>
    setSeleccion((prev) => new Set([...prev, ...personasVisibles.map((p) => p.correo)]));

  const marcarIncompletos = () => {
    const idsIncompletos = new Set(filas.filter(incompleto).map((f) => f.id));
    setSeleccion(
      new Set(conCorreo.filter((p) => idsIncompletos.has(p.proyectoId)).map((p) => p.correo))
    );
  };

  const enviar = async (e) => {
    e.preventDefault();
    setResultado(null);
    if (seleccion.size === 0) {
      setResultado({ tipo: "error", texto: "Selecciona al menos un destinatario." });
      return;
    }
    if (!window.confirm(`Se enviará este correo a ${seleccion.size} persona(s). ¿Continuar?`)) return;

    setEnviando(true);
    const { data, error: err } = await supabase.functions.invoke("enviar-correo", {
      body: { destinatarios: [...seleccion], asunto, mensaje },
    });
    setEnviando(false);

    let r = data;
    if (err && !r) {
      try {
        r = await err.context?.json?.();
      } catch {
        r = null;
      }
    }
    if (r?.ok) {
      setResultado({ tipo: "ok", texto: `Correo enviado a ${r.enviados} persona(s).` });
      setAsunto("");
      setMensaje("");
    } else if (r?.enviados > 0) {
      setResultado({
        tipo: "error",
        texto: `Se enviaron ${r.enviados}, pero fallaron: ${r.fallidos.join(", ")}`,
      });
    } else {
      setResultado({
        tipo: "error",
        texto: ERRORES_CORREO[r?.error] ?? "No se pudo enviar el correo.",
      });
    }
  };

  if (cargando) return <p className="text-slate-500">Cargando reporte…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-12">
      {/* ======== Reporte ======== */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Reporte de proyectos</h1>
            <p className="text-slate-500 mt-1">
              Revisa qué proyectos tienen imagen, descripción e integrantes registrados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={soloIncompletos}
                onChange={(e) => setSoloIncompletos(e.target.checked)}
                className="h-4 w-4"
              />
              Solo incompletos
            </label>
            <button
              type="button"
              onClick={() => exportarReporteProyectos(visibles)}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Descargar Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            ["Proyectos", resumen.total, "text-slate-800"],
            ["Completos", resumen.completos, "text-emerald-700"],
            ["Sin imagen", resumen.sinImagen, "text-red-700"],
            ["Sin descripción", resumen.sinDescripcion, "text-red-700"],
            ["Sin integrantes", resumen.sinIntegrantes, "text-red-700"],
          ].map(([titulo, valor, color]) => (
            <div key={titulo} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
              <p className={`text-3xl font-bold tabular-nums ${color}`}>{valor}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Asignatura</th>
                <th className="px-4 py-3">Imagen</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Integrantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((f) => (
                <tr key={f.id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-slate-800">{f.titulo}</td>
                  <td className="px-4 py-3 text-slate-600">{f.asignatura}</td>
                  <td className="px-4 py-3"><Marca ok={f.tieneImagen} /></td>
                  <td className="px-4 py-3"><Marca ok={f.tieneDescripcion} /></td>
                  <td className="px-4 py-3">
                    {f.integrantes.length === 0 ? (
                      <Marca ok={false} textoFalta="Sin integrantes" />
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-slate-500">
                          {f.integrantes.length} integrante(s)
                        </span>
                        <ul className="mt-1 text-slate-700">
                          {f.integrantes.map((i) => (
                            <li key={i.id}>{i.nombre}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Todos los proyectos están completos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ======== Correos ======== */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800">Enviar correo a participantes</h2>
        <p className="text-slate-500 mt-1 mb-6">
          Elige a quién escribirle: a todos, a los de un proyecto, o a personas puntuales.
          {sinCorreo > 0 && ` (${sinCorreo} integrante(s) no tienen correo registrado.)`}
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <select
                value={filtroProyecto}
                onChange={(e) => setFiltroProyecto(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm text-slate-700 bg-white"
              >
                <option value="">Todos los proyectos</option>
                {filas.map((f) => (
                  <option key={f.id} value={f.id}>{f.titulo}</option>
                ))}
              </select>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre o correo"
                className="flex-1 min-w-40 rounded-lg border px-3 py-2 text-sm text-black"
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm">
              <button type="button" onClick={marcarVisibles} className="font-semibold text-emerald-700 hover:underline">
                Marcar los de la lista ({personasVisibles.length})
              </button>
              <button type="button" onClick={marcarIncompletos} className="font-semibold text-emerald-700 hover:underline">
                Solo proyectos incompletos
              </button>
              <button type="button" onClick={() => setSeleccion(new Set())} className="font-semibold text-slate-500 hover:underline">
                Limpiar
              </button>
            </div>
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {personasVisibles.map((p) => (
                <li key={`${p.proyectoId}-${p.id}`}>
                  <label className="flex items-start gap-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seleccion.has(p.correo)}
                      onChange={() => alternar(p.correo)}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-slate-800">{p.nombre}</span>
                      <span className="block text-slate-500">{p.correo}</span>
                      <span className="block text-xs text-slate-400">{p.proyecto}</span>
                    </span>
                  </label>
                </li>
              ))}
              {personasVisibles.length === 0 && (
                <li className="py-6 text-center text-sm text-slate-500">No hay personas con correo en esta lista.</li>
              )}
            </ul>
          </div>

          <form onSubmit={enviar} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">
              Destinatarios seleccionados: <span className="text-emerald-700">{seleccion.size}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asunto</label>
              <input
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                maxLength={200}
                required
                className="w-full rounded-lg border px-3 py-2 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mensaje</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={8}
                required
                className="w-full rounded-lg border px-3 py-2 text-black"
              />
            </div>
            {resultado && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  resultado.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {resultado.texto}
              </div>
            )}
            <button
              type="submit"
              disabled={enviando || seleccion.size === 0}
              className="w-full rounded-lg bg-black px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {enviando ? "Enviando…" : `Enviar a ${seleccion.size} persona(s)`}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default AdminReportes;
