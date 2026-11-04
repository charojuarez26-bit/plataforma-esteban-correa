/**
 * Script de Pulido Fino para Nombres e Instrucciones en Supabase
 * Asegura redacción 100% natural, fluida y en español profesional para fitness.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

function loadEnv() {
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
class DummyWebSocket {}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { transport: DummyWebSocket }
});

function polishName(name) {
  if (!name) return '';
  let s = name;

  // Limpieza de duplicados generados por regex previas
  s = s.replace(/Cargada \(Cargada \(clean\)\)/gi, "Cargada");
  s = s.replace(/\(Cargada \(clean\) y jerk\)/gi, "(Clean and Jerk)");
  s = s.replace(/Cargada \(clean\)/gi, "Cargada");
  s = s.replace(/Cargadas \(cleans\)/gi, "Cargadas");
  s = s.replace(/Arrancada \(snatch\)/gi, "Arrancada");
  s = s.replace(/Arrancadas \(snatches\)/gi, "Arrancadas");

  // Casos específicos
  s = s.replace(/^Con agarre cerrado con mancuerna Press/i, "Press con mancuerna agarre cerrado");
  s = s.replace(/^Acostado posterior Delt Elevación/i, "Elevaciones posteriores de deltoides acostado");
  s = s.replace(/^Narrow Stance Hack Sentadilla/i, "Sentadilla Hack con pies juntos");
  s = s.replace(/^Inclinado Inner de bíceps Curl/i, "Curl de bíceps en banco inclinado");
  s = s.replace(/^High en polea Curl/i, "Curl de bíceps en polea alta");
  s = s.replace(/^Ball Curl de piernas/i, "Curl de piernas sobre fitball");
  s = s.replace(/^Hip Flexion with con banda elástica/i, "Flexión de cadera con banda elástica");
  s = s.replace(/^Hyperextensions With No Hyperextension Bench/i, "Hiperextensiones en suelo sin banco");
  s = s.replace(/^Inclinado Bench Pull/i, "Remo en banco inclinado");
  s = s.replace(/^Con barra Ab Rodillo abdominales - On Knees/i, "Rueda abdominal con barra de rodillas");
  s = s.replace(/^Con barra Curl acostado Against An inclinado/i, "Curl de bíceps acostado en banco inclinado con barra");
  s = s.replace(/^Con barra inclinado de hombros Raise/i, "Elevaciones de hombros en banco inclinado con barra");
  s = s.replace(/^Hang Cargada.*Below the Knees/i, "Cargada colgante por debajo de rodillas");
  s = s.replace(/^Hip Lift with con banda elástica/i, "Elevación de cadera con banda elástica");
  s = s.replace(/^De espalda Aperturas - With con banda elástica/i, "Pájaros posteriores con banda elástica");
  s = s.replace(/^Clock Flexiones de brazos/i, "Flexiones de brazos del reloj (clock push-up)");
  s = s.replace(/^A un brazo con balón medicinal Slam/i, "Lanzamiento de balón medicinal a un brazo (slam)");
  s = s.replace(/^Acostado isquiotibiales/i, "Estiramiento de isquiotibiales acostado");
  s = s.replace(/^Looking At Ceiling/i, "Estiramiento mirando al techo (arco lumbar)");
  s = s.replace(/^Circus Bell/i, "Press con mancuerna de circo (circus dumbbell)");

  // Palabras en inglés residuales
  s = s.replace(/\bwith con\b/gi, "con");
  s = s.replace(/\b- With con\b/gi, "con");
  s = s.replace(/\b- With\b/gi, "con");
  s = s.replace(/\bwith\b/gi, "con");
  s = s.replace(/\bon knees\b/gi, "de rodillas");
  s = s.replace(/\bRaise\b/g, "Elevación");
  s = s.replace(/\bRaises\b/g, "Elevaciones");
  s = s.replace(/\bCurl\b/g, "Curl");
  s = s.replace(/\bPress\b/g, "Press");
  s = s.replace(/\bRow\b/g, "Remo");
  s = s.replace(/\bSquat\b/g, "Sentadilla");
  s = s.replace(/\bFlyes?\b/gi, "Aperturas");
  s = s.replace(/\bStretch\b/gi, "Estiramiento");

  // Reordenamiento gramatical
  s = s.replace(/^con barra (.*)/i, '$1 con barra');
  s = s.replace(/^con mancuernas (.*)/i, '$1 con mancuernas');
  s = s.replace(/^con mancuerna (.*)/i, '$1 con mancuerna');
  s = s.replace(/^en polea (.*)/i, '$1 en polea');
  s = s.replace(/^con pesa rusa (.*)/i, '$1 con pesa rusa');
  s = s.replace(/^con banda elástica (.*)/i, '$1 con banda elástica');

  s = s.replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function polishInstructions(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text;

  const patterns = [
    [/with your legs extended/gi, 'con las piernas extendidas'],
    [/Your partner should be/gi, 'Tu compañero debe estar'],
    [/Raise one leg up/gi, 'Eleva una pierna'],
    [/Squat down to the/gi, 'Desciende en sentadilla hacia el/la'],
    [/Begin standing with a barbell/gi, 'Párate con una barra'],
    [/Toma la barra with a/gi, 'Toma la barra con un'],
    [/Comienza driving through/gi, 'Comienza empujando a través de'],
    [/As the bar travels upward/gi, 'A medida que la barra sube'],
    [/After the bar crosses the knees/gi, 'Una vez que la barra pasa las rodillas'],
    [/Baja lentamente el\/la/gi, 'Baja lentamente el'],
    [/Inhala al perform/gi, 'Inhala al realizar'],
    [/Begin to raise the unit/gi, 'Comienza a subir el peso'],
    [/as you exhale by pushing/gi, 'mientras exhalas empujando'],
    [/as you straighten the legs/gi, 'al extender nuevamente las piernas'],
    [/and go back to the starting position/gi, 'y regresa a la posición inicial'],
    [/Initiate the movement by lowering/gi, 'Inicia el movimiento bajando'],
    [/Regresa a la posición inicial by extending/gi, 'Regresa a la posición inicial extendiendo'],
    [/at all times/gi, 'en todo momento'],
    [/throughout the movement/gi, 'durante todo el movimiento'],
    [/in order to facilitate/gi, 'para facilitar'],
    [/Avoid swinging/gi, 'Evita balancearte'],
    [/Continue until/gi, 'Continúa hasta'],
    [/Stand, driving through/gi, 'Ponte de pie empujando a través de']
  ];

  for (const [r, rep] of patterns) {
    t = t.replace(r, rep);
  }

  return t;
}

async function polish() {
  console.log('✨ Iniciando pulido gramatical fino...');
  const { data: exercises } = await supabase.from('exercises').select('id, nombre, instrucciones');
  if (!exercises) return;

  let count = 0;
  for (let i = 0; i < exercises.length; i += 30) {
    const chunk = exercises.slice(i, i + 30);
    await Promise.all(
      chunk.map(async (ex) => {
        const polishedName = polishName(ex.nombre);
        const polishedInst = polishInstructions(ex.instrucciones);

        if (polishedName !== ex.nombre || polishedInst !== ex.instrucciones) {
          await supabase.from('exercises').update({
            nombre: polishedName,
            instrucciones: polishedInst
          }).eq('id', ex.id);
          count++;
        }
      })
    );
  }
  console.log(`✅ Pulido completado. ${count} ejercicios refinados con redacción natural.`);
}

polish()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
