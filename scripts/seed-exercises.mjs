/**
 * Script de Carga Masiva de Ejercicios en Supabase
 * Fuente: free-exercise-db (Open Source Fitness Catalog)
 * URL: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// 1. Cargar variables de entorno desde .env
function loadEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error(`No se encontró el archivo .env en: ${envPath}`);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no encontradas en .env');
  process.exit(1);
}

// Mock transport para evitar error de WebSocket nativo en Node.js 20 sin paquete 'ws'
class DummyWebSocket {}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: DummyWebSocket }
});

// 2. Mapeo y traducción de grupos musculares al estándar fitness en español
function mapMuscleGroup(primaryMuscles) {
  if (!primaryMuscles || primaryMuscles.length === 0) return 'Abdomen / Core';
  const m = primaryMuscles[0].toLowerCase().trim().replace(/_/g, ' ');

  if (m === 'abdominals') return 'Abdomen / Core';
  if (m === 'biceps') return 'Brazos (Bíceps)';
  if (m === 'triceps') return 'Brazos (Tríceps)';
  if (m === 'forearms') return 'Antebrazos';
  if (m === 'chest') return 'Pecho';
  if (m === 'back' || m === 'middle back' || m === 'lower back' || m === 'lats') return 'Espalda';
  if (m === 'shoulders' || m === 'traps' || m === 'neck') return 'Hombros';
  if (m === 'quadriceps' || m === 'hamstrings' || m === 'calves' || m === 'adductors' || m === 'abductors') return 'Piernas';
  if (m === 'glutes') return 'Glúteos';

  return 'Abdomen / Core';
}

// 3. Formateador de registro para Supabase
function formatExercise(item, coachId) {
  const primaryImg = (item.images && item.images.length > 0)
    ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${item.images[0]}`
    : null;

  let instrucciones = '';
  if (Array.isArray(item.instructions) && item.instructions.length > 0) {
    instrucciones = item.instructions.join(' ').trim();
  } else if (typeof item.instructions === 'string' && item.instructions.trim()) {
    instrucciones = item.instructions.trim();
  } else {
    instrucciones = 'Técnica de ejecución controlada manteniendo tensión muscular constante y respiración adecuada.';
  }

  return {
    coach_id: coachId,
    nombre: item.name.trim(),
    grupo_muscular: mapMuscleGroup(item.primaryMuscles),
    imagen_url: primaryImg,
    video_url: null,
    instrucciones: instrucciones
  };
}

async function runSeed() {
  console.log('===============================================================');
  console.log('🏋️  INICIANDO POBLACIÓN MASIVA DE EJERCICIOS EN SUPABASE');
  console.log('===============================================================');
  console.log(`📡 Conectando a Supabase: ${supabaseUrl}`);

  // 1. Obtener Coach ID (Esteban Correa o ID del sistema)
  let coachId = '00000000-0000-0000-0000-000000000001';
  try {
    const { data: coaches } = await supabase.from('coaches').select('id, nombre').limit(1);
    if (coaches && coaches.length > 0) {
      coachId = coaches[0].id;
      console.log(`👤 Entrenador asignado: ${coaches[0].nombre} (${coachId})`);
    }
  } catch (e) {
    console.log(`ℹ️ Usando coach_id por defecto: ${coachId}`);
  }

  // 2. Descargar catálogo oficial de free-exercise-db
  const DATASET_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
  console.log(`\n📥 Descargando catálogo abierto desde:`);
  console.log(`   ${DATASET_URL}`);

  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Error HTTP al descargar dataset: ${response.status} ${response.statusText}`);
  }

  const rawExercises = await response.json();
  console.log(`✅ Catálogo descargado con éxito: ${rawExercises.length} ejercicios encontrados.\n`);

  // 3. Procesar y formatear registros
  const formattedExercises = rawExercises.map(item => formatExercise(item, coachId));

  // 4. Inserción en lotes (chunks) de 75 registros con upsert
  const CHUNK_SIZE = 75;
  const totalChunks = Math.ceil(formattedExercises.length / CHUNK_SIZE);
  let totalUpserted = 0;

  console.log(`🔄 Iniciando inserción en ${totalChunks} lotes de hasta ${CHUNK_SIZE} ejercicios cada uno...`);

  for (let i = 0; i < formattedExercises.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
    const chunk = formattedExercises.slice(i, i + CHUNK_SIZE);

    try {
      const { data, error } = await supabase
        .from('exercises')
        .upsert(chunk, { onConflict: 'nombre' })
        .select('id');

      if (error) {
        console.error(`❌ Error en Lote ${chunkIndex}/${totalChunks}:`, error.message);
      } else {
        const count = data ? data.length : chunk.length;
        totalUpserted += count;
        const progressPct = Math.round((totalUpserted / formattedExercises.length) * 100);
        console.log(`   [Lote ${chunkIndex.toString().padStart(2, ' ')}/${totalChunks}] ✅ ${count} ejercicios procesados | Total acumulado: ${totalUpserted}/${formattedExercises.length} (${progressPct}%)`);
      }
    } catch (err) {
      console.error(`❌ Excepción en Lote ${chunkIndex}/${totalChunks}:`, err.message);
    }
  }

  // 5. Verificación final del total en la base de datos
  console.log('\n===============================================================');
  console.log('📊 VALIDACIÓN Y ESTADÍSTICAS FINALES');
  console.log('===============================================================');

  const { count, error: countError } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.warn('⚠️ No se pudo obtener el conteo exacto:', countError.message);
  } else {
    console.log(`✨ Total de ejercicios activos en la tabla 'exercises': ${count}`);
  }

  // Conteo por grupos musculares
  const { data: allExercises } = await supabase
    .from('exercises')
    .select('grupo_muscular');

  if (allExercises && allExercises.length > 0) {
    const groupCounts = {};
    allExercises.forEach(e => {
      groupCounts[e.grupo_muscular] = (groupCounts[e.grupo_muscular] || 0) + 1;
    });

    console.log('\nDesglose por Grupos Musculares:');
    Object.entries(groupCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([grupo, total]) => {
        console.log(`  • ${grupo.padEnd(20, ' ')}: ${total} ejercicios`);
      });
  }

  console.log('\n🎉 ¡Proceso de población masiva completado exitosamente!');
  console.log('===============================================================\n');
}

runSeed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Error crítico durante la ejecución:', err);
    process.exit(1);
  });
