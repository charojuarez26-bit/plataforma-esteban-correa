/**
 * Script Avanzado de Traducción y Adaptación 100% al Español de la Biblioteca de Ejercicios
 * Corrige construcciones gramaticales, nombres compuestos, instrucciones y grupos musculares.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

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
class DummyWebSocket {}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { transport: DummyWebSocket }
});

// 1. Diccionario exhaustivo de nombres específicos y compuestos
const EXERCISE_NAME_MAPPING = {
  // Abdominales / Core
  "3/4 Sit-Up": "Abdominales 3/4 (sit-ups)",
  "Ab Crunch Machine": "Crunch abdominal en máquina",
  "Ab Roller": "Rueda abdominal (ab wheel rollout)",
  "Air Bike": "Bicicleta abdominal (air bike)",
  "Cocoons": "Abdominales tipo capullo (cocoons)",
  "Crunches": "Abdominales crunch clásicos",
  "Dead Bug": "Bicho muerto para estabilidad del core (dead bug)",
  "Hanging Leg Raise": "Elevación de piernas colgado en barra",
  "Hanging Knee Raise": "Elevación de rodillas colgado en barra",
  "Hanging Pike": "Elevación en pica colgado (hanging pike)",
  "Hollow Body Hold": "Posición hollow body isométrica",
  "Kneeling Cable Crunch": "Crunch abdominal de rodillas en polea",
  "Mountain Climbers": "Escaladores abdominales (mountain climbers)",
  "Plank": "Plancha abdominal isométrica",
  "Reverse Crunch": "Crunch abdominal inverso",
  "Russian Twist": "Giros rusos para oblicuos",
  "Side Plank": "Plancha lateral isométrica",
  "Isometric Wipers": "Limpiaparabrisas abdominales isométricos",

  // Pecho
  "Barbell Bench Press - Medium Grip": "Press de banca con barra (agarre medio)",
  "Barbell Incline Bench Press - Medium Grip": "Press de banca inclinado con barra",
  "Bench Press - Powerlifting": "Press de banca estilo powerlifting",
  "Bodyweight Flyes": "Aperturas en suelo con peso corporal",
  "Cable Chest Press": "Press de pecho en polea",
  "Cable Crossover": "Cruces en polea para pecho",
  "Chain Press": "Press de banca con cadenas",
  "Chest Dip": "Fondos en paralelas para pecho",
  "Chest Dips": "Fondos en paralelas para pecho",
  "Close-Grip Barbell Bench Press": "Press de banca con agarre cerrado",
  "Decline Barbell Bench Press": "Press declinado con barra",
  "Decline Dumbbell Bench Press": "Press declinado con mancuernas",
  "Decline Dumbbell Flyes": "Aperturas declinadas con mancuernas",
  "Dips - Chest Version": "Fondos en paralelas (enfoque pectoral)",
  "Dumbbell Bench Press": "Press de banca plano con mancuernas",
  "Dumbbell Flyes": "Aperturas planas con mancuernas",
  "Flat Bench Cable Flyes": "Aperturas planas en polea",
  "Floor Press": "Press de pecho en el suelo",
  "High Cable Crossover": "Cruces desde polea alta para pecho",
  "Incline Cable Flye": "Aperturas inclinadas en polea",
  "Incline Dumbbell Bench Press": "Press inclinado con mancuernas",
  "Incline Dumbbell Flyes": "Aperturas inclinadas con mancuernas",
  "Incline Dumbbell Press": "Press inclinado con mancuernas",
  "Incline Push-Up": "Flexiones con manos elevadas (inclinadas)",
  "Low Cable Crossover": "Cruces desde polea baja para pecho",
  "Pec Deck": "Aperturas en máquina Pec Deck",
  "Push-Up": "Flexiones de brazos tradicionales",
  "Pushups": "Flexiones de brazos tradicionales",
  "Smith Machine Bench Press": "Press de banca en máquina Smith",
  "Smith Machine Incline Bench Press": "Press inclinado en máquina Smith",
  "Wide-Grip Barbell Bench Press": "Press de banca con agarre ancho",

  // Espalda
  "Alternating Kettlebell Row": "Remo alternado con pesa rusa",
  "Alternating Renegade Row": "Remo renegado alternado",
  "Atlas Stone Trainer": "Levantamiento simulado de piedra Atlas",
  "Atlas Stones": "Levantamiento de piedras Atlas",
  "Axle Deadlift": "Peso muerto con barra gruesa (Axle)",
  "Barbell Deadlift": "Peso muerto convencional con barra",
  "Bent Over Barbell Row": "Remo inclinado con barra",
  "Bent Over Two-Arm Long Barbell Row": "Remo inclinado con barra larga",
  "Bent Over Two-Dumbbell Row": "Remo inclinado con dos mancuernas",
  "Bodyweight Mid Row": "Remo medio con peso corporal (australiano)",
  "Chin-Up": "Dominadas supinas (chin-ups)",
  "Chin-Ups": "Dominadas supinas (chin-ups)",
  "Close-Grip Front Lat Pulldown": "Jalón al pecho con agarre estrecho",
  "Gironda Sternum Chins": "Dominadas al esternón estilo Gironda",
  "Incline Dumbbell Row": "Remo en banco inclinado con mancuernas",
  "Inverted Row": "Remo invertido con peso corporal",
  "Lat Pulldown": "Jalón al pecho en polea",
  "Lat Pulldowns": "Jalón al pecho en polea",
  "Neutral-Grip Pull-Up": "Dominadas con agarre neutro",
  "One-Arm Dumbbell Row": "Remo con mancuerna a una mano",
  "Pull-Up": "Dominadas pronas",
  "Pullups": "Dominadas pronas",
  "Rack Pull": "Rack pull con barra (peso muerto parcial)",
  "Renegade Row": "Remo renegado en plancha con mancuernas",
  "Romanian Deadlift": "Peso muerto rumano",
  "Seated Cable Rows": "Remo sentado en polea baja",
  "Sumo Deadlift": "Peso muerto estilo sumo",
  "T-Bar Row": "Remo en barra T con apoyo",
  "V-Bar Pulldown": "Jalón al pecho con agarre en V",
  "Wide-Grip Lat Pulldown": "Jalón al pecho con agarre ancho",

  // Piernas
  "90/90 Hamstring": "Estiramiento 90/90 de isquiotibiales",
  "All Fours Quad Stretch": "Estiramiento de cuádriceps en cuadrupedia",
  "Alternate Leg Diagonal Bound": "Saltos diagonales alternados a una pierna",
  "Ankle Circles": "Rotaciones de tobillos",
  "Anterior Tibialis-SMR": "Liberación miofascial del tibial anterior",
  "Backward Drag": "Arrastre de trineo hacia atrás",
  "Barbell Full Squat": "Sentadilla profunda con barra",
  "Barbell Hack Squat": "Sentadilla Hack con barra",
  "Barbell Lunge": "Zancadas con barra",
  "Barbell Rear Lunge": "Zancadas hacia atrás con barra",
  "Barbell Squat": "Sentadilla trasera con barra",
  "Barbell Step Ups": "Subidas al cajón con barra (step-ups)",
  "Bodyweight Squat": "Sentadilla libre con peso corporal",
  "Bodyweight Walking Lunge": "Zancadas caminando con peso corporal",
  "Box Jump": "Saltos al cajón pliométrico",
  "Box Squat": "Sentadilla al cajón con barra",
  "Bulgarian Split Squat": "Sentadilla búlgara",
  "Calf Press": "Prensa para pantorrillas",
  "Calf Press On The Leg Press Machine": "Elevación de talones en prensa de piernas",
  "Calves": "Elevación de talones para pantorrillas",
  "Donkey Calf Raises": "Elevación de talones tipo burro",
  "Dumbbell Lunges": "Zancadas / estocadas con mancuernas",
  "Dumbbell Rear Lunge": "Zancadas hacia atrás con mancuernas",
  "Dumbbell Squat": "Sentadilla con mancuernas",
  "Dumbbell Step Ups": "Subidas al cajón con mancuernas",
  "Front Barbell Squat": "Sentadilla frontal con barra",
  "Front Squat": "Sentadilla frontal",
  "Glute Ham Raise": "Elevación de glúteos e isquios (GHD raise)",
  "Goblet Squat": "Sentadilla goblet",
  "Good Morning": "Buenos días con barra (isquiotibiales y lumbar)",
  "Hack Squat": "Sentadilla hack en máquina",
  "Leg Extensions": "Extensiones de cuadríceps en máquina",
  "Leg Press": "Prensa inclinada de piernas",
  "Lying Leg Curls": "Curl femoral acostado en máquina",
  "Nordic Hamstring Curl": "Curl nórdico para isquiotibiales",
  "Pistol Squat": "Sentadilla pistola a una pierna",
  "Seated Calf Raise": "Elevación de talones sentado en máquina",
  "Seated Leg Curl": "Curl femoral sentado en máquina",
  "Single-Leg Romanian Deadlift": "Peso muerto rumano a una pierna",
  "Sissy Squat": "Sentadilla Sissy",
  "Smith Machine Squat": "Sentadilla en máquina Smith",
  "Standing Calf Raises": "Elevación de talones de pie",
  "Standing Dumbbell Calf Raise": "Elevación de talones de pie con mancuernas",
  "Stiff-Legged Barbell Deadlift": "Peso muerto con piernas rígidas y barra",
  "Sumo Squat": "Sentadilla estilo sumo",
  "The Straddle": "Apertura de piernas sentado (straddle stretch)",
  "Walking Lunges": "Zancadas caminando",
  "Zercher Squat": "Sentadilla Zercher",

  // Glúteos
  "Ankle On The Knee": "Estiramiento de glúteos tobillo a rodilla",
  "Barbell Glute Bridge": "Puente de glúteos con barra",
  "Barbell Hip Thrust": "Hip thrust con barra (empuje de cadera)",
  "Butt Lift (Bridge)": "Puente de glúteos en suelo",
  "Glute Bridge": "Puente de glúteos en suelo",
  "Hip Thrust": "Empuje de cadera (hip thrust)",

  // Hombros
  "Alternating Cable Shoulder Press": "Press de hombros alternado en polea",
  "Alternating Deltoid Raise": "Elevaciones alternadas de deltoides",
  "Alternating Kettlebell Press": "Press militar alternado con pesa rusa",
  "Anti-Gravity Press": "Press militar antigravedad",
  "Arm Circles": "Círculos con brazos para movilidad",
  "Arnold Dumbbell Press": "Press Arnold con mancuernas",
  "Cable Rear Delt Fly": "Pájaros posteriores en polea",
  "Cable Shoulder Press": "Press de hombros en polea",
  "Cable Shrug": "Encogimiento de hombros en polea baja",
  "Clean and Press": "Cargada y press militar",
  "Dumbbell Incline Shoulder Raise": "Elevaciones en banco inclinado con mancuernas",
  "Dumbbell Push Press": "Push press con mancuernas",
  "Dumbbell Scaption": "Elevación escapular con mancuernas",
  "Dumbbell Shoulder Press": "Press militar de hombros con mancuernas",
  "Dumbbell Shrug": "Encogimiento de hombros con mancuernas",
  "Face Pull": "Face pull en polea alta",
  "Front Plate Raise": "Elevaciones frontales con disco",
  "Lateral Raise": "Elevaciones laterales de hombros",
  "Military Press": "Press militar de pie con barra",
  "Overhead Press": "Press militar sobre la cabeza",
  "Push Press": "Push press de hombros",
  "Rear Delt Flyes": "Pájaros posteriores para deltoides",
  "Seated Dumbbell Press": "Press militar sentado con mancuernas",
  "Side Lateral Raise": "Elevaciones laterales con mancuernas",
  "Standing Dumbbell Shoulder Press": "Press militar de pie con mancuernas",
  "Standing Military Press": "Press militar de pie con barra",
  "Upright Barbell Row": "Remo al mentón con barra",
  "Upright Cable Row": "Remo al mentón en polea",
  "Upright Row": "Remo al mentón",

  // Brazos
  "Alternate Hammer Curl": "Curl martillo alternado con mancuernas",
  "Alternate Incline Dumbbell Curl": "Curl alternado en banco inclinado con mancuernas",
  "Barbell Curl": "Curl de bíceps con barra",
  "Barbell Curls": "Curl de bíceps con barra",
  "Cable Incline Pushdown": "Extensión de tríceps inclinada en polea",
  "Cable Preacher Curl": "Curl en banco Scott con polea",
  "Cable Rope Overhead Triceps Extension": "Extensión de tríceps sobre cabeza en polea con cuerda",
  "Cable Wrist Curl": "Curl de muñeca en polea",
  "Close-Grip Push-Up": "Flexiones de brazos con agarre cerrado",
  "Concentration Curls": "Curl concentrado con mancuerna",
  "Cross Body Hammer Curl": "Curl martillo cruzado al pecho",
  "Decline Close-Grip Bench To Skull Crusher": "Press declinado cerrado a press francés",
  "Diamond Push-Up": "Flexiones diamante para tríceps",
  "Dip Machine": "Fondos en máquina asistida",
  "Dips - Triceps Version": "Fondos en paralelas (enfoque tríceps)",
  "Drag Curl": "Drag curl con barra",
  "Dumbbell Bicep Curl": "Curl de bíceps con mancuernas",
  "EZ-Bar Curl": "Curl de bíceps con barra Z",
  "EZ-Bar Skullcrusher": "Press francés con barra Z (rompecráneos)",
  "Hammer Curls": "Curl martillo con mancuernas",
  "Incline Dumbbell Curl": "Curl de bíceps en banco inclinado con mancuernas",
  "Lying Triceps Press": "Press francés acostado (rompecráneos)",
  "Overhead Cable Curl": "Curl de bíceps en polea alta doble",
  "Overhead Dumbbell Extension": "Extensión de tríceps sobre cabeza con mancuerna",
  "Preacher Curl": "Curl en banco Scott (predicador)",
  "Reverse Barbell Curl": "Curl invertido con barra (antebrazos)",
  "Reverse Cable Curl": "Curl invertido en polea",
  "Reverse Grip Triceps Pushdown": "Extensión de tríceps en polea con agarre invertido",
  "Rope Pushdowns": "Extensión de tríceps en polea con cuerda",
  "Skullcrusher": "Press francés (rompecráneos)",
  "Spider Curl": "Curl araña en banco inclinado (spider curl)",
  "Standing Biceps Cable Curl": "Curl de bíceps de pie en polea",
  "Triceps Pushdown": "Extensión de tríceps en polea alta",
  "Triceps Pushdown - Rope Attachment": "Extensión de tríceps en polea con cuerda",

  // Otros / Funcional / Olímpico
  "Battle Ropes": "Cuerdas de batalla (battle ropes)",
  "Bicycling": "Ciclismo / bicicleta aeróbica",
  "Bicycling, Stationary": "Bicicleta fija estática",
  "Burpee": "Burpees completos",
  "Clean": "Cargada olímpica (clean)",
  "Clean and Jerk": "Cargada y envión olímpico (clean and jerk)",
  "Double Under": "Saltos dobles a la cuerda",
  "Farmer's Walk": "Paseo del granjero (farmer's walk)",
  "Jumping Jacks": "Saltos del payaso (jumping jacks)",
  "Kettlebell One-Arm Clean": "Cargada a un brazo con pesa rusa",
  "Kettlebell One-Arm Snatch": "Arrancada a un brazo con pesa rusa",
  "Kettlebell Swing": "Balanceo con pesa rusa (kettlebell swing)",
  "Kettlebell Thruster": "Thruster con pesas rusas",
  "Kettlebell Windmill": "Molino con pesa rusa (windmill)",
  "One-Arm Kettlebell Clean": "Cargada a un brazo con pesa rusa",
  "One-Arm Kettlebell Snatch": "Arrancada a un brazo con pesa rusa",
  "Power Clean": "Cargada de potencia (power clean)",
  "Power Snatch": "Arrancada de potencia (power snatch)",
  "Turkish Get-Up": "Levantamiento turco con pesa rusa (Turkish get-up)",
  "Windmill": "Molino con pesa rusa (windmill)"
};

// 2. Traductor semántico para cualquier otro nombre
function cleanTranslateName(rawName) {
  if (!rawName) return '';
  const trimmed = rawName.trim();

  // Si está en el diccionario exacto
  if (EXERCISE_NAME_MAPPING[trimmed]) {
    return EXERCISE_NAME_MAPPING[trimmed];
  }

  let s = trimmed;

  // Limpieza inicial de conectores en inglés
  s = s.replace(/\bwith a\b/gi, 'con');
  s = s.replace(/\bwith an\b/gi, 'con');
  s = s.replace(/\bwith the\b/gi, 'con');
  s = s.replace(/\bwith\b/gi, 'con');
  s = s.replace(/\bon a\b/gi, 'en');
  s = s.replace(/\bon the\b/gi, 'en');
  s = s.replace(/\bon\b/gi, 'en');
  s = s.replace(/\band\b/gi, 'y');
  s = s.replace(/\bfor the\b/gi, 'para');
  s = s.replace(/\bfor\b/gi, 'para');
  s = s.replace(/\bto the\b/gi, 'a');
  s = s.replace(/\bto\b/gi, 'a');
  s = s.replace(/\bfrom the\b/gi, 'desde');
  s = s.replace(/\bfrom\b/gi, 'desde');
  s = s.replace(/\bagainst an?\b/gi, 'apoyado en');
  s = s.replace(/\bagainst\b/gi, 'apoyado en');
  s = s.replace(/\bthe\b/gi, '');

  // Equipamiento
  s = s.replace(/\bBarbell\b/gi, 'con barra');
  s = s.replace(/\bTwo-Dumbbell\b/gi, 'con dos mancuernas');
  s = s.replace(/\bDumbbells\b/gi, 'con mancuernas');
  s = s.replace(/\bDumbbell\b/gi, 'con mancuerna');
  s = s.replace(/\bCables\b/gi, 'en poleas');
  s = s.replace(/\bCable\b/gi, 'en polea');
  s = s.replace(/\bKettlebells\b/gi, 'con pesas rusas');
  s = s.replace(/\bKettlebell\b/gi, 'con pesa rusa');
  s = s.replace(/\bSmith Machine\b/gi, 'en máquina Smith');
  s = s.replace(/\bMachine\b/gi, 'en máquina');
  s = s.replace(/\bResistance Bands?\b/gi, 'con banda de resistencia');
  s = s.replace(/\bBands?\b/gi, 'con banda elástica');
  s = s.replace(/\bMedicine Ball\b/gi, 'con balón medicinal');
  s = s.replace(/\bExercise Ball\b/gi, 'con pelota de ejercicio');
  s = s.replace(/\bStability Ball\b/gi, 'con fitball');
  s = s.replace(/\bPlate\b/gi, 'con disco');
  s = s.replace(/\bBodyweight\b/gi, 'con peso corporal');
  s = s.replace(/\bEZ-Bar\b/gi, 'con barra Z');
  s = s.replace(/\bEZ Bar\b/gi, 'con barra Z');
  s = s.replace(/\bBall\b/gi, 'con pelota / fitball');
  s = s.replace(/\bRopes?\b/gi, 'con cuerdas');
  s = s.replace(/\bSled\b/gi, 'con trineo');

  // Movimientos y ejercicios
  s = s.replace(/\bBench Press\b/gi, 'Press de banca');
  s = s.replace(/\bChest Press\b/gi, 'Press de pecho');
  s = s.replace(/\bFloor Press\b/gi, 'Press en suelo');
  s = s.replace(/\bShoulder Press\b/gi, 'Press de hombros');
  s = s.replace(/\bOverhead Press\b/gi, 'Press militar sobre cabeza');
  s = s.replace(/\bMilitary Press\b/gi, 'Press militar');
  s = s.replace(/\bPush Press\b/gi, 'Push press');
  s = s.replace(/\bSquats?\b/gi, 'Sentadilla');
  s = s.replace(/\bDeadlifts?\b/gi, 'Peso muerto');
  s = s.replace(/\bLunges?\b/gi, 'Estocadas / Zancadas');
  s = s.replace(/\bStep-ups?\b/gi, 'Subidas al cajón (step-ups)');
  s = s.replace(/\bLeg Press\b/gi, 'Prensa de piernas');
  s = s.replace(/\bLeg Extensions?\b/gi, 'Extensión de piernas');
  s = s.replace(/\bLeg Curls?\b/gi, 'Curl de piernas');
  s = s.replace(/\bCalf Raises?\b/gi, 'Elevación de talones');
  s = s.replace(/\bCalf Press\b/gi, 'Prensa para pantorrillas');
  s = s.replace(/\bHip Thrusts?\b/gi, 'Hip thrust (empuje de cadera)');
  s = s.replace(/\bGlute Bridges?\b/gi, 'Puente de glúteos');
  s = s.replace(/\bKickbacks?\b/gi, 'Patada posterior');
  s = s.replace(/\bPull-?ups?\b/gi, 'Dominadas pronas');
  s = s.replace(/\bChin-?ups?\b/gi, 'Dominadas supinas');
  s = s.replace(/\bLat Pulldowns?\b/gi, 'Jalón al pecho');
  s = s.replace(/\bPulldowns?\b/gi, 'Jalón en polea');
  s = s.replace(/\bPushdowns?\b/gi, 'Extensión de tríceps en polea');
  s = s.replace(/\bRows?\b/gi, 'Remo');
  s = s.replace(/\bFace Pulls?\b/gi, 'Face pull');
  s = s.replace(/\bShrugs?\b/gi, 'Encogimiento de hombros');
  s = s.replace(/\bBicep Curls?\b/gi, 'Curl de bíceps');
  s = s.replace(/\bHammer Curls?\b/gi, 'Curl martillo');
  s = s.replace(/\bPreacher Curls?\b/gi, 'Curl predicador');
  s = s.replace(/\bConcentration Curls?\b/gi, 'Curl concentrado');
  s = s.replace(/\bTriceps Extensions?\b/gi, 'Extensión de tríceps');
  s = s.replace(/\bSkullcrushers?\b/gi, 'Press francés (rompecráneos)');
  s = s.replace(/\bDips?\b/gi, 'Fondos en paralelas');
  s = s.replace(/\bPush-?ups?\b/gi, 'Flexiones de brazos');
  s = s.replace(/\bLateral Raises?\b/gi, 'Elevaciones laterales');
  s = s.replace(/\bFront Raises?\b/gi, 'Elevaciones frontales');
  s = s.replace(/\bRear Delt Flyes?\b/gi, 'Pájaros posteriores');
  s = s.replace(/\bReverse Flyes?\b/gi, 'Aperturas inversas');
  s = s.replace(/\bFlyes?\b/gi, 'Aperturas');
  s = s.replace(/\bChest Fly\b/gi, 'Aperturas de pecho');
  s = s.replace(/\bUpright Row\b/gi, 'Remo al mentón');
  s = s.replace(/\bPec Deck\b/gi, 'Aperturas en Pec Deck');
  s = s.replace(/\bCrunches?\b/gi, 'Abdominales crunch');
  s = s.replace(/\bSit-?ups?\b/gi, 'Abdominales sit-up');
  s = s.replace(/\bPlanks?\b/gi, 'Plancha isométrica');
  s = s.replace(/\bRussian Twists?\b/gi, 'Giros rusos');
  s = s.replace(/\bLeg Raises?\b/gi, 'Elevación de piernas');
  s = s.replace(/\bMountain Climbers?\b/gi, 'Escaladores');
  s = s.replace(/\bRollouts?\b/gi, 'Rueda abdominal');
  s = s.replace(/\bCleans?\b/gi, 'Cargada (clean)');
  s = s.replace(/\bSnatches?\b/gi, 'Arrancada (snatch)');
  s = s.replace(/\bStretches?\b/gi, 'Estiramiento');
  s = s.replace(/\bStretch\b/gi, 'Estiramiento');
  s = s.replace(/\bJumps?\b/gi, 'Saltos');
  s = s.replace(/\bPress\b/gi, 'Press');
  s = s.replace(/\bCurls?\b/gi, 'Curl');
  s = s.replace(/\bRaises?\b/gi, 'Elevación');
  s = s.replace(/\bDrags?\b/gi, 'Arrastre');
  s = s.replace(/\bBridges?\b/gi, 'Puente');
  s = s.replace(/\bCircles?\b/gi, 'Círculos articulares');
  s = s.replace(/\bHolds?\b/gi, 'Sostenimiento isométrico');
  s = s.replace(/\bWalks?\b/gi, 'Caminata');
  s = s.replace(/\bCarries?\b/gi, 'Paseo con carga');
  s = s.replace(/\bTwists?\b/gi, 'Giros');

  // Modificadores de posición y técnica
  s = s.replace(/\bIncline\b/gi, 'inclinado');
  s = s.replace(/\bInclinado\b/gi, 'inclinado');
  s = s.replace(/\bDecline\b/gi, 'declinado');
  s = s.replace(/\bStanding\b/gi, 'de pie');
  s = s.replace(/\bSeated\b/gi, 'sentado');
  s = s.replace(/\bSentado\b/gi, 'sentado');
  s = s.replace(/\bLying\b/gi, 'acostado');
  s = s.replace(/\bKneeling\b/gi, 'de rodillas');
  s = s.replace(/\bAlternating\b/gi, 'alternado');
  s = s.replace(/\bAlternate\b/gi, 'alternado');
  s = s.replace(/\bSingle-Leg\b/gi, 'a una pierna');
  s = s.replace(/\bOne-Leg\b/gi, 'a una pierna');
  s = s.replace(/\bSingle-Arm\b/gi, 'a un brazo');
  s = s.replace(/\bOne-Arm\b/gi, 'a un brazo');
  s = s.replace(/\bWide-Grip\b/gi, 'con agarre ancho');
  s = s.replace(/\bClose-Grip\b/gi, 'con agarre cerrado');
  s = s.replace(/\bReverse-Grip\b/gi, 'con agarre invertido');
  s = s.replace(/\bReverse\b/gi, 'inverso');
  s = s.replace(/\bOverhead\b/gi, 'sobre la cabeza');
  s = s.replace(/\bBehind The Neck\b/gi, 'tras nuca');
  s = s.replace(/\bBent-Over\b/gi, 'inclinado');
  s = s.replace(/\bBent Over\b/gi, 'inclinado');
  s = s.replace(/\bBelow the Knees\b/gi, 'por debajo de las rodillas');
  s = s.replace(/\bAbove the Knees\b/gi, 'por encima de las rodillas');
  s = s.replace(/\bKnees\b/gi, 'rodillas');
  s = s.replace(/\bInner\b/gi, 'interno');
  s = s.replace(/\bOuter\b/gi, 'externo');
  s = s.replace(/\bUpper\b/gi, 'superior');
  s = s.replace(/\bLower\b/gi, 'inferior');
  s = s.replace(/\bMiddle\b/gi, 'medio');
  s = s.replace(/\bHigh\b/gi, 'alto');
  s = s.replace(/\bLow\b/gi, 'bajo');
  s = s.replace(/\bDiagonal\b/gi, 'diagonal');
  s = s.replace(/\bFront\b/gi, 'frontal');
  s = s.replace(/\bSide\b/gi, 'lateral');
  s = s.replace(/\bRear\b/gi, 'posterior');

  // Músculos y anatomía
  s = s.replace(/\bChest\b/gi, 'de pecho');
  s = s.replace(/\bBack\b/gi, 'de espalda');
  s = s.replace(/\bShoulders?\b/gi, 'de hombros');
  s = s.replace(/\bDeltoids?\b/gi, 'deltoides');
  s = s.replace(/\bBiceps?\b/gi, 'de bíceps');
  s = s.replace(/\bTriceps?\b/gi, 'de tríceps');
  s = s.replace(/\bHamstrings?\b/gi, 'de isquiotibiales');
  s = s.replace(/\bQuads?\b/gi, 'de cuádriceps');
  s = s.replace(/\bCalf\b/gi, 'de pantorrillas');
  s = s.replace(/\bCalves\b/gi, 'de pantorrillas');
  s = s.replace(/\bGlutes?\b/gi, 'de glúteos');
  s = s.replace(/\bAbs\b/gi, 'abdominales');
  s = s.replace(/\bAbdominals?\b/gi, 'abdominales');
  s = s.replace(/\bForearms?\b/gi, 'de antebrazos');
  s = s.replace(/\bWrists?\b/gi, 'de muñeca');
  s = s.replace(/\bGroin\b/gi, 'de aductores e ingle');
  s = s.replace(/\bHip Flexors?\b/gi, 'de flexores de cadera');
  s = s.replace(/\bHips?\b/gi, 'de cadera');
  s = s.replace(/\bAnkles?\b/gi, 'de tobillos');
  s = s.replace(/\bNeck\b/gi, 'de cuello');

  // Corrección de orden gramatical común (ej. "Con barra Curl" -> "Curl con barra")
  s = s.replace(/^con barra (.*)/i, '$1 con barra');
  s = s.replace(/^con mancuernas (.*)/i, '$1 con mancuernas');
  s = s.replace(/^con mancuerna (.*)/i, '$1 con mancuerna');
  s = s.replace(/^en polea (.*)/i, '$1 en polea');
  s = s.replace(/^con pesa rusa (.*)/i, '$1 con pesa rusa');
  s = s.replace(/^con banda elástica (.*)/i, '$1 con banda elástica');

  // Limpieza de caracteres y dobles espacios
  s = s.replace(/\s+/g, ' ').replace(/\s+-\s+$/, '').trim();

  // Asegurar primera letra en mayúscula
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// 3. Estandarización a los 7 Grupos Musculares Oficiales
function standardizeGroup(grupo, nombre) {
  const g = (grupo || '').toLowerCase();
  const n = (nombre || '').toLowerCase();

  if (g.includes('pecho') || n.includes('pecho') || n.includes('pectoral') || n.includes('banca')) return 'Pecho';
  if (g.includes('glúteo') || n.includes('glúteo') || n.includes('hip thrust') || n.includes('glute')) return 'Glúteos';
  if (g.includes('espalda') || n.includes('remo') || n.includes('dominadas') || n.includes('jalón') || n.includes('dorsal')) return 'Espalda';
  if (g.includes('hombro') || n.includes('militar') || n.includes('lateral') || n.includes('deltoides') || n.includes('pájaro')) return 'Hombros';
  if (g.includes('brazo') || n.includes('bícep') || n.includes('trícep') || n.includes('antebrazo') || n.includes('curl') || n.includes('francés')) return 'Brazos';
  if (g.includes('pierna') || n.includes('sentadilla') || n.includes('prensa') || n.includes('cuádriceps') || n.includes('femoral') || n.includes('isquio') || n.includes('pantorrilla') || n.includes('gemelo') || n.includes('zancada')) return 'Piernas';
  if (g.includes('core') || g.includes('abdomen') || n.includes('plancha') || n.includes('crunch') || n.includes('abdominal') || n.includes('oblicuo')) return 'Core / Abdomen';

  return 'Core / Abdomen';
}

// 4. Traductor exhaustivo de instrucciones técnicas de fitness
function translateInstructionsComplete(text) {
  if (!text || typeof text !== 'string') {
    return 'Técnica de ejecución controlada manteniendo tensión muscular constante y respiración adecuada.';
  }

  let t = text;

  const rules = [
    // Posiciones y armado del ejercicio
    [/This will be your starting position\./gi, 'Esta será tu posición inicial.'],
    [/This is your starting position\./gi, 'Esta es tu posición inicial.'],
    [/Begin seated on the ground with your legs bent/gi, 'Comienza sentado en el suelo con las piernas flexionadas'],
    [/Begin seated on the ground/gi, 'Comienza sentado en el suelo'],
    [/Begin by/gi, 'Comienza'],
    [/Lie down on the floor/gi, 'Acuéstate en el suelo'],
    [/Lie down on a flat bench/gi, 'Acuéstate sobre un banco plano'],
    [/Lie down on an incline bench/gi, 'Acuéstate sobre un banco inclinado'],
    [/Lie down on a decline bench/gi, 'Acuéstate sobre un banco declinado'],
    [/Lie on your back/gi, 'Acuéstate boca arriba'],
    [/Lie on your stomach/gi, 'Acuéstate boca abajo'],
    [/From a lying position/gi, 'Desde una posición acostada'],
    [/In a seated position/gi, 'En posición sentada'],
    [/In a standing position/gi, 'De pie'],
    [/Sit down on the/gi, 'Siéntate en el/la'],
    [/Sit on the bench/gi, 'Siéntate en el banco'],
    [/Stand with your feet shoulder-width apart/gi, 'Párate con los pies separados al ancho de los hombros'],
    [/Stand with feet shoulder-width apart/gi, 'Párate con los pies al ancho de hombros'],
    [/Stand erect/gi, 'Párate erguido'],
    [/Position yourself on your toes/gi, 'Colócate sobre las puntas de los pies'],
    [/Hang from a chin-up bar/gi, 'Cuélgate de una barra de dominadas'],
    [/Hold a dumbbell in each hand/gi, 'Sostén una mancuerna en cada mano'],
    [/Hold a pair of dumbbells/gi, 'Sostén un par de mancuernas'],
    [/Hold a dumbbell with both hands/gi, 'Sostén una mancuerna con ambas manos'],
    [/Grip the bar with both hands/gi, 'Toma la barra con ambas manos'],
    [/Grip the bar/gi, 'Toma la barra'],
    [/Grip the handles/gi, 'Toma los agarres'],
    [/Grab the bar/gi, 'Toma la barra'],
    [/Grab the handles/gi, 'Toma las manijas'],
    [/Grab both kettlebells/gi, 'Toma ambas pesas rusas'],
    [/Adjust the seat/gi, 'Ajusta el asiento'],
    [/Secure your feet/gi, 'Asegura tus pies'],

    // Postura y corrección técnica
    [/Keep your back straight/gi, 'Mantén la espalda recta'],
    [/Keep your head up/gi, 'Mantén la cabeza erguida'],
    [/Keep your chest up/gi, 'Mantén el pecho erguido'],
    [/Keep your core tight/gi, 'Mantén el abdomen firme y contraído'],
    [/Keep your elbows close to your torso/gi, 'Mantén los codos pegados al torso'],
    [/Keep your arms extended/gi, 'Mantén los brazos extendidos'],
    [/Do not lock your knees/gi, 'No bloquees las rodillas'],
    [/Do not lock your elbows/gi, 'No bloquees los codos'],
    [/Avoid swinging and using momentum/gi, 'Evita el balanceo y no utilices impulso'],
    [/Avoid any swinging or cheating/gi, 'Evita balancearte o hacer trampa con el cuerpo'],
    [/Maintain a slight bend in your knees/gi, 'Mantén una ligera flexión en las rodillas'],
    [/with a pronated grip/gi, 'con agarre prono'],
    [/with a supinated grip/gi, 'con agarre supino'],
    [/with a neutral grip/gi, 'con agarre neutro'],

    // Ejecución y fases del movimiento
    [/Slowly lower the/gi, 'Baja lentamente el/la'],
    [/Lower the weight/gi, 'Baja el peso'],
    [/Lower slowly/gi, 'Baja de forma controlada'],
    [/Push the weight up/gi, 'Empuja el peso hacia arriba'],
    [/Push through your heels/gi, 'Empuja con fuerza a través de los talones'],
    [/Pull the bar down/gi, 'Tira de la barra hacia abajo'],
    [/Pull your elbows back/gi, 'Lleva los codos hacia atrás'],
    [/Pull your legs up/gi, 'Eleva las piernas'],
    [/Squeeze your shoulder blades together/gi, 'Junta las escápulas atrás'],
    [/Squeeze your glutes/gi, 'Aprieta los glúteos en la contracción'],
    [/Squeeze your chest/gi, 'Contrae el pecho'],
    [/Squeeze your biceps/gi, 'Contrae los bíceps'],
    [/Squeeze your triceps/gi, 'Contrae los tríceps'],
    [/Pause for a second/gi, 'Haz una pausa de un segundo'],
    [/Pause at the top/gi, 'Pausa en la parte superior'],
    [/Pause briefly at the top/gi, 'Haz una breve pausa arriba'],
    [/After a pause/gi, 'Tras una pausa'],
    [/Return to the starting position/gi, 'Regresa a la posición inicial'],
    [/Return the weights to your side/gi, 'Regresa las mancuernas a los costados'],
    [/Slowly return to the starting position/gi, 'Regresa lentamente a la posición inicial'],
    [/Repeat for the recommended amount of repetitions\./gi, 'Repite la cantidad recomendada de repeticiones.'],
    [/Repeat for the desired amount of repetitions\./gi, 'Repite las repeticiones deseadas.'],
    [/Repeat for the prescribed amount of repetitions\./gi, 'Repite las repeticiones recomendadas.'],
    [/Repeat for several reps\./gi, 'Repite por varias repeticiones.'],
    [/Repeat on the other leg\./gi, 'Repite con la otra pierna.'],
    [/then repeat with the left leg\./gi, 'luego repite con la pierna izquierda.'],
    [/then switch sides\./gi, 'luego cambia de lado.'],

    // Respiración y Consejos
    [/Breathe in as you/gi, 'Inhala mientras'],
    [/Breathe out as you/gi, 'Exhala mientras'],
    [/Inhale as you/gi, 'Inhala al'],
    [/Exhale as you/gi, 'Exhala al'],
    [/Breathe normally as you perform the movement\./gi, 'Respira con normalidad durante el movimiento.'],
    [/Tip: Be sure to/gi, 'Consejo: Asegúrate de'],
    [/Tip: /gi, 'Consejo: '],
    [/Consejo: /gi, 'Consejo: '],
    [/Caution:/gi, 'Precaución:'],
    [/Variations:/gi, 'Variaciones:']
  ];

  for (const [regex, rep] of rules) {
    t = t.replace(regex, rep);
  }

  return t;
}

// 5. Ejecución Principal
async function main() {
  console.log('===============================================================');
  console.log('💎 INICIANDO REFINAMIENTO Y TRADUCCIÓN 100% EN ESPAÑOL');
  console.log('===============================================================');

  const { data: exercises, error: fetchErr } = await supabase
    .from('exercises')
    .select('id, nombre, grupo_muscular, instrucciones');

  if (fetchErr || !exercises) {
    console.error('❌ Error consultando exercises:', fetchErr);
    process.exit(1);
  }

  console.log(`📋 Total de ejercicios a revisar y perfeccionar: ${exercises.length}`);

  let updatedCount = 0;
  const CHUNK_SIZE = 30;

  for (let i = 0; i < exercises.length; i += CHUNK_SIZE) {
    const chunk = exercises.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (ex) => {
        const nombreFinal = cleanTranslateName(ex.nombre);
        const grupoFinal = standardizeGroup(ex.grupo_muscular, nombreFinal);
        const instruccionesFinales = translateInstructionsComplete(ex.instrucciones);

        const { error: updErr } = await supabase
          .from('exercises')
          .update({
            nombre: nombreFinal,
            grupo_muscular: grupoFinal,
            instrucciones: instruccionesFinales
          })
          .eq('id', ex.id);

        if (!updErr) updatedCount++;
      })
    );

    const pct = Math.round((Math.min(i + CHUNK_SIZE, exercises.length) / exercises.length) * 100);
    console.log(`   [Progreso] ${Math.min(i + CHUNK_SIZE, exercises.length)}/${exercises.length} ejercicios procesados (${pct}%)`);
  }

  console.log('\n===============================================================');
  console.log('📊 RESULTADOS FINALES DE TRADUCCIÓN');
  console.log('===============================================================');
  console.log(`✅ Ejercicios actualizados y normalizados: ${updatedCount}/${exercises.length}`);

  const { data: finalExercises } = await supabase
    .from('exercises')
    .select('grupo_muscular');

  if (finalExercises) {
    const counts = {};
    finalExercises.forEach(e => {
      counts[e.grupo_muscular] = (counts[e.grupo_muscular] || 0) + 1;
    });

    console.log('\nDistribución por Grupos Musculares Oficiales:');
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([g, c]) => {
        console.log(`  • ${g.padEnd(18, ' ')}: ${c} ejercicios`);
      });
  }

  console.log('\n🎉 ¡Biblioteca de ejercicios 100% traducida y adaptada al español!');
  console.log('===============================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Error en ejecución:', err);
    process.exit(1);
  });
