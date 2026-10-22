-- =========================================================================
-- PROYECTOS INICIALES + ORDEN DE ASIGNATURAS
-- Ejecutar en Supabase > SQL Editor DESPUÉS de supabase_nuevo_proyecto.sql.
-- Se puede volver a ejecutar sin duplicar nada.
-- Fuente: planilla de proyectos por asignatura (objetivo -> descripción).
-- =========================================================================

-- 1) Orden de las asignaturas
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 99;

INSERT INTO public.categorias (nombre, orden) VALUES
('Introducción a la física', 1),
('Mecánica', 2),
('Electromagnetismo', 3),
('Física contemporánea', 4),
('Introducción a la formulación de proyectos', 5)
ON CONFLICT (nombre) DO UPDATE SET orden = EXCLUDED.orden;

-- 2) Proyectos
INSERT INTO public.proyectos (titulo, descripcion, categorias_id)
SELECT v.titulo, v.descripcion, c.id
FROM (VALUES
  -- Introducción a la física
  ('Introducción a la física', 'Nebula',
   'Diseñar y probar un prototipo a escala que utilice una cortina de agua nebulizada regulada electrónicamente para reducir el calor transferido a una superficie expuesta, midiendo la temperatura y el gasto de agua mediante sensores.'),
  ('Introducción a la física', 'Dusthield',
   'Lograr una manera en la que se pueda reducir la presencia de polvo en suspensión y mejorar la visibilidad en zonas mineras del norte de Chile mediante un sistema automatizado de aspersores activados por sensores.'),
  ('Introducción a la física', 'Protésis',
   'Diseñar y construir una prótesis robótica impresa en 3D con control analógico para evaluar su resistencia mecánica y su fuerza de agarre en la asistencia de actividades cotidianas básicas.'),
  ('Introducción a la física', 'Pico eléctrica',
   'Diseñar, construir y validar el prototipo a escala de una micro central hidroeléctrica de pasada, analizando la transformación de energía potencial gravitatoria en energía mecánica y finalmente eléctrica, para abastecer un circuito de iluminación rural.'),
  -- Mecánica
  ('Mecánica', 'Safe Wall',
   'Diseñar y construir un prototipo a escala de muro de contención mediante la integración de sensores y un sistema de control para evaluar las variables físicas que afectan la estabilidad mecánica y activar alertas tempranas ante posibles colapsos estructurales.'),
  -- Electromagnetismo
  ('Electromagnetismo', 'Bajo Terra 3.0',
   'Desarrollar un ecosistema para el control inalámbrico y lectura de los valores dados por los sensores de los sistemas climáticos estudiados.'),
  ('Electromagnetismo', 'Traga-Plast',
   'En este apartado se presentan los objetivos del proyecto, definiendo el objetivo principal y los objetivos específicos que se buscan alcanzar con el desarrollo del proyecto.'),
  -- Física contemporánea (objetivo pendiente: la planilla no lo mostraba)
  ('Física contemporánea', 'Data Ray', NULL),
  ('Física contemporánea', 'Holographix', NULL),
  -- Introducción a la formulación de proyectos (descripción pendiente)
  ('Introducción a la formulación de proyectos', 'Sismógrafo', NULL),
  ('Introducción a la formulación de proyectos', 'Hospicin', NULL),
  ('Introducción a la formulación de proyectos', 'Hidrotorre 2.0', NULL),
  ('Introducción a la formulación de proyectos', 'Bastón inteligente', NULL)
) AS v(categoria, titulo, descripcion)
JOIN public.categorias c ON c.nombre = v.categoria
WHERE NOT EXISTS (
  SELECT 1 FROM public.proyectos p
   WHERE p.titulo = v.titulo AND p.categorias_id = c.id
);

