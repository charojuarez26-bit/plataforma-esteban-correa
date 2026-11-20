-- ==============================================================================
-- MIGRACIÓN: SOPORTE DE ESTADO COMPLETADO EN REGISTROS DE EJERCICIOS POR SESIÓN
-- ==============================================================================

-- Agregar columna booleana 'completado' a session_exercise_logs
-- DEFAULT true garantiza retrocompatibilidad con sesiones históricas ya guardadas
ALTER TABLE IF EXISTS session_exercise_logs
  ADD COLUMN IF NOT EXISTS completado BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN session_exercise_logs.completado IS 'Indica si la serie/ejercicio fue efectivamente realizada por el alumno (true) u omitida al finalizar la sesión (false)';
