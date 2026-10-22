// Promedio recortado: con 5 o más notas descarta el 10% más bajo y el 10% más
// alto (mínimo 1 de cada lado), para que unas pocas notas extremas o infladas
// no muevan el resultado. Con menos de 5 notas es el promedio simple.
export function promedioRecortado(notas, recorte = 0.1) {
  const validas = notas.filter((n) => typeof n === "number" && !isNaN(n));
  if (validas.length === 0) return 0;
  if (validas.length < 5) {
    return validas.reduce((a, b) => a + b, 0) / validas.length;
  }
  const ordenadas = [...validas].sort((a, b) => a - b);
  const k = Math.max(1, Math.floor(ordenadas.length * recorte));
  const centro = ordenadas.slice(k, ordenadas.length - k);
  return centro.reduce((a, b) => a + b, 0) / centro.length;
}
