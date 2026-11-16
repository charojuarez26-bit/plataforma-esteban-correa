-- Migración para soportar el campo de Capacitaciones y Certificaciones en la tabla coaches
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS certifications TEXT;

COMMENT ON COLUMN coaches.certifications IS 'Capacitaciones, títulos y certificaciones profesionales del entrenador para mostrar en el perfil del alumno';
