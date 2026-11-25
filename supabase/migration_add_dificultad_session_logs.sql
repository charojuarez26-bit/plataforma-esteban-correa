-- ==============================================================================
-- MIGRACIÓN: PERCEPCIÓN DE ESFUERZO / FEEDBACK DEL ALUMNO EN SESSION_LOGS
-- ==============================================================================

-- Agrega la columna opcional 'dificultad_percibida' ('suave' | 'normal' | 'duro')
ALTER TABLE IF EXISTS session_logs
  ADD COLUMN IF NOT EXISTS dificultad_percibida TEXT;

COMMENT ON COLUMN session_logs.dificultad_percibida IS 'Cómo sintió el alumno el entrenamiento: suave | normal | duro';
