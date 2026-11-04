-- ==========================================================
-- ESTEBAN CORREA PERSONAL TRAINER - SUPABASE SCHEMA & RLS
-- ==========================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA ENTRENADORES (COACHES)
CREATE TABLE IF NOT EXISTS coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    telefono VARCHAR(30),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA ALUMNOS / CLIENTES (CLIENTS)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    access_code VARCHAR(15) UNIQUE NOT NULL, -- ej. 'MG-4821'
    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(120),
    edad INT,
    altura NUMERIC(5, 2), -- en cm o metros (ej 178)
    modalidad VARCHAR(20) DEFAULT 'Presencial' CHECK (modalidad IN ('Presencial', 'Online', 'Híbrido')),
    objetivo VARCHAR(255) NOT NULL,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Pausado')),
    avatar_url TEXT,
    notas TEXT,
    dias_por_semana INT DEFAULT 3,
    dias_asignados TEXT[] DEFAULT ARRAY['Lunes', 'Miércoles', 'Viernes'],
    tipo_planificacion VARCHAR(30) DEFAULT 'Semanal' CHECK (tipo_planificacion IN ('Semanal', 'Mensual')),
    duracion_sesion_min INT DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índice para acelerar login de alumnos por código único
CREATE INDEX IF NOT EXISTS idx_clients_access_code ON clients(access_code);
CREATE INDEX IF NOT EXISTS idx_clients_coach ON clients(coach_id);

-- 3. BIBLIOTECA DE EJERCICIOS (EXERCISES)
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    grupo_muscular VARCHAR(50) NOT NULL CHECK (grupo_muscular IN ('Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Fullbody')),
    imagen_url TEXT,
    video_url TEXT,
    instrucciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. RUTINAS (ROUTINES)
CREATE TABLE IF NOT EXISTS routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    objetivo TEXT,
    nivel VARCHAR(30) DEFAULT 'Intermedio',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. EJERCICIOS DE LA RUTINA (ROUTINE_EXERCISES)
CREATE TABLE IF NOT EXISTS routine_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE RESTRICT,
    dia VARCHAR(30) NOT NULL, -- ej. 'Día 1: Piernas / Glúteos', 'Lunes'
    series INT NOT NULL DEFAULT 4,
    repeticiones VARCHAR(30) NOT NULL DEFAULT '10-12',
    peso_sugerido VARCHAR(30) DEFAULT 'Según RPE 8',
    descanso_seg INT DEFAULT 90,
    notas TEXT,
    orden INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. EVALUACIONES FÍSICAS (EVALUATIONS)
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    peso NUMERIC(5, 2) NOT NULL, -- en kg
    porcentaje_grasa NUMERIC(4, 1),
    cintura NUMERIC(5, 2), -- en cm
    cadera NUMERIC(5, 2), -- en cm
    brazo NUMERIC(5, 2), -- en cm
    muslo NUMERIC(5, 2), -- en cm
    notas TEXT,
    foto_frente_url TEXT,
    foto_perfil_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluations_client_date ON evaluations(client_id, fecha DESC);

-- 7. PAGOS Y PLANES (PAYMENTS)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    plan_nombre VARCHAR(100) NOT NULL, -- ej. 'Plan Personalizado 3x Semana'
    monto NUMERIC(10, 2) NOT NULL,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    metodo VARCHAR(50) DEFAULT 'Transferencia' CHECK (metodo IN ('Transferencia', 'Efectivo', 'MercadoPago', 'Tarjeta')),
    estado VARCHAR(20) DEFAULT 'Pagado' CHECK (estado IN ('Pagado', 'Pendiente', 'Vencido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. AGENDA Y TURNOS (APPOINTMENTS)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo VARCHAR(20) DEFAULT 'Presencial' CHECK (tipo IN ('Presencial', 'Online')),
    estado VARCHAR(20) DEFAULT 'Confirmado' CHECK (estado IN ('Confirmado', 'Pendiente', 'Completado', 'Cancelado')),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Politica para Coaches autenticados vía Supabase Auth
CREATE POLICY "Coaches can access their own coach profile" 
ON coaches FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can access all data of their clients" 
ON clients FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can manage their exercises" 
ON exercises FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can manage routines" 
ON routines FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can manage routine exercises" 
ON routine_exercises FOR ALL USING (
    routine_id IN (SELECT r.id FROM routines r JOIN coaches c ON r.coach_id = c.id WHERE c.user_id = auth.uid())
);

CREATE POLICY "Coaches can manage evaluations" 
ON evaluations FOR ALL USING (
    client_id IN (SELECT cl.id FROM clients cl JOIN coaches c ON cl.coach_id = c.id WHERE c.user_id = auth.uid())
);

CREATE POLICY "Coaches can manage payments" 
ON payments FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can manage appointments" 
ON appointments FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

-- ==========================================================
-- FUNCIÓN RPC SEGURA PARA PORTAL DEL ALUMNO
-- El alumno solo consulta pasando su código único
-- ==========================================================
CREATE OR REPLACE FUNCTION get_student_portal(p_code VARCHAR, p_name VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_client RECORD;
    v_routine RECORD;
    v_exercises JSON;
    v_evaluations JSON;
    v_payments JSON;
    v_result JSON;
BEGIN
    -- Validar alumno
    SELECT * INTO v_client FROM clients 
    WHERE UPPER(access_code) = UPPER(TRIM(p_code)) 
      AND (UPPER(nombre_completo) LIKE '%' || UPPER(TRIM(p_name)) || '%' OR p_name = '')
    LIMIT 1;

    IF v_client.id IS NULL THEN
        RETURN json_build_object('error', 'Código de acceso o nombre no encontrado');
    END IF;

    -- Obtener rutina activa
    SELECT * INTO v_routine FROM routines 
    WHERE client_id = v_client.id AND activo = TRUE 
    ORDER BY created_at DESC LIMIT 1;

    -- Obtener ejercicios de la rutina
    IF v_routine.id IS NOT NULL THEN
        SELECT json_agg(
            json_build_object(
                'id', re.id,
                'dia', re.dia,
                'series', re.series,
                'repeticiones', re.repeticiones,
                'peso_sugerido', re.peso_sugerido,
                'descanso_seg', re.descanso_seg,
                'notas', re.notas,
                'orden', re.orden,
                'ejercicio', json_build_object(
                    'nombre', e.nombre,
                    'grupo_muscular', e.grupo_muscular,
                    'imagen_url', e.imagen_url,
                    'instrucciones', e.instrucciones
                )
            ) ORDER BY re.orden ASC
        ) INTO v_exercises
        FROM routine_exercises re
        JOIN exercises e ON re.exercise_id = e.id
        WHERE re.routine_id = v_routine.id;
    ELSE
        v_exercises := '[]'::json;
    END IF;

    -- Obtener evaluaciones
    SELECT json_agg(ev ORDER BY ev.fecha ASC) INTO v_evaluations
    FROM evaluations ev WHERE ev.client_id = v_client.id;

    -- Obtener pagos
    SELECT json_agg(p ORDER BY p.fecha_vencimiento DESC) INTO v_payments
    FROM payments p WHERE p.client_id = v_client.id;

    -- Armar JSON respuesta
    v_result := json_build_object(
        'client', row_to_json(v_client),
        'routine', row_to_json(v_routine),
        'exercises', COALESCE(v_exercises, '[]'::json),
        'evaluations', COALESCE(v_evaluations, '[]'::json),
        'payments', COALESCE(v_payments, '[]'::json)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
