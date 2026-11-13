-- Asignación de proyectos a jurados.
-- Ejecutar UNA vez en Supabase > SQL Editor.
--
-- Cada fila = "este jurado evalúa este proyecto". El tipo de jurado_id se toma
-- de usuarios.id (uuid o lo que tengas), así no hay que adivinarlo.

DO $$
DECLARE
  tipo_usuario  text;
  tipo_proyecto text;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO tipo_usuario
    FROM pg_attribute WHERE attrelid = 'public.usuarios'::regclass AND attname = 'id';
  SELECT format_type(atttypid, atttypmod) INTO tipo_proyecto
    FROM pg_attribute WHERE attrelid = 'public.proyectos'::regclass AND attname = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.jurado_proyectos (
      jurado_id   %s NOT NULL REFERENCES public.usuarios(id)  ON DELETE CASCADE,
      proyecto_id %s NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
      created_at  timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (jurado_id, proyecto_id)
    )$f$, tipo_usuario, tipo_proyecto);
END $$;

ALTER TABLE public.jurado_proyectos ENABLE ROW LEVEL SECURITY;

-- El admin ve y modifica todo
DROP POLICY IF EXISTS jp_admin_todo ON public.jurado_proyectos;
CREATE POLICY jp_admin_todo ON public.jurado_proyectos
  FOR ALL TO authenticated
  USING      (public.jwt_role() = 'admin')
  WITH CHECK (public.jwt_role() = 'admin');

-- Cada jurado solo ve sus propias asignaciones
DROP POLICY IF EXISTS jp_jurado_lee_suyas ON public.jurado_proyectos;
CREATE POLICY jp_jurado_lee_suyas ON public.jurado_proyectos
  FOR SELECT TO authenticated
  USING (jurado_id::text = (auth.jwt() -> 'app_metadata' ->> 'usuario_id'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurado_proyectos TO authenticated;
