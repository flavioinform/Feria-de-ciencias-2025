// src/lib/exportExcel.js
// Exportaciones a Excel (.xlsx) con una hoja por categoría.
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { fetchAllRows } from "./supabase";

const round2 = (n) => Math.round(n * 100) / 100;

// Nombre de hoja válido en Excel: máx 31 chars, sin \ / ? * [ ] :
function crearNombradorHojas() {
  const usados = new Set();
  return (base) => {
    const limpio = (base || "Hoja").replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Hoja";
    let n = limpio;
    let i = 2;
    while (usados.has(n.toLowerCase())) {
      n = limpio.slice(0, 28) + " " + i;
      i++;
    }
    usados.add(n.toLowerCase());
    return n;
  };
}

function estilizarEncabezado(ws) {
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

async function guardar(wb, nombreArchivo) {
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    nombreArchivo
  );
}

/**
 * Exporta las evaluaciones de PÚBLICO por categoría.
 * Una hoja por categoría; filas = proyectos con su promedio y cantidad de
 * evaluaciones del público (se excluyen los jurados, RUT que empieza con "JUR").
 */
export async function exportarPublicoPorCategoria() {
  const [evals, proyectos, categorias] = await Promise.all([
    fetchAllRows("evaluaciones", "proyecto_id, nota_final, usuarios(rut)"),
    fetchAllRows("proyectos", "id, titulo, categorias_id"),
    fetchAllRows("categorias", "id, nombre"),
  ]);

  const proyById = new Map(proyectos.map((p) => [String(p.id), p]));
  const catById = new Map(categorias.map((c) => [String(c.id), c]));
  const esJurado = (r) => (r.usuarios?.rut || "").toUpperCase().startsWith("JUR");

  // Acumular por proyecto (solo público)
  const porProy = new Map();
  for (const e of evals) {
    if (esJurado(e) || e.nota_final == null) continue;
    const k = String(e.proyecto_id);
    const o = porProy.get(k) || { suma: 0, n: 0 };
    o.suma += Number(e.nota_final);
    o.n += 1;
    porProy.set(k, o);
  }

  // Agrupar proyectos por categoría
  const porCat = new Map(); // nombreCat -> [{titulo, n, promedio}]
  for (const [pid, o] of porProy) {
    const proy = proyById.get(pid);
    const cat = proy ? catById.get(String(proy.categorias_id)) : null;
    const ck = cat ? cat.nombre : "Sin categoría";
    if (!porCat.has(ck)) porCat.set(ck, []);
    porCat.get(ck).push({
      titulo: proy ? proy.titulo : "Sin proyecto",
      n: o.n,
      promedio: round2(o.suma / o.n),
    });
  }

  const wb = new ExcelJS.Workbook();
  const nombreHoja = crearNombradorHojas();

  // Ordenar categorías por su mejor promedio (o alfabético) — dejamos alfabético estable
  const cats = Array.from(porCat.keys()).sort((a, b) => a.localeCompare(b));
  for (const ck of cats) {
    const filas = porCat.get(ck).sort((a, b) => b.promedio - a.promedio);
    const ws = wb.addWorksheet(nombreHoja(ck));
    ws.columns = [
      { header: "Posición", width: 10 },
      { header: "Proyecto", width: 48 },
      { header: "N° evaluaciones", width: 16 },
      { header: "Promedio público", width: 18 },
    ];
    estilizarEncabezado(ws);
    filas.forEach((f, idx) => {
      ws.addRow([idx + 1, f.titulo, f.n, f.promedio]);
    });
  }

  if (!cats.length) {
    const ws = wb.addWorksheet("Sin datos");
    ws.addRow(["No hay evaluaciones de público registradas."]);
  }

  await guardar(wb, "resultados_publico_por_categoria.xlsx");
}

/**
 * Exporta el promedio de COEVALUACIÓN por miembro, con una hoja por categoría.
 * Para cada participante se promedian todas las coevaluaciones que RECIBIÓ,
 * dando una nota final. Se incluyen dos notas: con todas las coevaluaciones y
 * excluyendo la auto-evaluación (cuando el evaluador es el mismo evaluado).
 */
export async function exportarCoevaluacionPorMiembro() {
  const [coevs, participantes, proyectos, categorias] = await Promise.all([
    fetchAllRows("coevaluaciones", "evaluado_id, promedio"),
    fetchAllRows("participantes", "id, nombre, rut, proyecto_id"),
    fetchAllRows("proyectos", "id, titulo, categorias_id"),
    fetchAllRows("categorias", "id, nombre"),
  ]);

  const proyById = new Map(proyectos.map((p) => [String(p.id), p]));
  const catById = new Map(categorias.map((c) => [String(c.id), c]));

  // Promedios de coevaluación RECIBIDOS por cada participante (evaluado_id)
  const recibidas = new Map();
  for (const c of coevs) {
    const k = String(c.evaluado_id);
    if (!recibidas.has(k)) recibidas.set(k, { todas: [] });
    recibidas.get(k).todas.push(Number(c.promedio));
  }

  const promArr = (arr) => (arr.length ? round2(arr.reduce((x, y) => x + y, 0) / arr.length) : null);

  // Agrupar miembros por categoría (participante -> proyecto -> categoría)
  const porCat = new Map();
  for (const part of participantes) {
    const o = recibidas.get(String(part.id));
    if (!o) continue; // sin coevaluaciones recibidas
    const proy = proyById.get(String(part.proyecto_id));
    const cat = proy ? catById.get(String(proy.categorias_id)) : null;
    const ck = cat ? cat.nombre : "Sin categoría";
    if (!porCat.has(ck)) porCat.set(ck, []);
    porCat.get(ck).push({
      nombre: part.nombre,
      rut: part.rut,
      proyecto: proy ? proy.titulo : "Sin proyecto",
      notaFinal: promArr(o.todas), // promedio de todas las coevaluaciones recibidas
    });
  }

  const wb = new ExcelJS.Workbook();
  const nombreHoja = crearNombradorHojas();

  const cats = Array.from(porCat.keys()).sort((a, b) => a.localeCompare(b));
  for (const ck of cats) {
    const ws = wb.addWorksheet(nombreHoja(ck));
    ws.columns = [
      { header: "Participante", width: 34 },
      { header: "RUT", width: 15 },
      { header: "Proyecto", width: 34 },
      { header: "Nota final", width: 12 },
    ];
    estilizarEncabezado(ws);

    // Agrupar por proyecto: los miembros de un mismo proyecto quedan juntos.
    const grupos = new Map();
    for (const f of porCat.get(ck)) {
      if (!grupos.has(f.proyecto)) grupos.set(f.proyecto, []);
      grupos.get(f.proyecto).push(f);
    }

    // Ordenar los proyectos por su nota promedio (mejor primero) y, dentro de
    // cada proyecto, los miembros por nota descendente.
    const proyectosOrdenados = Array.from(grupos.entries())
      .map(([titulo, miembros]) => {
        miembros.sort((a, b) => (b.notaFinal ?? 0) - (a.notaFinal ?? 0));
        const prom = miembros.reduce((s, m) => s + (m.notaFinal ?? 0), 0) / miembros.length;
        return { titulo, miembros, prom };
      })
      .sort((a, b) => b.prom - a.prom);

    // Colores suaves alternados para distinguir un proyecto del siguiente.
    const coloresProyecto = ["FFFCE7F3", "FFEDE9FE"]; // rosa claro / lila claro
    proyectosOrdenados.forEach((g, gi) => {
      const fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: coloresProyecto[gi % coloresProyecto.length] },
      };
      for (const f of g.miembros) {
        const row = ws.addRow([f.nombre, f.rut, f.proyecto, f.notaFinal]);
        const celdaProyecto = row.getCell(3);
        celdaProyecto.fill = fill;
        celdaProyecto.font = { bold: true, color: { argb: "FFDB2777" } };
      }
    });
  }

  if (!cats.length) {
    const ws = wb.addWorksheet("Sin datos");
    ws.addRow(["No hay coevaluaciones registradas."]);
  }

  await guardar(wb, "coevaluacion_promedio_por_miembro.xlsx");
}
