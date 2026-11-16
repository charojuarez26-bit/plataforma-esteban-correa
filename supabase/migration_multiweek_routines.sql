-- ==============================================================================
-- MIGRACIÓN: SOPORTE DE RUTINAS MULTI-SEMANA (SEMANAL, MENSUAL, TRIMESTRAL)
-- Retrocompatible al 100% con rutinas y días existentes
-- ==============================================================================

-- 1. Agregar columnas duration_type y total_weeks a la tabla routines
ALTER TABLE routines 
  ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS total_weeks INT DEFAULT 1;

-- 2. Asegurar restricción CHECK en duration_type sin fallar si ya existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_routines_duration_type'
  ) THEN
    ALTER TABLE routines 
      ADD CONSTRAINT check_routines_duration_type 
      CHECK (duration_type IN ('weekly', 'monthly', 'quarterly'));
  END IF;
END $$;

-- 3. Agregar columna week_number a routine_days si la tabla existe en la BD
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routine_days') THEN
    ALTER TABLE routine_days ADD COLUMN IF NOT EXISTS week_number INT DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- 4. Agregar columna week_number a routine_exercises si la tabla existe en la BD
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routine_exercises') THEN
    ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS week_number INT DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- 5. Agregar columna week_number a training_sessions y session_logs para tracking semanal
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_sessions') THEN
    ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS week_number INT DEFAULT 1;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_logs') THEN
    ALTER TABLE session_logs ADD COLUMN IF NOT EXISTS week_number INT DEFAULT 1;
  END IF;
END $$;

-- 6. Retrocompatibilidad: inicializar registros existentes con valores por defecto
UPDATE routines 
SET duration_type = 'weekly' 
WHERE duration_type IS NULL;

UPDATE routines 
SET total_weeks = 1 
WHERE total_weeks IS NULL;
