-- Proyectos de "Introducción a la formulación de proyectos" (categorias_id = 14)
-- Ejecutar en Supabase > SQL Editor. Omite los que ya existan con el mismo título.
insert into public.proyectos (titulo, categorias_id)
select v.titulo, 14
from (values
  ('Dispositivo detector de Vibraciones'),
  ('Filtro Magnético'),
  ('Sistema Costero Eólico-Hídrico'),
  ('Ultrakit (El bastón blanco para ciegos)'),
  ('Energía Biofotovoltaica'),
  ('Automatizador de asistencia'),
  ('Sistema de acceso automatizado'),
  ('Maceta inteligente basada en Arduino')
) as v(titulo)
where not exists (
  select 1 from public.proyectos p where p.titulo = v.titulo
);
