// Plan de asignación de proyectos para los 5 jurados de la feria.
// 20 proyectos = 5 jurados x 4 proyectos, sin repetir ninguno.
//
// Los 4 jurados "normales" reciben proyectos de asignaturas variadas.
// El jurado inclusivo (con discapacidad visual) recibe proyectos que se
// pueden evaluar sin depender de lo que se ve en pantalla o con luces:
// objetos físicos que se tocan, se escuchan o se manipulan.
// El admin puede cambiar cualquier asignación desde Jurados.

export const PLAN_JURADOS = [
  { nombre: "Jurado 1", proyectos: [2, 24, 14, 15] },
  { nombre: "Jurado 2", proyectos: [3, 6, 16, 17] },
  { nombre: "Jurado 3", proyectos: [8, 25, 1, 19] },
  { nombre: "Jurado 4", proyectos: [26, 4, 20, 21] },
  {
    nombre: "Jurado 5 (inclusivo)",
    inclusivo: true,
    proyectos: [18, 9, 5, 7],
  },
];

// Por qué cada proyecto es accesible para una persona ciega.
export const MOTIVO_INCLUSIVO = {
  18: "Ultrakit es un bastón blanco para personas ciegas: es lo más cercano a su experiencia y se puede tocar y probar.",
  9: "A.R.M.A. es una mano robótica: se puede tocar y mover con las perillas, y se evalúa por el agarre y el movimiento de los dedos.",
  5: "Safe Wall es un prototipo físico de muro con sensores y alertas tempranas: se puede tocar y la alerta puede ser sonora.",
  7: "Traga-Plast tiene una banda transportadora mecánica: se explica por funcionamiento y sonido, sin depender de una pantalla.",
};
