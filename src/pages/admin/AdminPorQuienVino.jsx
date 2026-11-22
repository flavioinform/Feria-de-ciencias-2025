// src/pages/admin/AdminPorQuienVino.jsx
import { useEffect, useState } from "react";
import { fetchAllRows } from "../../lib/supabase";
import { exportarPorQuienVino } from "../../lib/exportExcel";

// Normaliza un RUT para comparar (sin puntos, guión ni espacios, DV en mayúscula)
const normRut = (r) => (r || "").toString().replace(/[.\-\s]/g, "").toUpperCase();

// Flecha que rota al abrir un grupo
const Chevron = ({ abierto }) => (
  <svg
    className={`w-4 h-4 shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

function AdminPorQuienVino() {
  const [categorias, setCategorias] = useState([]); // [{ key, nombre, total, proyectos:[...] }]
  const [otros, setOtros] = useState([]); // [{ key, total, visitantes:[...] }]
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Estado de la UI interactiva (qué categorías / participantes están abiertos)
  const [catAbiertas, setCatAbiertas] = useState(new Set());
  const [partAbiertos, setPartAbiertos] = useState(new Set());

  const toggle = (setFn, key) =>
    setFn((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  useEffect(() => {
    async function fetchDatos() {
      setLoading(true);
      setMensaje("");
      try {
        // Traemos todo (paginado, pueden ser >1000 filas)
        const visitantes = (
          await fetchAllRows("usuarios", "id, rut, nombre, viene_por_alguien, por_quien_vino")
        ).filter((u) => u.viene_por_alguien);
        const participantes = await fetchAllRows("participantes", "id, nombre, rut, proyecto_id");
        const proyectos = await fetchAllRows("proyectos", "id, titulo, categorias_id");
        const cats = await fetchAllRows("categorias", "id, nombre");

        // Índices para emparejar "por_quien_vino" -> participante -> proyecto -> categoría
        const partPorRut = new Map(participantes.map((p) => [normRut(p.rut), p]));
        const partPorNombre = new Map(
          participantes.map((p) => [(p.nombre || "").trim().toLowerCase(), p])
        );
        const proyPorId = new Map(proyectos.map((p) => [String(p.id), p]));
        const catPorId = new Map(cats.map((c) => [String(c.id), c]));

        // Estructura: categoría -> proyecto -> participante -> [visitantes]
        const mapaCat = new Map();
        const mapaOtros = new Map();

        const ensureCat = (id, nombre) => {
          if (!mapaCat.has(id)) mapaCat.set(id, { key: id, nombre, proyectos: new Map() });
          return mapaCat.get(id);
        };

        for (const v of visitantes) {
          const txt = (v.por_quien_vino || "").trim();
          let part = null;
          if (txt) {
            const m = txt.match(/\(([^)]*)\)\s*$/); // RUT entre paréntesis al final
            if (m) part = partPorRut.get(normRut(m[1]));
            if (!part) {
              const soloNombre = txt.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
              part = partPorNombre.get(soloNombre);
            }
          }

          if (part) {
            const proy = proyPorId.get(String(part.proyecto_id));
            const cat = proy ? catPorId.get(String(proy.categorias_id)) : null;
            const c = ensureCat(cat ? String(cat.id) : "__sin_cat__", cat ? cat.nombre : "Sin categoría");
            const proyKey = proy ? String(proy.id) : "__sin_proy__";
            if (!c.proyectos.has(proyKey))
              c.proyectos.set(proyKey, {
                key: proyKey,
                titulo: proy ? proy.titulo : "Sin proyecto",
                participantes: new Map(),
              });
            const pr = c.proyectos.get(proyKey);
            if (!pr.participantes.has(String(part.id)))
              pr.participantes.set(String(part.id), {
                key: String(part.id),
                nombre: part.nombre,
                rut: part.rut,
                visitantes: [],
              });
            pr.participantes.get(String(part.id)).visitantes.push(v);
          } else {
            const k = txt || "Sin especificar";
            if (!mapaOtros.has(k)) mapaOtros.set(k, { key: k, visitantes: [] });
            mapaOtros.get(k).visitantes.push(v);
          }
        }

        // Convertir a arrays con totales y ordenar por total desc
        const catArray = Array.from(mapaCat.values())
          .map((c) => {
            const proyectosArr = Array.from(c.proyectos.values())
              .map((pr) => {
                const partArr = Array.from(pr.participantes.values())
                  .map((pt) => ({ ...pt, total: pt.visitantes.length }))
                  .sort((a, b) => b.total - a.total);
                return {
                  ...pr,
                  participantes: partArr,
                  total: partArr.reduce((s, p) => s + p.total, 0),
                };
              })
              .sort((a, b) => b.total - a.total);
            return {
              key: c.key,
              nombre: c.nombre,
              proyectos: proyectosArr,
              total: proyectosArr.reduce((s, p) => s + p.total, 0),
            };
          })
          .sort((a, b) => b.total - a.total);

        const otrosArray = Array.from(mapaOtros.values())
          .map((o) => ({ ...o, total: o.visitantes.length }))
          .sort((a, b) => b.total - a.total);

        setCategorias(catArray);
        setOtros(otrosArray);
      } catch (err) {
        console.error(err);
        setMensaje("Error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    }

    fetchDatos();
  }, []);

  // ---------- DESCARGAR EXCEL (.xlsx real, una hoja por categoría) ----------
  const handleDownloadExcel = async () => {
    if (!categorias.length && !otros.length) return;
    setDescargando(true);
    try {
      await exportarPorQuienVino(categorias, otros);
    } catch (err) {
      console.error(err);
      setMensaje("Error al generar el Excel.");
    } finally {
      setDescargando(false);
    }
  };

  const granTotal =
    categorias.reduce((s, c) => s + c.total, 0) + otros.reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-black">¿Por quién vinieron?</h1>

        <button
          onClick={handleDownloadExcel}
          disabled={loading || descargando || (!categorias.length && !otros.length)}
          className="px-4 py-2 rounded-lg text-sm font-semibold
                     bg-green-600 text-white hover:bg-green-700
                     disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {descargando ? "Generando..." : "Descargar Excel"}
        </button>
      </div>
      <p className="text-slate-500 text-sm mb-4">
        Una hoja por categoría. Dentro de cada hoja se puede abrir cada proyecto y participante
        para ver quiénes vinieron por ellos. El Excel trae logos, resumen y todo el detalle a la vista.
      </p>

      {loading && <p>Cargando...</p>}
      {mensaje && <p className="text-red-600">{mensaje}</p>}

      {!loading && !mensaje && categorias.length === 0 && otros.length === 0 && (
        <p>No hay registros con “viene por alguien”.</p>
      )}

      {!loading && (categorias.length > 0 || otros.length > 0) && (
        <div className="space-y-3">
          {/* Categorías */}
          {categorias.map((cat) => {
            const abierta = catAbiertas.has(cat.key);
            return (
              <div
                key={cat.key}
                className="text-black bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => toggle(setCatAbiertas, cat.key)}
                  className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Chevron abierto={abierta} />
                    <h2 className="font-bold text-lg truncate">{cat.nombre}</h2>
                  </div>
                  <span className="text-sm shrink-0">
                    Total: <span className="font-bold">{cat.total}</span>
                  </span>
                </button>

                {abierta && (
                  <div className="px-4 pb-4 space-y-4">
                    {cat.proyectos.map((proy) => (
                      <div key={proy.key}>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1 mb-2">
                          <span className="truncate">{proy.titulo}</span>
                          <span className="shrink-0 text-slate-500">{proy.total}</span>
                        </div>

                        <div className="space-y-1">
                          {proy.participantes.map((pt) => {
                            const abiertoP = partAbiertos.has(pt.key);
                            return (
                              <div key={pt.key} className="rounded-lg bg-slate-50">
                                <button
                                  onClick={() => toggle(setPartAbiertos, pt.key)}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Chevron abierto={abiertoP} />
                                    <span className="text-sm font-medium truncate">
                                      {pt.nombre}
                                    </span>
                                    <span className="text-xs text-slate-400 shrink-0">
                                      ({pt.rut})
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-[#0b6e99] shrink-0">
                                    {pt.total} {pt.total === 1 ? "persona" : "personas"}
                                  </span>
                                </button>

                                {abiertoP && (
                                  <ul className="px-3 pb-2 pl-9 text-sm text-slate-600 list-disc space-y-0.5">
                                    {pt.visitantes.map((v) => (
                                      <li key={v.id}>
                                        {v.nombre} <span className="text-slate-400">({v.rut})</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Otros / Sin especificar */}
          {otros.length > 0 && (
            <div className="text-black bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggle(setCatAbiertas, "__otros__")}
                className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Chevron abierto={catAbiertas.has("__otros__")} />
                  <h2 className="font-bold text-lg truncate">Otros / Sin especificar</h2>
                </div>
                <span className="text-sm shrink-0">
                  Total:{" "}
                  <span className="font-bold">{otros.reduce((s, o) => s + o.total, 0)}</span>
                </span>
              </button>

              {catAbiertas.has("__otros__") && (
                <div className="px-4 pb-4 space-y-1">
                  {otros.map((o) => {
                    const abiertoP = partAbiertos.has("otros:" + o.key);
                    return (
                      <div key={o.key} className="rounded-lg bg-slate-50">
                        <button
                          onClick={() => toggle(setPartAbiertos, "otros:" + o.key)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Chevron abierto={abiertoP} />
                            <span className="text-sm font-medium truncate">{o.key}</span>
                          </div>
                          <span className="text-xs font-bold text-[#0b6e99] shrink-0">
                            {o.total} {o.total === 1 ? "persona" : "personas"}
                          </span>
                        </button>
                        {abiertoP && (
                          <ul className="px-3 pb-2 pl-9 text-sm text-slate-600 list-disc space-y-0.5">
                            {o.visitantes.map((v) => (
                              <li key={v.id}>
                                {v.nombre} <span className="text-slate-400">({v.rut})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <p className="text-right text-xs text-slate-400 pt-1">
            Gran total de visitantes con referente: <span className="font-bold">{granTotal}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminPorQuienVino;
