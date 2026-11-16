-- ==============================================================================
-- MIGRACIÓN: SOPORTE DE INTENSIDAD RECOMENDADA Y REAL (RPE / RIR / %)
-- ==============================================================================

-- 1. Intensidad recomendada por el entrenador en la rutina
ALTER TABLE IF EXISTS routine_exercises 
  ADD COLUMN IF NOT EXISTS recommended_intensity TEXT;

-- 2. Intensidad real lograda por el alumno en los registros de entrenamiento
ALTER TABLE IF EXISTS session_exercise_logs 
  ADD COLUMN IF NOT EXISTS actual_intensity TEXT,
  ADD COLUMN IF NOT EXISTS recommended_intensity TEXT;

-- Comentario explicativo
COMMENT ON COLUMN routine_exercises.recommended_intensity IS 'Intensidad sugerida por el entrenador (ej. RPE 8, RIR 2, 75% 1RM)';
COMMENT ON COLUMN session_exercise_logs.actual_intensity IS 'Intensidad real percibida/ejecutada por el alumno (ej. RPE 8.5, RIR 1)';
