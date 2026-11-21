/**
 * Abre o cierra el portal de alumnos.
 * En `false`: se ocultan los accesos (menú "Iniciar sesión" y botón de la
 * portada) y TODAS las rutas /alumno/* redirigen a la portada, incluso con el
 * enlace directo o con una sesión de alumno ya abierta.
 * Durante la feria va en `false` para que los votantes no se confundan y
 * no haya alumnos dentro de la plataforma.
 */
export const PORTAL_ALUMNO_VISIBLE = true;
