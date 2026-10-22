-- =========================================================================
-- BASE DE DATOS COMPLETA Y SEGURA - Feria de Ciencias
-- Pegar entero en Supabase > SQL Editor > New query > Run
--
-- Modelo de seguridad
--   * Todo cerrado por defecto: anon/authenticated no tienen permisos salvo
--     los que se otorgan abajo, y además cada tabla tiene RLS.
--   * Identidades (todas son usuarios reales de Supabase Auth):
--       - alumnos   -> login con Google @alumnos.uta.cl (sin app_metadata.role)
--       - admin / ayudante -> también Google institucional, pero solo si su
--         correo está en la tabla `staff_google` (la administra el admin).
--       - jurado / visitante -> RUT + contraseña; los crea y los loguea la
--         Edge Function `auth-feria` (service_role); su rol vive en
--         app_metadata, que solo el servidor puede escribir.
--   * La tabla `usuarios` (contraseñas con hash) NO se puede leer ni escribir
--     desde el navegador: solo la Edge Function, vía funciones fn_*.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =========================================================================
-- TABLAS
-- =========================================================================

-- ---------- usuarios (admin / ayudantes / jurados / visitantes) ----------
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    nombre TEXT NOT NULL,
    rut TEXT NOT NULL UNIQUE,               -- normalizado: sin puntos ni guion, DV en mayúscula (jurados: JUR123456)
    role TEXT NOT NULL DEFAULT 'visitante'
        CHECK (role IN ('jurado', 'visitante')),
    viene_por_alguien BOOLEAN DEFAULT false NOT NULL,
    por_quien_vino TEXT,
    password_hash TEXT,                     -- bcrypt (crypt); NULL mientras está pendiente
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo')),
    pendiente_hasta TIMESTAMPTZ,            -- ventana para definir la contraseña por primera vez
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta TIMESTAMPTZ,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ---------- categorias ----------
CREATE TABLE IF NOT EXISTS public.categorias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    nombre TEXT NOT NULL UNIQUE,
    orden INTEGER NOT NULL DEFAULT 99      -- orden en que se muestran las asignaturas
);

-- ---------- proyectos ----------
CREATE TABLE IF NOT EXISTS public.proyectos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    stand_num INTEGER,
    image TEXT,
    participantes TEXT,
    categorias_id BIGINT NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE
);

-- ---------- participantes (alumnos) ----------
CREATE TABLE IF NOT EXISTS public.participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    nombre TEXT NOT NULL,
    rut TEXT NOT NULL UNIQUE,               -- formato 12.345.678-9
    proyecto_id BIGINT NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS participantes_auth_user_id_key
    ON public.participantes(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS participantes_proyecto_idx ON public.participantes(proyecto_id);

-- ---------- rubricas / criterios ----------
CREATE TABLE IF NOT EXISTS public.rubricas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.criterios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    nombre TEXT NOT NULL,
    peso NUMERIC DEFAULT 1.0 NOT NULL,
    orden INTEGER DEFAULT 0 NOT NULL,
    rubrica_id BIGINT NOT NULL REFERENCES public.rubricas(id) ON DELETE CASCADE
);

-- ---------- evaluaciones (jurados / visitantes) ----------
CREATE TABLE IF NOT EXISTS public.evaluaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    proyecto_id BIGINT NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    visitante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nota_final NUMERIC NOT NULL CHECK (nota_final BETWEEN 1 AND 7),
    observacion_general TEXT,
    detalle_criterios JSONB,
    CONSTRAINT unica_evaluacion_por_visitante_proyecto UNIQUE (proyecto_id, visitante_id)
);

CREATE TABLE IF NOT EXISTS public.evaluacion_detalle (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
    criterio_id BIGINT NOT NULL REFERENCES public.criterios(id) ON DELETE CASCADE,
    puntaje INTEGER NOT NULL CHECK (puntaje BETWEEN 1 AND 4),
    comentario TEXT,
    CONSTRAINT unico_detalle_por_criterio UNIQUE (evaluacion_id, criterio_id)
);

-- ---------- coevaluaciones (alumno evalúa a su equipo, incluido él mismo) ----------
CREATE TABLE IF NOT EXISTS public.coevaluaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    proyecto_id BIGINT NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    evaluador_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
    evaluado_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
    tiempo_actividades INTEGER NOT NULL CHECK (tiempo_actividades IN (0,3,5,7)),
    asistencia INTEGER NOT NULL CHECK (asistencia IN (0,3,5,7)),
    motivacion_equipo INTEGER NOT NULL CHECK (motivacion_equipo IN (0,3,5,7)),
    apoyo_informe INTEGER NOT NULL CHECK (apoyo_informe IN (0,3,5,7)),
    presentacion INTEGER NOT NULL CHECK (presentacion IN (0,3,5,7)),
    CONSTRAINT coevaluaciones_unica UNIQUE (proyecto_id, evaluador_id, evaluado_id)
);

-- ---------- configuracion_feria ----------
CREATE TABLE IF NOT EXISTS public.configuracion_feria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    coevaluaciones_activas BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO public.configuracion_feria (coevaluaciones_activas)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_feria);


-- ---------- staff_google: correos institucionales autorizados como admin/ayudante ----------
CREATE TABLE IF NOT EXISTS public.staff_google (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
    nombre TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'ayudante'))
);


-- =========================================================================
-- DENEGAR POR DEFECTO
-- =========================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;


-- =========================================================================
-- FUNCIONES AUXILIARES (leen el rol desde el JWT, no desde el cliente)
-- =========================================================================
-- Rol de la sesión actual:
--   - jurado / visitante: viene en app_metadata (lo escribe solo el servidor)
--   - admin / ayudante: el correo de la cuenta de Google debe estar en
--     staff_google. Se exige provider = 'google' para que nadie pueda
--     hacerse pasar por un correo autorizado registrándose con email+clave.
CREATE OR REPLACE FUNCTION public.jwt_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        (SELECT s.role FROM public.staff_google s
          WHERE s.email = lower(coalesce(auth.jwt() ->> 'email', ''))
            AND auth.jwt() -> 'app_metadata' ->> 'provider' = 'google'
          LIMIT 1)
    )
$$;

CREATE OR REPLACE FUNCTION public.jwt_usuario_id() RETURNS UUID
LANGUAGE sql STABLE AS $$ SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'usuario_id', '')::uuid $$;

CREATE OR REPLACE FUNCTION public.es_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$ SELECT COALESCE(public.jwt_role() = 'admin', false) $$;

CREATE OR REPLACE FUNCTION public.es_staff() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$ SELECT COALESCE(public.jwt_role() IN ('admin', 'ayudante'), false) $$;

-- Participante (alumno) vinculado a la sesión de Google actual
CREATE OR REPLACE FUNCTION public.mi_participante_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM public.participantes WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.mi_proyecto_id() RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT proyecto_id FROM public.participantes WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.participante_en_proyecto(p_participante UUID, p_proyecto BIGINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.participantes WHERE id = p_participante AND proyecto_id = p_proyecto)
$$;

-- ¿El usuario de la sesión (jurado/visitante) es un participante de ese proyecto?
-- Compara su RUT con el de los alumnos del proyecto: evita autoevaluarse.
CREATE OR REPLACE FUNCTION public.es_participante_de(p_proyecto BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.participantes pa
        JOIN public.usuarios u
          ON u.rut = upper(regexp_replace(pa.rut, '[.\-]', '', 'g'))
        WHERE u.id = public.jwt_usuario_id()
          AND pa.proyecto_id = p_proyecto
    )
$$;

CREATE OR REPLACE FUNCTION public.coevaluaciones_abiertas() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE((SELECT coevaluaciones_activas FROM public.configuracion_feria ORDER BY id LIMIT 1), false)
$$;


-- =========================================================================
-- RLS + PERMISOS POR TABLA
-- =========================================================================

-- ---------- usuarios: solo el staff lee (sin password_hash); nadie escribe desde el cliente ----------
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
GRANT SELECT (id, created_at, nombre, rut, role, viene_por_alguien, por_quien_vino, estado, pendiente_hasta)
    ON public.usuarios TO authenticated;
DROP POLICY IF EXISTS "usuarios_select_staff" ON public.usuarios;
CREATE POLICY "usuarios_select_staff" ON public.usuarios
    FOR SELECT TO authenticated USING (public.es_staff());

-- ---------- categorias / rubricas / criterios: lectura pública, escritura admin ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categorias', 'rubricas', 'criterios'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "lectura_publica" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "escritura_admin" ON public.%I', t);
    EXECUTE format('CREATE POLICY "lectura_publica" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "escritura_admin" ON public.%I FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin())', t);
  END LOOP;
END $$;

-- ---------- proyectos ----------
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.proyectos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.proyectos TO authenticated;
DROP POLICY IF EXISTS "proyectos_lectura" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_admin" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_alumno_update" ON public.proyectos;
CREATE POLICY "proyectos_lectura" ON public.proyectos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "proyectos_admin" ON public.proyectos FOR ALL TO authenticated
    USING (public.es_admin()) WITH CHECK (public.es_admin());
CREATE POLICY "proyectos_alumno_update" ON public.proyectos FOR UPDATE TO authenticated
    USING (id = public.mi_proyecto_id()) WITH CHECK (id = public.mi_proyecto_id());

-- Un alumno solo puede cambiar imagen y descripción de su proyecto
CREATE OR REPLACE FUNCTION public.trg_proyectos_alumno() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF auth.role() IS DISTINCT FROM 'authenticated' OR public.es_admin() THEN
        RETURN NEW;
    END IF;
    IF (NEW.titulo, NEW.stand_num, NEW.categorias_id, NEW.participantes)
       IS DISTINCT FROM (OLD.titulo, OLD.stand_num, OLD.categorias_id, OLD.participantes) THEN
        RAISE EXCEPTION 'Solo puedes editar la imagen y la descripción de tu proyecto';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proyectos_alumno_restringido ON public.proyectos;
CREATE TRIGGER proyectos_alumno_restringido BEFORE UPDATE ON public.proyectos
    FOR EACH ROW EXECUTE FUNCTION public.trg_proyectos_alumno();

-- ---------- participantes ----------
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participantes TO authenticated;
DROP POLICY IF EXISTS "participantes_select" ON public.participantes;
DROP POLICY IF EXISTS "participantes_admin" ON public.participantes;
CREATE POLICY "participantes_select" ON public.participantes FOR SELECT TO authenticated
    USING (
        public.es_staff()
        OR auth_user_id = auth.uid()
        OR proyecto_id = public.mi_proyecto_id()
    );
CREATE POLICY "participantes_admin" ON public.participantes FOR ALL TO authenticated
    USING (public.es_admin()) WITH CHECK (public.es_admin());

-- ---------- evaluaciones ----------
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.evaluaciones TO authenticated;
DROP POLICY IF EXISTS "eval_select" ON public.evaluaciones;
DROP POLICY IF EXISTS "eval_insert" ON public.evaluaciones;
DROP POLICY IF EXISTS "eval_delete" ON public.evaluaciones;
CREATE POLICY "eval_select" ON public.evaluaciones FOR SELECT TO authenticated
    USING (public.es_admin() OR visitante_id = public.jwt_usuario_id());
CREATE POLICY "eval_insert" ON public.evaluaciones FOR INSERT TO authenticated
    WITH CHECK (
        public.jwt_role() IN ('jurado', 'visitante')
        AND visitante_id = public.jwt_usuario_id()
        AND (public.jwt_role() = 'jurado' OR nota_final <= 4)      -- visitantes evalúan en escala 1-4
        AND NOT public.es_participante_de(proyecto_id)             -- no autoevaluarse
    );
CREATE POLICY "eval_delete" ON public.evaluaciones FOR DELETE TO authenticated
    USING (public.es_admin());

-- Tope de evaluaciones por visitante (frena que una cuenta infle notas)
CREATE OR REPLACE FUNCTION public.trg_eval_tope() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.usuarios WHERE id = NEW.visitante_id;
    IF v_role = 'visitante'
       AND (SELECT count(*) FROM public.evaluaciones WHERE visitante_id = NEW.visitante_id) >= 15 THEN
        RAISE EXCEPTION 'Alcanzaste el máximo de 15 evaluaciones';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS evaluaciones_tope ON public.evaluaciones;
CREATE TRIGGER evaluaciones_tope BEFORE INSERT ON public.evaluaciones
    FOR EACH ROW EXECUTE FUNCTION public.trg_eval_tope();

-- ---------- evaluacion_detalle ----------
ALTER TABLE public.evaluacion_detalle ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.evaluacion_detalle TO authenticated;
DROP POLICY IF EXISTS "det_select" ON public.evaluacion_detalle;
DROP POLICY IF EXISTS "det_insert" ON public.evaluacion_detalle;
DROP POLICY IF EXISTS "det_delete" ON public.evaluacion_detalle;
CREATE POLICY "det_select" ON public.evaluacion_detalle FOR SELECT TO authenticated
    USING (public.es_admin() OR EXISTS (
        SELECT 1 FROM public.evaluaciones e
        WHERE e.id = evaluacion_id AND e.visitante_id = public.jwt_usuario_id()));
CREATE POLICY "det_insert" ON public.evaluacion_detalle FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.evaluaciones e
        WHERE e.id = evaluacion_id AND e.visitante_id = public.jwt_usuario_id()));
CREATE POLICY "det_delete" ON public.evaluacion_detalle FOR DELETE TO authenticated
    USING (public.es_admin());

-- ---------- coevaluaciones ----------
ALTER TABLE public.coevaluaciones ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coevaluaciones TO authenticated;
DROP POLICY IF EXISTS "coev_select" ON public.coevaluaciones;
DROP POLICY IF EXISTS "coev_insert" ON public.coevaluaciones;
DROP POLICY IF EXISTS "coev_update" ON public.coevaluaciones;
DROP POLICY IF EXISTS "coev_delete" ON public.coevaluaciones;
CREATE POLICY "coev_select" ON public.coevaluaciones FOR SELECT TO authenticated
    USING (public.es_admin() OR evaluador_id = public.mi_participante_id());
CREATE POLICY "coev_insert" ON public.coevaluaciones FOR INSERT TO authenticated
    WITH CHECK (
        evaluador_id = public.mi_participante_id()
        AND proyecto_id = public.mi_proyecto_id()
        AND public.participante_en_proyecto(evaluado_id, proyecto_id)
        AND public.coevaluaciones_abiertas()
    );
CREATE POLICY "coev_update" ON public.coevaluaciones FOR UPDATE TO authenticated
    USING (evaluador_id = public.mi_participante_id())
    WITH CHECK (
        evaluador_id = public.mi_participante_id()
        AND proyecto_id = public.mi_proyecto_id()
        AND public.participante_en_proyecto(evaluado_id, proyecto_id)
        AND public.coevaluaciones_abiertas()
    );
CREATE POLICY "coev_delete" ON public.coevaluaciones FOR DELETE TO authenticated
    USING (public.es_admin());

-- ---------- configuracion_feria ----------
ALTER TABLE public.configuracion_feria ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.configuracion_feria TO anon, authenticated;
GRANT INSERT, UPDATE ON public.configuracion_feria TO authenticated;
DROP POLICY IF EXISTS "config_lectura" ON public.configuracion_feria;
DROP POLICY IF EXISTS "config_admin" ON public.configuracion_feria;
CREATE POLICY "config_lectura" ON public.configuracion_feria FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "config_admin" ON public.configuracion_feria FOR ALL TO authenticated
    USING (public.es_admin()) WITH CHECK (public.es_admin());


-- ---------- staff_google: solo el admin ve y edita la lista ----------
ALTER TABLE public.staff_google ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_google TO authenticated;
DROP POLICY IF EXISTS "staff_admin" ON public.staff_google;
CREATE POLICY "staff_admin" ON public.staff_google FOR ALL TO authenticated
    USING (public.es_admin()) WITH CHECK (public.es_admin());


-- =========================================================================
-- ALUMNOS: registro con Google, validado en el servidor
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_registrar_alumno(p_nombre TEXT, p_rut TEXT, p_proyecto_id BIGINT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_email TEXT := lower(coalesce(auth.jwt() ->> 'email', ''));
    v_ex public.participantes%ROWTYPE;
    v_id UUID;
BEGIN
    IF v_uid IS NULL OR v_email NOT LIKE '%@alumnos.uta.cl' THEN
        RAISE EXCEPTION 'Debes ingresar con tu cuenta institucional @alumnos.uta.cl';
    END IF;
    IF public.jwt_role() IS NOT NULL THEN
        RAISE EXCEPTION 'Esta cuenta no puede registrarse como alumno';
    END IF;
    IF p_rut !~ '^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$' THEN
        RAISE EXCEPTION 'RUT con formato inválido';
    END IF;
    IF coalesce(length(trim(p_nombre)), 0) < 3 THEN
        RAISE EXCEPTION 'Nombre inválido';
    END IF;
    IF EXISTS (SELECT 1 FROM public.participantes WHERE auth_user_id = v_uid) THEN
        RAISE EXCEPTION 'Tu cuenta ya tiene un registro';
    END IF;

    SELECT * INTO v_ex FROM public.participantes WHERE rut = p_rut;
    IF FOUND THEN
        IF v_ex.auth_user_id IS NOT NULL THEN
            RAISE EXCEPTION 'Ese RUT ya está vinculado a otra cuenta de Google';
        END IF;
        -- Registro previo sin cuenta (cargado por el admin): se vincula
        UPDATE public.participantes SET auth_user_id = v_uid, email = v_email
         WHERE id = v_ex.id RETURNING id INTO v_id;
    ELSE
        IF NOT EXISTS (SELECT 1 FROM public.proyectos WHERE id = p_proyecto_id) THEN
            RAISE EXCEPTION 'Proyecto inexistente';
        END IF;
        INSERT INTO public.participantes (nombre, rut, proyecto_id, auth_user_id, email)
        VALUES (trim(p_nombre), p_rut, p_proyecto_id, v_uid, v_email)
        RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_registrar_alumno(TEXT, TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_registrar_alumno(TEXT, TEXT, BIGINT) TO authenticated;


-- =========================================================================
-- LOGIN POR RUT + CONTRASEÑA (solo invocables por la Edge Function / service_role)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_rut_valido(p_rut TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_rut TEXT := upper(regexp_replace(coalesce(p_rut, ''), '[.\-\s]', '', 'g'));
    v_cuerpo TEXT; v_dv TEXT; v_suma INT := 0; v_factor INT := 2; v_res INT; v_esp TEXT;
BEGIN
    IF v_rut !~ '^[0-9]{7,8}[0-9K]$' THEN RETURN false; END IF;
    v_cuerpo := left(v_rut, length(v_rut) - 1);
    v_dv := right(v_rut, 1);
    IF v_cuerpo ~ '^(\d)\1+$' THEN RETURN false; END IF;
    FOR i IN REVERSE length(v_cuerpo)..1 LOOP
        v_suma := v_suma + substr(v_cuerpo, i, 1)::INT * v_factor;
        v_factor := CASE WHEN v_factor = 7 THEN 2 ELSE v_factor + 1 END;
    END LOOP;
    v_res := 11 - (v_suma % 11);
    v_esp := CASE v_res WHEN 11 THEN '0' WHEN 10 THEN 'K' ELSE v_res::TEXT END;
    RETURN v_dv = v_esp;
END $$;

-- Reglas de contraseña: visitante = 6 dígitos no triviales; resto = mínimo 8 caracteres
CREATE OR REPLACE FUNCTION public.fn_password_valida(p_role TEXT, p_rut TEXT, p_pwd TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_cuerpo TEXT;
BEGIN
    IF p_pwd IS NULL THEN RETURN false; END IF;
    IF p_role = 'visitante' THEN
        IF p_pwd !~ '^\d{6}$' THEN RETURN false; END IF;
        IF p_pwd ~ '^(\d)\1{5}$' THEN RETURN false; END IF;
        IF p_pwd IN ('123456', '654321', '012345', '123123', '112233', '121212', '123321') THEN RETURN false; END IF;
        v_cuerpo := left(p_rut, length(p_rut) - 1);
        IF right(v_cuerpo, 6) = p_pwd THEN RETURN false; END IF;
        RETURN true;
    END IF;
    RETURN length(p_pwd) >= 8;
END $$;

CREATE OR REPLACE FUNCTION public.fn_estado_rut(p_rut TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.usuarios%ROWTYPE; v_rut TEXT := upper(regexp_replace(coalesce(p_rut, ''), '[.\-\s]', '', 'g'));
BEGIN
    SELECT * INTO u FROM public.usuarios WHERE rut = v_rut;
    IF NOT FOUND THEN RETURN jsonb_build_object('estado', 'no_registrado'); END IF;
    IF u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > now() THEN
        RETURN jsonb_build_object('estado', 'bloqueado', 'hasta', u.bloqueado_hasta);
    END IF;
    IF u.estado = 'pendiente' THEN
        IF u.pendiente_hasta IS NOT NULL AND u.pendiente_hasta > now() THEN
            RETURN jsonb_build_object('estado', 'pendiente', 'role', u.role);
        END IF;
        RETURN jsonb_build_object('estado', 'pendiente_vencido');
    END IF;
    RETURN jsonb_build_object('estado', 'activo', 'role', u.role);
END $$;

CREATE OR REPLACE FUNCTION public.fn_login(p_rut TEXT, p_password TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u public.usuarios%ROWTYPE; v_rut TEXT := upper(regexp_replace(coalesce(p_rut, ''), '[.\-\s]', '', 'g'));
BEGIN
    SELECT * INTO u FROM public.usuarios WHERE rut = v_rut FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_registrado'); END IF;

    IF u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > now() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bloqueado', 'hasta', u.bloqueado_hasta);
    END IF;

    IF u.estado = 'pendiente' THEN
        IF u.pendiente_hasta IS NOT NULL AND u.pendiente_hasta > now() THEN
            RETURN jsonb_build_object('ok', false, 'error', 'definir_password');
        END IF;
        RETURN jsonb_build_object('ok', false, 'error', 'pendiente_vencido');
    END IF;

    IF u.password_hash IS NOT NULL AND u.password_hash = crypt(coalesce(p_password, ''), u.password_hash) THEN
        UPDATE public.usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = u.id;
        RETURN jsonb_build_object('ok', true, 'usuario', jsonb_build_object(
            'id', u.id, 'nombre', u.nombre, 'rut', u.rut, 'role', u.role, 'auth_user_id', u.auth_user_id));
    END IF;

    UPDATE public.usuarios
       SET intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= 5 THEN 0 ELSE intentos_fallidos + 1 END,
           bloqueado_hasta   = CASE WHEN intentos_fallidos + 1 >= 5 THEN now() + interval '10 minutes' ELSE bloqueado_hasta END
     WHERE id = u.id;
    RETURN jsonb_build_object('ok', false, 'error', 'credenciales');
END $$;

CREATE OR REPLACE FUNCTION public.fn_definir_password(p_rut TEXT, p_password TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u public.usuarios%ROWTYPE; v_rut TEXT := upper(regexp_replace(coalesce(p_rut, ''), '[.\-\s]', '', 'g'));
BEGIN
    SELECT * INTO u FROM public.usuarios WHERE rut = v_rut FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_registrado'); END IF;
    IF u.estado <> 'pendiente' THEN RETURN jsonb_build_object('ok', false, 'error', 'no_pendiente'); END IF;
    IF u.pendiente_hasta IS NULL OR u.pendiente_hasta <= now() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'pendiente_vencido');
    END IF;
    IF NOT public.fn_password_valida(u.role, u.rut, p_password) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_invalida');
    END IF;
    UPDATE public.usuarios
       SET password_hash = crypt(p_password, gen_salt('bf', 8)), estado = 'activo',
           pendiente_hasta = NULL, intentos_fallidos = 0, bloqueado_hasta = NULL
     WHERE id = u.id;
    RETURN jsonb_build_object('ok', true, 'usuario', jsonb_build_object(
        'id', u.id, 'nombre', u.nombre, 'rut', u.rut, 'role', u.role, 'auth_user_id', u.auth_user_id));
END $$;

-- Crea un usuario. Sin contraseña => queda "pendiente" 15 min (visitantes).
-- Con contraseña => queda activo (jurados, que crea el admin).
CREATE OR REPLACE FUNCTION public.fn_crear_usuario(
    p_nombre TEXT, p_rut TEXT, p_role TEXT,
    p_viene BOOLEAN DEFAULT false, p_por_quien TEXT DEFAULT NULL, p_password TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rut TEXT := upper(regexp_replace(coalesce(p_rut, ''), '[.\-\s]', '', 'g')); v_id UUID;
BEGIN
    IF p_role NOT IN ('jurado', 'visitante') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'rol_invalido');
    END IF;
    IF coalesce(length(trim(p_nombre)), 0) < 3 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'nombre_invalido');
    END IF;
    IF p_role <> 'jurado' AND NOT public.fn_rut_valido(v_rut) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'rut_invalido');
    END IF;
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE rut = v_rut) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'rut_existente');
    END IF;

    IF p_password IS NOT NULL THEN
        IF NOT public.fn_password_valida(p_role, v_rut, p_password) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'password_invalida');
        END IF;
        INSERT INTO public.usuarios (nombre, rut, role, viene_por_alguien, por_quien_vino, password_hash, estado)
        VALUES (trim(p_nombre), v_rut, p_role, p_viene, p_por_quien, crypt(p_password, gen_salt('bf', 8)), 'activo')
        RETURNING id INTO v_id;
    ELSE
        INSERT INTO public.usuarios (nombre, rut, role, viene_por_alguien, por_quien_vino, estado, pendiente_hasta)
        VALUES (trim(p_nombre), v_rut, p_role, p_viene, p_por_quien, 'pendiente', now() + interval '15 minutes')
        RETURNING id INTO v_id;
    END IF;
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'rut', v_rut);
END $$;

-- Vuelve a dejar un visitante "pendiente" 15 min (olvidó la contraseña / venció la ventana)
CREATE OR REPLACE FUNCTION public.fn_habilitar_visitante(p_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hasta TIMESTAMPTZ := now() + interval '15 minutes';
BEGIN
    UPDATE public.usuarios
       SET password_hash = NULL, estado = 'pendiente', pendiente_hasta = v_hasta,
           intentos_fallidos = 0, bloqueado_hasta = NULL
     WHERE id = p_id AND role = 'visitante';
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_encontrado'); END IF;
    RETURN jsonb_build_object('ok', true, 'hasta', v_hasta);
END $$;

-- Cambia el código de un jurado (regenerar QR)
CREATE OR REPLACE FUNCTION public.fn_asignar_password(p_id UUID, p_password TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u public.usuarios%ROWTYPE;
BEGIN
    SELECT * INTO u FROM public.usuarios WHERE id = p_id AND role = 'jurado';
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_encontrado'); END IF;
    IF NOT public.fn_password_valida(u.role, u.rut, p_password) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_invalida');
    END IF;
    UPDATE public.usuarios
       SET password_hash = crypt(p_password, gen_salt('bf', 8)), estado = 'activo',
           pendiente_hasta = NULL, intentos_fallidos = 0, bloqueado_hasta = NULL
     WHERE id = u.id;
    RETURN jsonb_build_object('ok', true, 'rut', u.rut);
END $$;

-- Solo service_role (Edge Function) puede ejecutar estas funciones
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'fn_estado_rut(text)', 'fn_login(text,text)', 'fn_definir_password(text,text)',
    'fn_crear_usuario(text,text,text,boolean,text,text)', 'fn_habilitar_visitante(uuid)',
    'fn_asignar_password(uuid,text)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;


-- =========================================================================
-- STORAGE: imágenes de proyectos
--   * lectura pública
--   * un alumno solo sube/reemplaza dentro de la carpeta de SU proyecto
--   * máx. 5 MB, solo imágenes
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('proyectos-imagenes', 'proyectos-imagenes', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
   SET file_size_limit = 5242880,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "imagenes_lectura" ON storage.objects;
DROP POLICY IF EXISTS "imagenes_subida" ON storage.objects;
DROP POLICY IF EXISTS "imagenes_update" ON storage.objects;
CREATE POLICY "imagenes_lectura" ON storage.objects FOR SELECT
    USING (bucket_id = 'proyectos-imagenes');
CREATE POLICY "imagenes_subida" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'proyectos-imagenes'
        AND (public.es_admin()
             OR (storage.foldername(name))[1] = 'proyecto-' || public.mi_proyecto_id()::text)
    );
CREATE POLICY "imagenes_update" ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'proyectos-imagenes'
        AND (public.es_admin()
             OR (storage.foldername(name))[1] = 'proyecto-' || public.mi_proyecto_id()::text)
    );


-- =========================================================================
-- DATOS INICIALES
-- =========================================================================
INSERT INTO public.categorias (nombre, orden) VALUES
('Introducción a la física', 1),
('Mecánica', 2),
('Electromagnetismo', 3),
('Física contemporánea', 4),
('Introducción a la formulación de proyectos', 5)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rubricas (nombre) VALUES ('Presentación')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.criterios (nombre, peso, orden, rubrica_id)
SELECT c.nombre, 1.0, c.orden, r.id
FROM public.rubricas r,
     (VALUES ('Claridad de la Explicación', 1),
             ('Dominio del Tema y Fundamentos', 2),
             ('Calidad Visual del Stand y Apoyos', 3),
             ('Capacidad de Responder Preguntas', 4)) AS c(nombre, orden)
WHERE r.nombre = 'Presentación'
  AND NOT EXISTS (SELECT 1 FROM public.criterios WHERE rubrica_id = r.id);


-- =========================================================================
-- PRIMER ADMINISTRADOR  (EDITA el correo y ejecuta SOLO este bloque)
-- =========================================================================
-- Descomenta y pon TU correo institucional en minúsculas. Después entra a
-- /login con "Ingresar con Google". Los ayudantes los agrega el admin desde
-- el panel (Ayudantes).
--
-- INSERT INTO public.staff_google (email, nombre, role)
-- VALUES ('tu.correo@alumnos.uta.cl', 'Tu Nombre', 'admin');
