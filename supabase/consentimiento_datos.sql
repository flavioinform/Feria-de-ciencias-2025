-- Consentimiento de datos personales (Ley N° 21.719).
-- Ejecutar UNA vez en Supabase > SQL Editor.
--
-- * Agrega usuarios.consentimiento_datos_at: fecha/hora en que el visitante
--   aceptó que su RUT se use solo con fines académicos y se elimine dentro de
--   20 días hábiles tras finalizar la feria.
-- * fn_definir_password ahora recibe p_acepta_datos: un visitante no puede
--   crear su contraseña sin aceptar, y al aceptar se guarda la fecha.

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS consentimiento_datos_at TIMESTAMPTZ;

-- Se reemplaza la versión de 2 parámetros (si no, quedarían dos sobrecargas).
DROP FUNCTION IF EXISTS public.fn_definir_password(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.fn_definir_password(
    p_rut TEXT, p_password TEXT, p_acepta_datos BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u public.usuarios%ROWTYPE; v_rut TEXT := upper(regexp_replace(coalesce(p_rut, ''), '[.\-\s]', '', 'g'));
BEGIN
    SELECT * INTO u FROM public.usuarios WHERE rut = v_rut FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_registrado'); END IF;
    IF u.estado <> 'pendiente' THEN RETURN jsonb_build_object('ok', false, 'error', 'no_pendiente'); END IF;
    IF u.pendiente_hasta IS NULL OR u.pendiente_hasta <= now() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'pendiente_vencido');
    END IF;
    IF u.role = 'visitante' AND NOT coalesce(p_acepta_datos, false) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'consentimiento_requerido');
    END IF;
    IF NOT public.fn_password_valida(u.role, u.rut, p_password) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_invalida');
    END IF;
    UPDATE public.usuarios
       SET password_hash = crypt(p_password, gen_salt('bf', 8)), estado = 'activo',
           pendiente_hasta = NULL, intentos_fallidos = 0, bloqueado_hasta = NULL,
           consentimiento_datos_at = CASE WHEN u.role = 'visitante' THEN now() ELSE consentimiento_datos_at END
     WHERE id = u.id;
    RETURN jsonb_build_object('ok', true, 'usuario', jsonb_build_object(
        'id', u.id, 'nombre', u.nombre, 'rut', u.rut, 'role', u.role, 'auth_user_id', u.auth_user_id));
END $$;

REVOKE EXECUTE ON FUNCTION public.fn_definir_password(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_definir_password(TEXT, TEXT, BOOLEAN) TO service_role;
