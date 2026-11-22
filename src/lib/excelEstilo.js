// Estilo compartido de los Excel de la Feria: colores, logos, bandas de título e impresión.

export const COLOR = {
  marino: "FF0F2A3D",
  marca: "FF0B6E99",
  marcaOscura: "FF095A7E",
  suave: "FFE6F1F6",
  zebra: "FFF5F9FB",
  borde: "FFD0DBE2",
  texto: "FF1E293B",
  gris: "FF64748B",
  blanco: "FFFFFFFF",
};
export const FUENTE = "Calibri";

export const rellenar = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
export const bordeFino = {
  top: { style: "thin", color: { argb: COLOR.borde } },
  left: { style: "thin", color: { argb: COLOR.borde } },
  bottom: { style: "thin", color: { argb: COLOR.borde } },
  right: { style: "thin", color: { argb: COLOR.borde } },
};

// Verde ≥ 6 · ámbar ≥ 4 · rojo < 4 (escala 0–7)
export function estiloNota(n, alto = 6, medio = 4) {
  if (n == null) return { fill: COLOR.zebra, font: COLOR.gris };
  if (n >= alto) return { fill: "FFD1FAE5", font: "FF065F46" };
  if (n >= medio) return { fill: "FFFEF3C7", font: "FF92400E" };
  return { fill: "FFFEE2E2", font: "FF991B1B" };
}

export function bandaTitulo(ws, fila, texto, { alto, tam, color, negrita = true, cols = "J" }) {
  ws.mergeCells(`A${fila}:${cols}${fila}`);
  const c = ws.getCell(`A${fila}`);
  c.value = texto;
  c.font = { name: FUENTE, size: tam, bold: negrita, color: { argb: COLOR.blanco } };
  c.fill = rellenar(color);
  c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(fila).height = alto;
}

export function configurarImpresion(ws, filasTitulo) {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 },
    horizontalCentered: true,
    printTitlesRow: `1:${filasTitulo}`,
  };
  ws.headerFooter.oddFooter = "&L&8Feria de Ciencias 2026 · Universidad de Tarapacá&C&8Página &P de &N&R&8&D";
}

// Logos institucionales (public/logos). Si alguno no carga, el Excel se genera igual.
export const LOGOS_XLSX = [
  { archivo: "uta.png", w: 357, h: 254 },
  { archivo: "puerto-iquique.png", w: 487, h: 327 },
  { archivo: "iti.png", w: 452, h: 669 },
];
export const ALTO_LOGOS_PX = 56;
export const ALTO_FILA_LOGOS = 48; // puntos (≈ 64 px)

export async function cargarLogos(wb) {
  const base = import.meta.env?.BASE_URL ?? "/";
  const out = [];
  for (const l of LOGOS_XLSX) {
    try {
      const r = await fetch(`${base}logos/${l.archivo}`);
      if (!r.ok) continue;
      const id = wb.addImage({ buffer: await r.arrayBuffer(), extension: "png" });
      out.push({ id, ancho: Math.round((l.w / l.h) * ALTO_LOGOS_PX), alto: ALTO_LOGOS_PX });
    } catch {
      /* sin logo */
    }
  }
  return out;
}

// Fila 1 de cada hoja: franja blanca con los logos (izquierda, centro y derecha).
export function colocarLogos(ws, logos, anchosCol) {
  ws.getRow(1).height = ALTO_FILA_LOGOS;
  const px = anchosCol.map((w) => Math.round(w * 7 + 5));
  const total = px.reduce((a, b) => a + b, 0);
  // Posición exacta en EMU (9525 por píxel): una columna fraccionaria de ExcelJS
  // asume un ancho fijo y descentra los logos en columnas anchas.
  const anclaje = (x) => {
    let acc = 0;
    for (let i = 0; i < px.length; i++) {
      if (x < acc + px[i]) return { col: i, off: x - acc };
      acc += px[i];
    }
    return { col: px.length - 1, off: 0 };
  };
  const margen = 12;
  const altoFilaPx = (ALTO_FILA_LOGOS * 96) / 72;
  const colocar = [
    () => margen,
    (l) => (total - l.ancho) / 2,
    (l) => total - l.ancho - margen,
  ];
  logos.forEach((l, i) => {
    const { col, off } = anclaje(colocar[i](l));
    ws.addImage(l.id, {
      tl: {
        nativeCol: col,
        nativeColOff: Math.round(off * 9525),
        nativeRow: 0,
        nativeRowOff: Math.round(((altoFilaPx - l.alto) / 2) * 9525),
      },
      ext: { width: l.ancho, height: l.alto },
      editAs: "oneCell",
    });
  });
  for (let c = 1; c <= px.length; c++) {
    ws.getRow(1).getCell(c).fill = rellenar(COLOR.blanco);
  }
}

// Nombre de hoja válido en Excel: máx 31 chars, sin \ / ? * [ ] :
export function crearNombradorHojas() {
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

export const fechaEmision = () =>
  new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Cabecera estándar de una hoja (filas 1–5): logos, bandas de título, línea de
 * título/fecha y línea de detalle. Devuelve la primera fila libre (7).
 * Requiere al menos 5 columnas.
 */
export function encabezadoHoja(ws, { logos, anchos, subtitulo, titulo, detalle, tab = COLOR.marca }) {
  const n = anchos.length;
  const L = (i) => ws.getColumn(i).letter;
  ws.columns = anchos.map((width) => ({ width }));
  ws.properties.tabColor = { argb: tab };
  ws.views = [{ showGridLines: false, state: "frozen", ySplit: 5 }];
  colocarLogos(ws, logos, anchos);

  bandaTitulo(ws, 2, "FERIA DE CIENCIAS 2026 · UNIVERSIDAD DE TARAPACÁ", { alto: 30, tam: 15, color: COLOR.marino, cols: L(n) });
  bandaTitulo(ws, 3, subtitulo, { alto: 22, tam: 11, color: COLOR.marca, negrita: false, cols: L(n) });

  ws.mergeCells(`A4:${L(n - 2)}4`);
  const t = ws.getCell("A4");
  t.value = titulo;
  t.font = { name: FUENTE, size: 14, bold: true, color: { argb: COLOR.marcaOscura } };
  t.alignment = { vertical: "middle", indent: 1 };
  ws.mergeCells(`${L(n - 1)}4:${L(n)}4`);
  const f = ws.getCell(`${L(n - 1)}4`);
  f.value = `Emitido: ${fechaEmision()}`;
  f.font = { name: FUENTE, size: 10, color: { argb: COLOR.gris } };
  f.alignment = { vertical: "middle", horizontal: "right" };
  ws.getRow(4).height = 26;

  ws.mergeCells(`A5:${L(n)}5`);
  const d = ws.getCell("A5");
  d.value = detalle;
  d.font = { name: FUENTE, size: 10, italic: true, color: { argb: COLOR.gris } };
  d.alignment = { vertical: "middle", indent: 1 };
  d.border = { bottom: { style: "medium", color: { argb: COLOR.marca } } };
  ws.getRow(5).height = 20;
  return 7;
}

/** Fila de encabezado de columnas (fondo azul, texto blanco). `izq` = índices (1-based) alineados a la izquierda. */
export function filaCabecera(ws, fila, titulos, { izq = [2], destacada } = {}) {
  const row = ws.getRow(fila);
  titulos.forEach((t, i) => {
    const c = row.getCell(i + 1);
    c.value = t;
    c.font = { name: FUENTE, size: 10, bold: true, color: { argb: COLOR.blanco } };
    c.fill = rellenar(destacada === i + 1 ? COLOR.marino : COLOR.marca);
    const left = izq.includes(i + 1);
    c.alignment = { vertical: "middle", horizontal: left ? "left" : "center", indent: left ? 1 : 0, wrapText: true };
    c.border = bordeFino;
  });
  row.height = 32;
}

/** Nota al pie combinada en todo el ancho. */
export function notaPie(ws, fila, ncols, texto, alto = 38) {
  ws.mergeCells(`A${fila}:${ws.getColumn(ncols).letter}${fila}`);
  const c = ws.getCell(`A${fila}`);
  c.value = texto;
  c.font = { name: FUENTE, size: 9, italic: true, color: { argb: COLOR.gris } };
  c.alignment = { wrapText: true, vertical: "top", indent: 1 };
  ws.getRow(fila).height = alto;
}

/**
 * Hoja "Resumen" con tabla, enlaces a cada hoja y fila de total.
 * filas: [{ valores: [...], hoja?: nombreDeHoja }]
 * resaltar: { col, alto, medio } pinta esa columna con el semáforo de notas.
 */
export function construirResumen(ws, logos, { subtitulo, columnas, filas, total, nota, resaltar }) {
  const anchos = columnas.map((c) => c.w);
  encabezadoHoja(ws, { logos, anchos, subtitulo, titulo: "Resumen general", detalle: `${filas.length} hoja${filas.length === 1 ? "" : "s"} de detalle`, tab: COLOR.marino });
  ws.views = [{ showGridLines: false, state: "frozen", ySplit: 5 }];
  const hdr = 7;
  filaCabecera(ws, hdr, columnas.map((c) => c.t), { izq: [1] });

  filas.forEach((f, i) => {
    const row = ws.getRow(hdr + 1 + i);
    row.height = 22;
    f.valores.forEach((v, c) => {
      const cell = row.getCell(c + 1);
      cell.value = c === 0 && f.hoja ? { text: String(v), hyperlink: `#'${f.hoja}'!A1` } : v;
      cell.font = { name: FUENTE, size: 10, color: { argb: COLOR.texto } };
      cell.fill = rellenar(i % 2 === 0 ? COLOR.blanco : COLOR.zebra);
      cell.border = bordeFino;
      cell.alignment = { vertical: "middle", horizontal: c === 0 ? "left" : "center", indent: c === 0 ? 1 : 0 };
      if (typeof v === "number" && !Number.isInteger(v)) cell.numFmt = "0.00";
    });
    if (f.hoja) row.getCell(1).font = { name: FUENTE, size: 10, underline: true, color: { argb: COLOR.marcaOscura } };
    if (resaltar) {
      const cell = row.getCell(resaltar.col);
      const e = estiloNota(typeof cell.value === "number" ? cell.value : null, resaltar.alto, resaltar.medio);
      cell.fill = rellenar(e.fill);
      cell.font = { name: FUENTE, size: 11, bold: true, color: { argb: e.font } };
    }
  });

  const rt = hdr + 1 + filas.length;
  const rowT = ws.getRow(rt);
  rowT.height = 24;
  total.forEach((v, c) => {
    const cell = rowT.getCell(c + 1);
    cell.value = v;
    cell.font = { name: FUENTE, size: 11, bold: true, color: { argb: COLOR.blanco } };
    cell.fill = rellenar(COLOR.marino);
    cell.alignment = { vertical: "middle", horizontal: c === 0 ? "left" : "center", indent: c === 0 ? 1 : 0 };
  });
  notaPie(ws, rt + 2, columnas.length, nota, 36);
  ws.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, printTitlesRow: "1:5" };
  ws.headerFooter.oddFooter = "&L&8Feria de Ciencias 2026 · Universidad de Tarapacá&C&8Página &P de &N&R&8&D";
}
