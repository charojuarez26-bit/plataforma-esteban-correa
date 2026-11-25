-- ==============================================================================
-- MIGRACIÓN: SOPORTE DE SERIES DESCENDENTES (DROP SETS / BAJADAS) EN SESSION_EXERCISE_LOGS
-- ==============================================================================

-- Almacena el array de bajadas (drop sets) ejecutadas en cada serie como JSONB:
-- Ejemplo: [{"peso": 15, "reps": 8}, {"peso": 10, "reps": 10}]
ALTER TABLE IF EXISTS session_exercise_logs
  ADD COLUMN IF NOT EXISTS bajadas JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN session_exercise_logs.bajadas IS 'Series descendentes (drop sets) asociadas a esta serie en formato JSONB [{peso, reps}]';
