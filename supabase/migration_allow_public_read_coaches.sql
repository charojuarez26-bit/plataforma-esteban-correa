-- ==========================================================
-- PERMITIR LECTURA PÚBLICA DEL PERFIL DE ENTRENADOR
-- Permite que los alumnos y visitantes obtengan el teléfono / WhatsApp
-- y datos públicos configurados por el coach sin ser bloqueados por RLS.
-- ==========================================================

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de coaches" ON coaches;
DROP POLICY IF EXISTS "Coaches public read policy" ON coaches;

CREATE POLICY "Permitir lectura publica de coaches"
ON coaches FOR SELECT
USING (true);
