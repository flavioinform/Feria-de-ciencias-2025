// src/lib/exportExcel.js
// Exportaciones a Excel (.xlsx) con una hoja por categoría.
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { fetchAllRows } from "./supabase";
import {
  COLOR, FUENTE, rellenar, bordeFino, estiloNota, bandaTitulo, configurarImpresion,
  cargarLogos, colocarLogos, crearNombradorHojas,
  encabezadoHoja, filaCabecera, notaPie, construirResumen,
} from "./excelEstilo";

const round2 = (n) => Math.round(n * 100) / 100;


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
 * Exporta las evaluaciones de PÚBLICO (escala 1–4) en un Excel de presentación.
 * Hoja "Resumen" + una hoja por categoría con el ranking de proyectos.
 * Se excluyen los jurados (RUT que empieza con "JUR"). Los proyectos sin votos
 * aparecen al final como "Sin votos".
 */
export async function exportarPublicoPorCategoria() {
  const [evals, proyectos, categorias] = await Promise.all([
    fetchAllRows("evaluaciones", "proyecto_id, nota_final, usuarios(rut)"),
    fetchAllRows("proyectos", "id, titulo, stand_num, categorias_id"),
    fetchAllRows("categorias", "id, nombre, orden"),
  ]);

  const esJurado = (r) => (r.usuarios?.rut || "").toUpperCase().startsWith("JUR");
  const porProy = new Map();
  for (const e of evals) {
    if (esJurado(e) || e.nota_final == null) continue;
    const k = String(e.proyecto_id);
    const o = porProy.get(k) || { suma: 0, n: 0 };
    o.suma += Number(e.nota_final);
    o.n += 1;
    porProy.set(k, o);
  }

  const cmp = (a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" });
  const ordenadas = [...categorias].sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99) || cmp(a.nombre, b.nombre));
  const datos = [];
  for (const cat of ordenadas) {
    const filas = proyectos
      .filter((p) => String(p.categorias_id) === String(cat.id))
      .map((p) => {
        const o = porProy.get(String(p.id));
        return { titulo: p.titulo, stand: p.stand_num, n: o ? o.n : 0, promedio: o ? o.suma / o.n : null };
      })
      .sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1) || cmp(a.titulo, b.titulo));
    if (filas.length) datos.push({ nombre: cat.nombre, filas });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Feria de Ciencias 2026";
  wb.created = new Date();
  const logos = await cargarLogos(wb);
  const nombreHoja = crearNombradorHojas();

  if (!datos.length) {
    wb.addWorksheet("Sin datos").getCell("A1").value = "No hay proyectos registrados.";
    await guardar(wb, "evaluaciones_publico.xlsx");
    return;
  }

  const resumen = wb.addWorksheet(nombreHoja("Resumen"));
  const filasResumen = [];
  const MEDALLAS = ["FFFDE68A", "FFE5E7EB", "FFFED7AA"]; // oro, plata, bronce

  for (const cat of datos) {
    const hoja = nombreHoja(cat.nombre);
    const ws = wb.addWorksheet(hoja);
    const conVotos = cat.filas.filter((f) => f.promedio != null);
    const votos = cat.filas.reduce((s, f) => s + f.n, 0);
    const promCat = conVotos.length ? round2(conVotos.reduce((s, f) => s + f.promedio, 0) / conVotos.length) : null;

    encabezadoHoja(ws, {
      logos,
      anchos: [11, 54, 11, 16, 18],
      subtitulo: "Evaluaciones del público · Ranking de proyectos",
      titulo: `Categoría: ${cat.nombre}`,
      detalle: `${cat.filas.length} proyecto${cat.filas.length === 1 ? "" : "s"}  ·  ${votos} voto${votos === 1 ? "" : "s"}  ·  Promedio de la categoría: ${promCat == null ? "—" : promCat.toFixed(2)}`,
    });

    filaCabecera(ws, 7, ["Posición", "Proyecto", "Stand", "N° de evaluaciones", "PROMEDIO PÚBLICO"], { destacada: 5 });
    let pos = 0;
    let anterior = null;
    cat.filas.forEach((f, i) => {
      const r = 8 + i;
      const row = ws.getRow(r);
      row.height = 22;
      const base = i % 2 === 0 ? COLOR.blanco : COLOR.zebra;
      let posicion = "—";
      if (f.promedio != null) {
        const p2 = round2(f.promedio);
        if (p2 !== anterior) pos = i + 1;
        anterior = p2;
        posicion = pos;
      }
      row.getCell(1).value = posicion;
      row.getCell(2).value = f.titulo;
      row.getCell(3).value = f.stand ?? "—";
      row.getCell(4).value = f.n;
      row.getCell(5).value = f.promedio == null ? "Sin votos" : round2(f.promedio);
      for (let c = 1; c <= 5; c++) {
        const cell = row.getCell(c);
        cell.font = { name: FUENTE, size: 10, color: { argb: COLOR.texto } };
        cell.fill = rellenar(base);
        cell.border = bordeFino;
        cell.alignment = { vertical: "middle", horizontal: c === 2 ? "left" : "center", indent: c === 2 ? 1 : 0 };
      }
      if (typeof posicion === "number" && posicion <= 3) {
        const c = row.getCell(1);
        c.fill = rellenar(MEDALLAS[posicion - 1]);
        c.font = { name: FUENTE, size: 12, bold: true, color: { argb: COLOR.marino } };
      }
      const e = estiloNota(f.promedio, 3, 2);
      const cf = row.getCell(5);
      cf.fill = rellenar(e.fill);
      cf.font = { name: FUENTE, size: 12, bold: true, color: { argb: e.font } };
      cf.numFmt = "0.00";
    });
    notaPie(
      ws, 8 + cat.filas.length + 1, 5,
      "Escala del público: 1 a 4. El promedio corresponde a la nota final de cada evaluación emitida por visitantes (no incluye jurados). Color: verde ≥ 3,0 · amarillo ≥ 2,0 · rojo < 2,0. Los empates comparten posición."
    );
    configurarImpresion(ws, 5);
    filasResumen.push({
      hoja, nombre: cat.nombre, proyectos: cat.filas.length, conVotos: conVotos.length, votos,
      promedio: promCat, lider: conVotos.length ? conVotos[0].titulo : "—",
    });
  }

  const suma = (k) => filasResumen.reduce((s, f) => s + f[k], 0);
  construirResumen(resumen, logos, {
    subtitulo: "Evaluaciones del público · Resumen por categoría",
    columnas: [
      { t: "Categoría", w: 40 }, { t: "Proyectos", w: 12 }, { t: "Con votos", w: 12 },
      { t: "Evaluaciones", w: 14 }, { t: "Promedio categoría", w: 18 }, { t: "Proyecto mejor evaluado", w: 40 },
    ],
    filas: filasResumen.map((f) => ({ hoja: f.hoja, valores: [f.nombre, f.proyectos, f.conVotos, f.votos, f.promedio ?? "—", f.lider] })),
    total: ["TOTAL", suma("proyectos"), suma("conVotos"), suma("votos"), "", ""],
    nota: "Escala del público: 1 a 4. Haz clic en el nombre de una categoría para ir a su hoja.",
    resaltar: { col: 5, alto: 3, medio: 2 },
  });

  await guardar(wb, `evaluaciones_publico_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta "¿Por quién vinieron?": Resumen + una hoja por categoría con cada
 * grupo (proyecto), los estudiantes que invitaron y sus visitantes.
 * categorias: [{ nombre, total, proyectos: [{ titulo, total, participantes: [{ nombre, rut, total, visitantes: [{nombre, rut}] }] }] }]
 * otros: [{ key, total, visitantes: [{nombre, rut}] }]  (sin estudiante identificado)
 */
export async function exportarPorQuienVino(categorias, otros) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Feria de Ciencias 2026";
  wb.created = new Date();
  const logos = await cargarLogos(wb);
  const nombreHoja = crearNombradorHojas();
  const resumen = wb.addWorksheet(nombreHoja("Resumen"));
  const filasResumen = [];
  const ANCHOS = [8, 48, 16, 16, 16];

  const celdasFila = (row, base, { izq = [2] } = {}) => {
    row.height = 21;
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = { name: FUENTE, size: 10, color: { argb: COLOR.texto } };
      cell.fill = rellenar(base);
      cell.border = bordeFino;
      cell.alignment = { vertical: "middle", horizontal: izq.includes(c) ? "left" : "center", indent: izq.includes(c) ? 1 : 0 };
    }
  };

  const bandaGrupo = (ws, fila, texto, total) => {
    ws.mergeCells(`A${fila}:C${fila}`);
    const g = ws.getCell(`A${fila}`);
    g.value = texto;
    g.font = { name: FUENTE, size: 12, bold: true, color: { argb: COLOR.marcaOscura } };
    g.alignment = { vertical: "middle", indent: 1, wrapText: true };
    ws.mergeCells(`D${fila}:E${fila}`);
    const t = ws.getCell(`D${fila}`);
    t.value = `${total} visitante${total === 1 ? "" : "s"}`;
    t.font = { name: FUENTE, size: 11, bold: true, color: { argb: COLOR.marino } };
    t.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    ws.getRow(fila).height = 26;
    for (let c = 1; c <= 5; c++) {
      const cell = ws.getRow(fila).getCell(c);
      cell.fill = rellenar(COLOR.suave);
      cell.border = { top: { style: "medium", color: { argb: COLOR.marca } } };
    }
  };

  for (const cat of categorias) {
    const hoja = nombreHoja(cat.nombre);
    const ws = wb.addWorksheet(hoja);
    const estudiantes = cat.proyectos.reduce((s, p) => s + p.participantes.length, 0);
    encabezadoHoja(ws, {
      logos, anchos: ANCHOS,
      subtitulo: "¿Por quién vinieron? · Visitantes por grupo y estudiante",
      titulo: `Categoría: ${cat.nombre}`,
      detalle: `${cat.proyectos.length} grupo${cat.proyectos.length === 1 ? "" : "s"}  ·  ${estudiantes} estudiante${estudiantes === 1 ? "" : "s"} con invitados  ·  ${cat.total} visitante${cat.total === 1 ? "" : "s"} en total`,
    });

    let fila = 7;
    cat.proyectos.forEach((proy, gi) => {
      bandaGrupo(ws, fila, `GRUPO ${gi + 1}  ·  ${proy.titulo}`, proy.total);
      filaCabecera(ws, fila + 1, ["N°", "Nombre", "RUT", "Rol", "Visitantes"], { destacada: 5 });
      fila += 2;
      for (const pt of proy.participantes) {
        const rp = ws.getRow(fila);
        rp.getCell(1).value = "";
        rp.getCell(2).value = pt.nombre;
        rp.getCell(3).value = pt.rut || "—";
        rp.getCell(4).value = "Estudiante";
        rp.getCell(5).value = pt.total;
        celdasFila(rp, COLOR.suave);
        for (let c = 1; c <= 5; c++) rp.getCell(c).font = { name: FUENTE, size: 10, bold: true, color: { argb: COLOR.marcaOscura } };
        fila += 1;
        pt.visitantes.forEach((v, vi) => {
          const rv = ws.getRow(fila);
          rv.getCell(1).value = vi + 1;
          rv.getCell(2).value = v.nombre;
          rv.getCell(3).value = v.rut || "—";
          rv.getCell(4).value = "Visitante";
          rv.getCell(5).value = "";
          celdasFila(rv, vi % 2 === 0 ? COLOR.blanco : COLOR.zebra);
          rv.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 3 };
          fila += 1;
        });
      }
      fila += 1;
    });
    notaPie(ws, fila, 5, "Cada grupo muestra a los estudiantes que tuvieron visitantes registrados y, debajo de cada uno, a las personas que indicaron haber venido por ellos.", 28);
    configurarImpresion(ws, 5);
    filasResumen.push({ hoja, nombre: cat.nombre, grupos: cat.proyectos.length, est: estudiantes, vis: cat.total });
  }

  if (otros.length) {
    const hoja = nombreHoja("Otros - Sin especificar");
    const ws = wb.addWorksheet(hoja);
    const total = otros.reduce((s, o) => s + o.total, 0);
    encabezadoHoja(ws, {
      logos, anchos: ANCHOS,
      subtitulo: "¿Por quién vinieron? · Visitantes sin estudiante identificado",
      titulo: "Otros / Sin especificar",
      detalle: `${otros.length} referencia${otros.length === 1 ? "" : "s"}  ·  ${total} visitante${total === 1 ? "" : "s"} en total`,
      tab: COLOR.gris,
    });
    let fila = 7;
    for (const o of otros) {
      bandaGrupo(ws, fila, `VINO POR  ·  ${o.key}`, o.total);
      filaCabecera(ws, fila + 1, ["N°", "Visitante", "RUT", "Rol", ""], { destacada: 0 });
      fila += 2;
      o.visitantes.forEach((v, vi) => {
        const rv = ws.getRow(fila);
        rv.getCell(1).value = vi + 1;
        rv.getCell(2).value = v.nombre;
        rv.getCell(3).value = v.rut || "—";
        rv.getCell(4).value = "Visitante";
        rv.getCell(5).value = "";
        celdasFila(rv, vi % 2 === 0 ? COLOR.blanco : COLOR.zebra);
        fila += 1;
      });
      fila += 1;
    }
    notaPie(ws, fila, 5, "Visitantes cuyo registro no coincide con ningún estudiante inscrito.", 24);
    configurarImpresion(ws, 5);
    filasResumen.push({ hoja, nombre: "Otros / Sin especificar", grupos: otros.length, est: 0, vis: total });
  }

  const totalVis = filasResumen.reduce((s, f) => s + f.vis, 0);
  construirResumen(resumen, logos, {
    subtitulo: "¿Por quién vinieron? · Resumen por categoría",
    columnas: [
      { t: "Categoría", w: 44 }, { t: "Grupos", w: 12 }, { t: "Estudiantes con invitados", w: 20 },
      { t: "Visitantes", w: 14 }, { t: "% del total", w: 14 },
    ],
    filas: filasResumen.map((f) => ({
      hoja: f.hoja,
      valores: [f.nombre, f.grupos, f.est, f.vis, totalVis ? Math.round((f.vis / totalVis) * 1000) / 10 + "%" : "—"],
    })),
    total: ["TOTAL", filasResumen.reduce((s, f) => s + f.grupos, 0), filasResumen.reduce((s, f) => s + f.est, 0), totalVis, "100%"],
    nota: "Haz clic en el nombre de una categoría para ir a su hoja con el detalle de grupos, estudiantes y visitantes.",
  });

  await guardar(wb, `por_quien_vino_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta la COEVALUACIÓN en un Excel de presentación formal.
 *  - Hoja "Resumen" con el total por categoría (con enlaces a cada hoja).
 *  - Una hoja por categoría; dentro, un bloque por grupo (proyecto) con cada
 *    estudiante, su promedio recibido en cada criterio y su PROMEDIO FINAL.
 * El promedio final considera todas las coevaluaciones recibidas (incluida la
 * autoevaluación) y se calcula desde los 5 criterios, sin depender de una
 * columna "promedio" en la base de datos.
 */
const CRITERIOS_XLSX = [
  { key: "tiempo_actividades", titulo: "Tiempo a actividades" },
  { key: "asistencia", titulo: "Asistencia" },
  { key: "motivacion_equipo", titulo: "Motivación en equipo" },
  { key: "apoyo_informe", titulo: "Apoyo en informe" },
  { key: "presentacion", titulo: "Presentación" },
];
const COL_FINAL = 10; // J
const ULTIMA_COL = "J";


export async function exportarCoevaluacionPorMiembro() {
  const [coevs, participantes, proyectos, categorias] = await Promise.all([
    fetchAllRows(
      "coevaluaciones",
      "evaluado_id, tiempo_actividades, asistencia, motivacion_equipo, apoyo_informe, presentacion"
    ),
    fetchAllRows("participantes", "id, nombre, rut, proyecto_id"),
    fetchAllRows("proyectos", "id, titulo, stand_num, categorias_id"),
    fetchAllRows("categorias", "id, nombre, orden"),
  ]);

  // Coevaluaciones recibidas por cada participante: suma por criterio y cantidad
  const recibidas = new Map();
  for (const c of coevs) {
    const k = String(c.evaluado_id);
    const o = recibidas.get(k) || { n: 0, sumas: CRITERIOS_XLSX.map(() => 0) };
    o.n += 1;
    CRITERIOS_XLSX.forEach((cr, i) => (o.sumas[i] += Number(c[cr.key]) || 0));
    recibidas.set(k, o);
  }

  // categoría -> proyecto -> miembros
  const miembrosPorProyecto = new Map();
  for (const p of participantes) {
    const k = String(p.proyecto_id);
    if (!miembrosPorProyecto.has(k)) miembrosPorProyecto.set(k, []);
    miembrosPorProyecto.get(k).push(p);
  }

  const cmp = (a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" });
  const categoriasOrdenadas = [...categorias].sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99) || cmp(a.nombre, b.nombre));

  const datos = []; // [{ nombre, grupos: [{ titulo, stand, miembros: [...] }] }]
  for (const cat of categoriasOrdenadas) {
    const grupos = proyectos
      .filter((p) => String(p.categorias_id) === String(cat.id) && miembrosPorProyecto.has(String(p.id)))
      .sort((a, b) => cmp(a.titulo, b.titulo))
      .map((p) => ({
        titulo: p.titulo,
        stand: p.stand_num,
        miembros: miembrosPorProyecto
          .get(String(p.id))
          .sort((a, b) => cmp(a.nombre, b.nombre))
          .map((m) => {
            const o = recibidas.get(String(m.id));
            return {
              nombre: m.nombre,
              rut: m.rut,
              n: o ? o.n : 0,
              criterios: o ? o.sumas.map((s) => s / o.n) : CRITERIOS_XLSX.map(() => null),
              final: o ? round2(o.sumas.reduce((a, b) => a + b, 0) / (o.n * CRITERIOS_XLSX.length)) : null,
            };
          }),
      }));
    if (grupos.length) datos.push({ nombre: cat.nombre, grupos });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Feria de Ciencias 2026";
  wb.created = new Date();
  const logos = await cargarLogos(wb);
  const nombreHoja = crearNombradorHojas();
  const fecha = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  const promedioDe = (arr) => {
    const v = arr.filter((x) => x != null);
    return v.length ? round2(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };

  if (!datos.length) {
    const ws = wb.addWorksheet("Sin datos");
    ws.getCell("A1").value = "No hay participantes ni coevaluaciones registradas.";
    await guardar(wb, "coevaluacion_promedio_por_miembro.xlsx");
    return;
  }

  // Hoja de resumen primero (se rellena al final con los totales)
  const resumen = wb.addWorksheet(nombreHoja("Resumen"), { views: [{ showGridLines: false }] });
  const filasResumen = [];

  for (const cat of datos) {
    const hoja = nombreHoja(cat.nombre);
    const ws = wb.addWorksheet(hoja, {
      views: [{ showGridLines: false, state: "frozen", ySplit: 5 }],
      properties: { tabColor: { argb: COLOR.marca } },
    });
    const anchos = [6, 38, 15, ...CRITERIOS_XLSX.map(() => 14), 14, 16];
    ws.columns = anchos.map((width) => ({ width }));
    colocarLogos(ws, logos, anchos);

    const totalEstudiantes = cat.grupos.reduce((s, g) => s + g.miembros.length, 0);
    const conNota = cat.grupos.flatMap((g) => g.miembros).filter((m) => m.final != null);
    const promCat = promedioDe(conNota.map((m) => m.final));

    bandaTitulo(ws, 2, "FERIA DE CIENCIAS 2026 · UNIVERSIDAD DE TARAPACÁ", { alto: 30, tam: 15, color: COLOR.marino });
    bandaTitulo(ws, 3, "Coevaluación entre integrantes · Promedio final por estudiante", {
      alto: 22, tam: 11, color: COLOR.marca, negrita: false,
    });
    ws.mergeCells("A4:G4");
    ws.getCell("A4").value = `Categoría: ${cat.nombre}`;
    ws.getCell("A4").font = { name: FUENTE, size: 14, bold: true, color: { argb: COLOR.marcaOscura } };
    ws.getCell("A4").alignment = { vertical: "middle", indent: 1 };
    ws.mergeCells("H4:J4");
    ws.getCell("H4").value = `Emitido: ${fecha}`;
    ws.getCell("H4").font = { name: FUENTE, size: 10, color: { argb: COLOR.gris } };
    ws.getCell("H4").alignment = { vertical: "middle", horizontal: "right" };
    ws.getRow(4).height = 26;
    ws.mergeCells("A5:J5");
    ws.getCell("A5").value =
      `${cat.grupos.length} grupo${cat.grupos.length === 1 ? "" : "s"}  ·  ${totalEstudiantes} estudiante${totalEstudiantes === 1 ? "" : "s"}  ·  Promedio de la categoría: ${promCat == null ? "—" : promCat.toFixed(2)}`;
    ws.getCell("A5").font = { name: FUENTE, size: 10, italic: true, color: { argb: COLOR.gris } };
    ws.getCell("A5").alignment = { vertical: "middle", indent: 1 };
    ws.getCell("A5").border = { bottom: { style: "medium", color: { argb: COLOR.marca } } };
    ws.getRow(5).height = 20;

    let fila = 7;
    cat.grupos.forEach((g, gi) => {
      // ── Encabezado del grupo ──
      const filaGrupo = fila;
      ws.mergeCells(`A${filaGrupo}:H${filaGrupo}`);
      const cg = ws.getCell(`A${filaGrupo}`);
      cg.value = `GRUPO ${gi + 1}  ·  ${g.titulo}${g.stand ? `  (Stand ${g.stand})` : ""}`;
      cg.font = { name: FUENTE, size: 12, bold: true, color: { argb: COLOR.marcaOscura } };
      cg.alignment = { vertical: "middle", indent: 1, wrapText: true };
      ws.mergeCells(`I${filaGrupo}:J${filaGrupo}`);
      ws.getRow(filaGrupo).height = 26;
      for (let c = 1; c <= COL_FINAL; c++) {
        const cell = ws.getRow(filaGrupo).getCell(c);
        cell.fill = rellenar(COLOR.suave);
        cell.border = { top: { style: "medium", color: { argb: COLOR.marca } } };
      }

      // ── Encabezado de columnas ──
      const filaCab = filaGrupo + 1;
      const cab = ws.getRow(filaCab);
      ["N°", "Estudiante", "RUT", ...CRITERIOS_XLSX.map((c) => c.titulo), "N° de coevaluaciones", "PROMEDIO FINAL"].forEach(
        (t, i) => {
          const c = cab.getCell(i + 1);
          c.value = t;
          c.font = { name: FUENTE, size: 10, bold: true, color: { argb: COLOR.blanco } };
          c.fill = rellenar(i === COL_FINAL - 1 ? COLOR.marino : COLOR.marca);
          c.alignment = { vertical: "middle", horizontal: i === 1 ? "left" : "center", indent: i === 1 ? 1 : 0, wrapText: true };
          c.border = bordeFino;
        }
      );
      cab.height = 34;

      // ── Estudiantes ──
      const primera = filaCab + 1;
      g.miembros.forEach((m, mi) => {
        const r = primera + mi;
        const row = ws.getRow(r);
        const base = mi % 2 === 0 ? COLOR.blanco : COLOR.zebra;
        row.height = 21;
        row.getCell(1).value = mi + 1;
        row.getCell(2).value = m.nombre;
        row.getCell(3).value = m.rut || "—";
        m.criterios.forEach((v, i) => (row.getCell(4 + i).value = v == null ? "—" : v));
        row.getCell(9).value = m.n;
        row.getCell(COL_FINAL).value =
          m.final == null
            ? "Sin evaluar"
            : { formula: `ROUND(AVERAGE(D${r}:H${r}),2)`, result: m.final };

        for (let c = 1; c <= COL_FINAL; c++) {
          const cell = row.getCell(c);
          cell.font = { name: FUENTE, size: 10, color: { argb: COLOR.texto } };
          cell.fill = rellenar(base);
          cell.border = bordeFino;
          cell.alignment = { vertical: "middle", horizontal: c === 2 ? "left" : "center", indent: c === 2 ? 1 : 0 };
          if (c >= 4 && c <= 8 && typeof cell.value === "number") cell.numFmt = "0.00";
          if (c >= 4 && c <= 8 && cell.value === "—") cell.font = { name: FUENTE, size: 10, color: { argb: COLOR.gris } };
        }
        const e = estiloNota(m.final);
        const cf = row.getCell(COL_FINAL);
        cf.fill = rellenar(e.fill);
        cf.font = { name: FUENTE, size: 12, bold: true, color: { argb: e.font } };
        cf.numFmt = "0.00";
      });
      const ultima = primera + g.miembros.length - 1;

      // ── Promedio del grupo (en el encabezado del grupo) ──
      const promGrupo = promedioDe(g.miembros.map((m) => m.final));
      const cp = ws.getCell(`I${filaGrupo}`);
      cp.value =
        promGrupo == null
          ? "Promedio grupo: —"
          : { formula: `"Promedio grupo: "&TEXT(IFERROR(AVERAGE(J${primera}:J${ultima}),0),"0.00")`, result: `Promedio grupo: ${promGrupo.toFixed(2)}` };
      cp.font = { name: FUENTE, size: 11, bold: true, color: { argb: COLOR.marino } };
      cp.alignment = { vertical: "middle", horizontal: "right", indent: 1 };

      fila = ultima + 2; // una fila en blanco entre grupos
    });

    // ── Nota al pie ──
    ws.mergeCells(`A${fila}:J${fila}`);
    const nota = ws.getCell(`A${fila}`);
    nota.value =
      "Escala de evaluación: 7 Excelente · 5 Aceptable · 3 Insuficiente · 0 Nunca. El promedio final corresponde al promedio de los 5 criterios en todas las coevaluaciones recibidas por el estudiante, incluida su autoevaluación. Color: verde ≥ 6,0 · amarillo ≥ 4,0 · rojo < 4,0.";
    nota.font = { name: FUENTE, size: 9, italic: true, color: { argb: COLOR.gris } };
    nota.alignment = { wrapText: true, vertical: "top", indent: 1 };
    ws.getRow(fila).height = 38;

    configurarImpresion(ws, 5);
    filasResumen.push({
      hoja, nombre: cat.nombre, grupos: cat.grupos.length,
      estudiantes: totalEstudiantes, evaluados: conNota.length, promedio: promCat,
    });
  }

  // ── Hoja de resumen ──
  resumen.properties.tabColor = { argb: COLOR.marino };
  const anchosRes = [46, 12, 14, 14, 18];
  resumen.columns = anchosRes.map((width) => ({ width }));
  colocarLogos(resumen, logos, anchosRes);
  const U = "E";
  bandaTitulo(resumen, 2, "FERIA DE CIENCIAS 2026 · UNIVERSIDAD DE TARAPACÁ", { alto: 30, tam: 15, color: COLOR.marino, cols: U });
  bandaTitulo(resumen, 3, "Resumen de coevaluaciones por categoría", { alto: 22, tam: 11, color: COLOR.marca, negrita: false, cols: U });
  resumen.mergeCells("A4:E4");
  resumen.getCell("A4").value = `Emitido: ${fecha}`;
  resumen.getCell("A4").font = { name: FUENTE, size: 10, color: { argb: COLOR.gris } };
  resumen.getCell("A4").alignment = { vertical: "middle", indent: 1 };
  resumen.getRow(4).height = 22;

  const cabR = resumen.getRow(6);
  ["Categoría", "Grupos", "Estudiantes", "Con nota", "Promedio categoría"].forEach((t, i) => {
    const c = cabR.getCell(i + 1);
    c.value = t;
    c.font = { name: FUENTE, size: 10, bold: true, color: { argb: COLOR.blanco } };
    c.fill = rellenar(COLOR.marca);
    c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", indent: i === 0 ? 1 : 0, wrapText: true };
    c.border = bordeFino;
  });
  cabR.height = 30;

  filasResumen.forEach((f, i) => {
    const r = 7 + i;
    const row = resumen.getRow(r);
    row.height = 22;
    row.getCell(1).value = { text: f.nombre, hyperlink: `#'${f.hoja}'!A1` };
    row.getCell(2).value = f.grupos;
    row.getCell(3).value = f.estudiantes;
    row.getCell(4).value = f.evaluados;
    row.getCell(5).value = f.promedio == null ? "—" : f.promedio;
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = { name: FUENTE, size: 10, color: { argb: COLOR.texto } };
      cell.fill = rellenar(i % 2 === 0 ? COLOR.blanco : COLOR.zebra);
      cell.border = bordeFino;
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "center", indent: c === 1 ? 1 : 0 };
    }
    row.getCell(1).font = { name: FUENTE, size: 10, underline: true, color: { argb: COLOR.marcaOscura } };
    const e = estiloNota(f.promedio);
    const cp = row.getCell(5);
    cp.fill = rellenar(e.fill);
    cp.font = { name: FUENTE, size: 11, bold: true, color: { argb: e.font } };
    cp.numFmt = "0.00";
  });

  const rt = 7 + filasResumen.length;
  const sum = (k) => filasResumen.reduce((s, f) => s + f[k], 0);
  const filaTot = resumen.getRow(rt);
  filaTot.height = 24;
  [["TOTAL", null], [sum("grupos")], [sum("estudiantes")], [sum("evaluados")], [""]].forEach((v, i) => {
    const c = filaTot.getCell(i + 1);
    c.value = i === 0 ? "TOTAL" : v[0];
    c.font = { name: FUENTE, size: 11, bold: true, color: { argb: COLOR.blanco } };
    c.fill = rellenar(COLOR.marino);
    c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", indent: i === 0 ? 1 : 0 };
  });

  resumen.mergeCells(`A${rt + 2}:E${rt + 2}`);
  const nt = resumen.getCell(`A${rt + 2}`);
  nt.value =
    "Cada hoja detalla los grupos de la categoría y el promedio final de cada estudiante (escala 0–7, incluye autoevaluación). Haz clic en el nombre de una categoría para ir a su hoja.";
  nt.font = { name: FUENTE, size: 9, italic: true, color: { argb: COLOR.gris } };
  nt.alignment = { wrapText: true, vertical: "top", indent: 1 };
  resumen.getRow(rt + 2).height = 36;
  resumen.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true };

  await guardar(wb, `coevaluacion_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Reporte de completitud de proyectos (imagen, descripción, integrantes).
// `filas`: [{ titulo, asignatura, tieneImagen, tieneDescripcion, integrantes: [{nombre, correo}] }]
export async function exportarReporteProyectos(filas) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Proyectos");
  ws.columns = [
    { header: "Proyecto", key: "titulo", width: 38 },
    { header: "Asignatura", key: "asignatura", width: 38 },
    { header: "Imagen", key: "imagen", width: 10 },
    { header: "Descripción", key: "descripcion", width: 14 },
    { header: "N° integrantes", key: "n", width: 14 },
    { header: "Integrantes", key: "integrantes", width: 60 },
  ];
  for (const f of filas) {
    ws.addRow({
      titulo: f.titulo,
      asignatura: f.asignatura,
      imagen: f.tieneImagen ? "Sí" : "FALTA",
      descripcion: f.tieneDescripcion ? "Sí" : "FALTA",
      n: f.integrantes.length,
      integrantes: f.integrantes.map((i) => i.nombre).join(", ") || "Sin integrantes",
    });
  }
  estilizarEncabezado(ws);
  await guardar(wb, "reporte-proyectos.xlsx");
}
