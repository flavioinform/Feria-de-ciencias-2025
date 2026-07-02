-- =========================================================================
-- SCRIPT DE CREACIÓN DE TABLAS Y SEMILLA DE DATOS PARA SUPABASE
-- Feria de Ciencias 2025
-- =========================================================================
-- Copia y pega este script en el editor SQL de tu panel de Supabase (SQL Editor -> New Query)
-- para estructurar las tablas e insertar los datos iniciales necesarios.
-- =========================================================================

-- 1. Eliminar tablas existentes (opcional, por si quieres reiniciar la base de datos)
-- DROP TABLE IF EXISTS evaluacion_detalle CASCADE;
-- DROP TABLE IF EXISTS evaluaciones CASCADE;
-- DROP TABLE IF EXISTS criterios CASCADE;
-- DROP TABLE IF EXISTS rubricas CASCADE;
-- DROP TABLE IF EXISTS proyectos CASCADE;
-- DROP TABLE IF EXISTS categorias CASCADE;
-- DROP TABLE IF EXISTS usuarios CASCADE;

-- Habilitar extensión UUID por si se requiere
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 2. TABLA: usuarios
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre TEXT NOT NULL,
    rut TEXT NOT NULL UNIQUE, -- Se guarda normalizado (sin puntos, sin guion, DV en mayúscula)
    viene_por_alguien BOOLEAN DEFAULT false NOT NULL,
    por_quien_vino TEXT,
    pin_hash TEXT NOT NULL, -- PIN de 4 dígitos guardado en texto plano según el login actual
    role TEXT DEFAULT 'visitante' NOT NULL CHECK (role IN ('admin', 'visitante'))
);

-- Habilitar RLS (Row Level Security) - opcional para producción, por ahora desactivado para evitar bloqueos
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS simples para desarrollo: permitir a cualquiera leer y escribir
CREATE POLICY "Permitir todo a usuarios anonimos y autenticados" ON usuarios
    FOR ALL USING (true) WITH CHECK (true);


-- -------------------------------------------------------------------------
-- 3. TABLA: categorias
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre TEXT NOT NULL UNIQUE
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura publica de categorias" ON categorias
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de categorias a admins" ON categorias
    FOR ALL USING (true) WITH CHECK (true);


-- -------------------------------------------------------------------------
-- 4. TABLA: proyectos
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proyectos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    stand_num INTEGER,
    image TEXT, -- URL de la imagen representativa del proyecto
    participantes TEXT, -- Nombres de los estudiantes que exponen
    categorias_id BIGINT REFERENCES categorias(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura publica de proyectos" ON proyectos
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de proyectos a admins" ON proyectos
    FOR ALL USING (true) WITH CHECK (true);


-- -------------------------------------------------------------------------
-- 5. TABLA: rubricas
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rubricas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre TEXT NOT NULL UNIQUE
);

ALTER TABLE rubricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura publica de rubricas" ON rubricas
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de rubricas a admins" ON rubricas
    FOR ALL USING (true) WITH CHECK (true);


-- -------------------------------------------------------------------------
-- 6. TABLA: criterios
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS criterios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre TEXT NOT NULL,
    peso NUMERIC DEFAULT 1.0 NOT NULL,
    orden INTEGER DEFAULT 0 NOT NULL,
    rubrica_id BIGINT REFERENCES rubricas(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE criterios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura publica de criterios" ON criterios
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de criterios a admins" ON criterios
    FOR ALL USING (true) WITH CHECK (true);


-- -------------------------------------------------------------------------
-- 7. TABLA: evaluaciones
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    proyecto_id BIGINT REFERENCES proyectos(id) ON DELETE CASCADE NOT NULL,
    visitante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
    nota_final NUMERIC NOT NULL,
    observacion_general TEXT,
    -- Puntaje de cada criterio del jurado (mapa nombre_criterio -> puntaje 1-7).
    -- Se usa para los rankings de "Mejor Presentación Oral" y "Visual".
    detalle_criterios JSONB,
    CONSTRAINT unica_evaluacion_por_visitante_proyecto UNIQUE (proyecto_id, visitante_id)
);

ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en evaluaciones" ON evaluaciones
    FOR ALL USING (true) WITH CHECK (true);


-- -------------------------------------------------------------------------
-- 8. TABLA: evaluacion_detalle
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluacion_detalle (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    evaluacion_id UUID REFERENCES evaluaciones(id) ON DELETE CASCADE NOT NULL,
    criterio_id BIGINT REFERENCES criterios(id) ON DELETE CASCADE NOT NULL,
    puntaje INTEGER NOT NULL CHECK (puntaje BETWEEN 1 AND 4),
    comentario TEXT
);

ALTER TABLE evaluacion_detalle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en detalles" ON evaluacion_detalle
    FOR ALL USING (true) WITH CHECK (true);


-- =========================================================================
-- SEMILLA DE DATOS INICIALES (SEED DATA)
-- =========================================================================

-- 1. Insertar Categorías obligatorias
INSERT INTO categorias (nombre) VALUES
('Introducción a la física'),
('Formulación de proyectos'),
('Mecánica'),
('Electromagnetismo'),
('Física contemporánea')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Insertar Rúbrica principal "Presentación"
INSERT INTO rubricas (nombre) VALUES
('Presentación')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Insertar Criterios estándar para la rúbrica "Presentación"
-- (Obtiene el ID de la rúbrica dinámicamente)
DO $$
DECLARE
    rubrica_presentacion_id BIGINT;
BEGIN
    SELECT id INTO rubrica_presentacion_id FROM rubricas WHERE nombre = 'Presentación';

    IF rubrica_presentacion_id IS NOT NULL THEN
        INSERT INTO criterios (nombre, peso, orden, rubrica_id) VALUES
        ('Claridad de la Explicación', 1.0, 1, rubrica_presentacion_id),
        ('Dominio del Tema y Fundamentos', 1.0, 2, rubrica_presentacion_id),
        ('Calidad Visual del Stand y Apoyos', 1.0, 3, rubrica_presentacion_id),
        ('Capacidad de Responder Preguntas', 1.0, 4, rubrica_presentacion_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 4. Crear un usuario Administrador por defecto
-- RUT: 12.345.678-9 (Normalizado: 123456789)
-- PIN: 1234
INSERT INTO usuarios (nombre, rut, viene_por_alguien, por_quien_vino, pin_hash, role) VALUES
('Administrador Feria', '123456789', false, NULL, '1234', 'admin')
ON CONFLICT (rut) DO NOTHING;
