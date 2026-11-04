// Datos de muestra iniciales y realistas para Esteban Correa Personal Trainer

export const INITIAL_COACH = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'Esteban Correa',
  email: 'esteban@trainer.com',
  telefono: '+54 9 11 5555-0199',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  bio: 'Especialista en Hipertrofia, Fuerza y Recomposición Corporal. Más de 8 años transformando vidas.'
};

// Base de alumnos local eliminada: la aplicación consulta exclusivamente la tabla 'clients' de Supabase
export const INITIAL_CLIENTS = [];

export const INITIAL_EXERCISES = [
  {
    id: 'ex-01',
    nombre: 'Press de Banca Plano con Barra',
    grupo_muscular: 'Pecho',
    imagen_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-out-in-a-gym-42617-large.mp4',
    instrucciones: 'Retracción escapular firme, pies apoyados en el suelo, descenso controlado al tercio medio del esternón y empuje explosivo sin despegar glúteos.',
    errores_comunes: '• No despegar los glúteos del banco durante el empuje.\n• Evitar el rebote violento de la barra contra el pecho.\n• No abrir excesivamente los codos en 90° (mantenerlos a 45°-60° del torso).'
  },
  {
    id: 'ex-02',
    nombre: 'Press Inclinado con Mancuernas',
    grupo_muscular: 'Pecho',
    imagen_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-working-out-with-dumbbells-in-a-gym-42613-large.mp4',
    instrucciones: 'Banco a 30-45°. Enfatizar el estiramiento en la fase excéntrica y convergencia arriba sin chocar mancuernas.',
    errores_comunes: '• No inclinar el banco a más de 45° (involucra demasiado el deltoides anterior).\n• Evitar chocar las mancuernas arriba para no perder tensión.\n• No hiperextender la columna lumbar para compensar la carga.'
  },
  {
    id: 'ex-03',
    nombre: 'Cruces en Polea Media / Baja',
    grupo_muscular: 'Pecho',
    imagen_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-training-with-weights-in-a-gym-42615-large.mp4',
    instrucciones: 'Codos ligeramente semiflexionados. Mantener tensión constante durante todo el recorrido y sostener 1 segundo en contracción.',
    errores_comunes: '• No doblar y estirar los codos simulando un press (el movimiento es un abrazo con codos fijos).\n• Evitar inclinarse hacia adelante con el impulso del tronco.'
  },
  {
    id: 'ex-04',
    nombre: 'Dominadas con Agarre Prono',
    grupo_muscular: 'Espalda',
    imagen_url: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-out-in-a-gym-42617-large.mp4',
    instrucciones: 'Traccionar desde los codos, llevar el pecho a la barra y descender con control total hasta extensión completa sin balanceos.',
    errores_comunes: '• Evitar el balanceo (kipping) con piernas o cadera.\n• No acortar el rango: bajar hasta estiramiento completo sin soltar la tensión escapular.\n• No adelantar la cabeza encorvando los hombros al llegar arriba.'
  },
  {
    id: 'ex-05',
    nombre: 'Remo con Barra 45° (Pendlay / Convencional)',
    grupo_muscular: 'Espalda',
    imagen_url: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-training-with-weights-in-a-gym-42615-large.mp4',
    instrucciones: 'Tronco firme con columna neutra. Llevar la barra a la parte superior del ombligo apretando dorsales.',
    errores_comunes: '• No encorvar la zona lumbar al estar inclinado hacia adelante.\n• Evitar erguir el torso a 90° convirtiéndolo en un encogimiento de trapecios.\n• No dar tirones con los brazos antes de iniciar la tracción escapular.'
  },
  {
    id: 'ex-06',
    nombre: 'Jalón al Pecho en Polea Agarre Neutro',
    grupo_muscular: 'Espalda',
    imagen_url: 'https://images.unsplash.com/photo-1584865288642-42078afe6942?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-out-in-a-gym-42617-large.mp4',
    instrucciones: 'Inclinación leve de 15°, tirar los codos hacia abajo y atrás sin arquear en exceso la zona lumbar.',
    errores_comunes: '• No acostarse hacia atrás tirando con el peso del cuerpo.\n• Evitar bajar la barra por detrás de la nuca (riesgo cervical innecesario).\n• No despegar los muslos del soporte acolchado.'
  },
  {
    id: 'ex-07',
    nombre: 'Sentadilla Trasera con Barra Olímpica',
    grupo_muscular: 'Piernas',
    imagen_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-squats-with-a-barbell-in-a-gym-42621-large.mp4',
    instrucciones: 'Posición de pies al ancho de hombros, brace abdominal (maniobra de Valsalva), profundidad mínima paralela.',
    errores_comunes: '• No despegar los talones del suelo al bajar.\n• Evitar el colapso de las rodillas hacia adentro (valgo de rodilla).\n• Mantener la columna lumbar neutra evitando el redondeo en el fondo (butt wink).'
  },
  {
    id: 'ex-08',
    nombre: 'Prensa 45° a Una / Dos Piernas',
    grupo_muscular: 'Piernas',
    imagen_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-squats-with-a-barbell-in-a-gym-42621-large.mp4',
    instrucciones: 'Pies centrados en la plataforma. Bajar lento hasta flexión profunda sin despegar el coxis del respaldo.',
    errores_comunes: '• No despegar el coxis ni la pelvis del respaldo al flexionar.\n• ¡NUNCA hiperbloquear las rodillas en la extensión máxima!\n• No apoyar las manos en las rodillas para empujar.'
  },
  {
    id: 'ex-09',
    nombre: 'Peso Muerto Rumano con Mancuernas',
    grupo_muscular: 'Piernas',
    imagen_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-exercising-with-dumbbells-in-a-gym-42611-large.mp4',
    instrucciones: 'Bisagra de cadera pronunciada hacia atrás, rodillas con flexión mínima constante y espalda recta sintiendo tensión en isquiotibiales.',
    errores_comunes: '• No flexionar excesivamente las rodillas (es bisagra de cadera, no sentadilla).\n• No encorvar la columna dorsal ni lumbar al descender.\n• Mantener las mancuernas bien pegadas a las piernas en todo momento.'
  },
  {
    id: 'ex-10',
    nombre: 'Press Militar de Hombros con Mancuernas',
    grupo_muscular: 'Hombros',
    imagen_url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-working-out-with-dumbbells-in-a-gym-42613-large.mp4',
    instrucciones: 'Codos ligeramente apuntando en el plano escapular (30° hacia adelante), empuje vertical y control al bajar.',
    errores_comunes: '• No arquear exageradamente la zona lumbar para compensar la carga.\n• Mantener abdomen y glúteos contraídos para fijar la pelvis.\n• No dejar caer bruscamente las mancuernas en la bajada.'
  },
  {
    id: 'ex-11',
    nombre: 'Elevaciones Laterales en Polea',
    grupo_muscular: 'Hombros',
    imagen_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-working-out-with-dumbbells-in-a-gym-42613-large.mp4',
    instrucciones: 'Polea a la altura de la muñeca opuesta. Elevar en ángulo ligeramente diagonal hasta altura de hombros.',
    errores_comunes: '• No encoger los hombros (trapecios) antes de elevar el brazo.\n• No balancear el torso para iniciar la subida.\n• Evitar superar la línea de los hombros si genera pinzamiento.'
  },
  {
    id: 'ex-12',
    nombre: 'Curl de Bíceps en Banco Scott',
    grupo_muscular: 'Brazos',
    imagen_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-exercising-with-dumbbells-in-a-gym-42611-large.mp4',
    instrucciones: 'Aislación estricta de bíceps. Evitar hiperextensión brusca de codo al final y subir con contracción máxima.',
    errores_comunes: '• No hiperextender bruscamente el codo al final de la bajada (riesgo en el tendón distal).\n• No despegar los tríceps del acolchado del banco.'
  },
  {
    id: 'ex-13',
    nombre: 'Extensiones de Tríceps en Polea Alta',
    grupo_muscular: 'Brazos',
    imagen_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-training-with-weights-in-a-gym-42615-large.mp4',
    instrucciones: 'Codos pegados al torso, extensión completa abriendo la cuerda al final de la trayectoria.',
    errores_comunes: '• No adelantar ni atrasar los codos durante la extensión (deben estar anclados al torso).\n• Evitar inclinarse sobre la polea para empujar con el pecho.'
  },
  {
    id: 'ex-14',
    nombre: 'Plancha Abdominal Isométrica + Vacío',
    grupo_muscular: 'Core',
    imagen_url: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=500&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-squats-with-a-barbell-in-a-gym-42621-large.mp4',
    instrucciones: 'Línea recta de talones a cabeza, glúteos contraídos y ombligo empujado hacia la columna.',
    errores_comunes: '• No dejar caer la cadera hacia el suelo (provoca dolor lumbar inmediato).\n• No subir la cadera formando una V invertida.\n• No contener la respiración: mantener respiración diafragmática fluida.'
  }
];

export const INITIAL_ROUTINE = {
  id: 'rou-01',
  client_id: 'cli-001', // Martín Gómez
  nombre: 'Fuerza & Recomposición - Torso / Pierna',
  objetivo: 'Aumento de fuerza submáxima y quema calórica',
  nivel: 'Intermedio-Avanzado',
  activo: true,
  dias: [
    {
      dia: 'Día 1: Torso & Empuje (Lunes)',
      dia_semana: 'Lunes',
      ejercicios: [
        {
          id: 're-01',
          exercise: INITIAL_EXERCISES[0], // Press plano
          series: 4,
          repeticiones: '6-8',
          peso_sugerido: '75 kg',
          descanso_seg: 120,
          notas: 'Series efectivas con RPE 8. Descanso estricto.'
        },
        {
          id: 're-02',
          exercise: INITIAL_EXERCISES[4], // Remo con barra
          series: 4,
          repeticiones: '8-10',
          peso_sugerido: '70 kg',
          descanso_seg: 90,
          notas: 'Mantener paralelo al suelo.'
        },
        {
          id: 're-03',
          exercise: INITIAL_EXERCISES[1], // Press inclinado
          series: 3,
          repeticiones: '10-12',
          peso_sugerido: '26 kg c/m',
          descanso_seg: 90,
          notas: 'Bajar en 3 segundos (cadencia 3-0-1).'
        },
        {
          id: 're-04',
          exercise: INITIAL_EXERCISES[5], // Jalón polea
          series: 3,
          repeticiones: '10-12',
          peso_sugerido: '65 kg',
          descanso_seg: 75,
          notas: 'Apretar escápulas 1 segundo abajo.'
        },
        {
          id: 're-05',
          exercise: INITIAL_EXERCISES[10], // Laterales
          series: 4,
          repeticiones: '15',
          peso_sugerido: '10 kg polea',
          descanso_seg: 60,
          notas: 'Burnout en la última serie.'
        }
      ]
    },
    {
      dia: 'Día 2: Piernas & Core (Martes)',
      dia_semana: 'Martes',
      ejercicios: [
        {
          id: 're-06',
          exercise: INITIAL_EXERCISES[6], // Sentadilla
          series: 4,
          repeticiones: '8',
          peso_sugerido: '90 kg',
          descanso_seg: 150,
          notas: 'Controlar bajada. Zapatillas planas.'
        },
        {
          id: 're-07',
          exercise: INITIAL_EXERCISES[7], // Prensa
          series: 4,
          repeticiones: '12-15',
          peso_sugerido: '160 kg',
          descanso_seg: 90,
          notas: 'Rango amplio sin despegar caderas.'
        },
        {
          id: 're-08',
          exercise: INITIAL_EXERCISES[8], // Peso muerto rumano
          series: 3,
          repeticiones: '10-12',
          peso_sugerido: '30 kg c/m',
          descanso_seg: 90,
          notas: 'Tensión permanente en femorales.'
        },
        {
          id: 're-09',
          exercise: INITIAL_EXERCISES[13], // Plancha
          series: 3,
          repeticiones: '45 seg',
          peso_sugerido: 'Peso corporal',
          descanso_seg: 60,
          notas: 'Respiración diafragmática continua.'
        }
      ]
    },
    {
      dia: 'Día 3: Tracción & Brazos (Jueves)',
      dia_semana: 'Jueves',
      ejercicios: [
        {
          id: 're-10',
          exercise: INITIAL_EXERCISES[4], // Remo con barra
          series: 4,
          repeticiones: '10',
          peso_sugerido: '65 kg',
          descanso_seg: 90,
          notas: 'Agarre supino para mayor estímulo de bíceps.'
        },
        {
          id: 're-11',
          exercise: INITIAL_EXERCISES[11], // Curl con barra
          series: 3,
          repeticiones: '12',
          peso_sugerido: '30 kg',
          descanso_seg: 75,
          notas: 'Codos pegados al torso, sin balanceo.'
        },
        {
          id: 're-12',
          exercise: INITIAL_EXERCISES[12], // Extensiones tríceps
          series: 3,
          repeticiones: '12-15',
          peso_sugerido: '25 kg polea',
          descanso_seg: 60,
          notas: 'Extensión completa y bloqueo 1 seg.'
        }
      ]
    },
    {
      dia: 'Día 4: Hombros & Potencia (Viernes)',
      dia_semana: 'Viernes',
      ejercicios: [
        {
          id: 're-13',
          exercise: INITIAL_EXERCISES[9], // Press militar
          series: 4,
          repeticiones: '8-10',
          peso_sugerido: '50 kg',
          descanso_seg: 120,
          notas: 'Glúteos y core firmes durante el empuje.'
        },
        {
          id: 're-14',
          exercise: INITIAL_EXERCISES[10], // Vuelos laterales
          series: 4,
          repeticiones: '15',
          peso_sugerido: '12 kg c/m',
          descanso_seg: 60,
          notas: 'Control excéntrico en 2 segundos.'
        },
        {
          id: 're-15',
          exercise: INITIAL_EXERCISES[13], // Plancha
          series: 3,
          repeticiones: '60 seg',
          peso_sugerido: 'Peso corporal',
          descanso_seg: 60,
          notas: 'Enfoque en resistencia abdominal profunda.'
        }
      ]
    }
  ]
};

export const INITIAL_EVALUATIONS = [
  {
    id: 'eval-01',
    client_id: 'cli-001',
    fecha: '2024-01-10',
    peso: 86.5,
    porcentaje_grasa: 22.4,
    cintura: 94.0,
    cadera: 104.0,
    brazo: 36.5,
    muslo: 61.0,
    notas: 'Evaluación inicial diagnóstica. Buen estado muscular pero exceso de tejido adiposo visceral.'
  },
  {
    id: 'eval-02',
    client_id: 'cli-001',
    fecha: '2024-02-15',
    peso: 84.8,
    porcentaje_grasa: 20.8,
    cintura: 91.5,
    cadera: 103.0,
    brazo: 37.0,
    muslo: 61.5,
    notas: 'Primer mes: -1.7 kg de peso neto, reducción notable en cintura (-2.5 cm).'
  },
  {
    id: 'eval-03',
    client_id: 'cli-001',
    fecha: '2024-03-20',
    peso: 83.2,
    porcentaje_grasa: 18.9,
    cintura: 88.5,
    cadera: 101.5,
    brazo: 37.8,
    muslo: 62.0,
    notas: 'Excelente evolución. Ganancia de masa muscular en brazos y pérdida sostenida de cintura.'
  },
  {
    id: 'eval-04',
    client_id: 'cli-001',
    fecha: '2024-04-25',
    peso: 81.5,
    porcentaje_grasa: 17.2,
    cintura: 86.0,
    cadera: 100.0,
    brazo: 38.2,
    muslo: 62.5,
    notas: 'Última evaluación: -5.0 kg total, cintura -8.0 cm y brazo +1.7 cm. Estado óptimo.'
  }
];

export const INITIAL_APPOINTMENTS = [];

export const INITIAL_PAYMENTS = [
  {
    id: 'pay-01',
    client_id: 'cli-001',
    client_name: 'Martín Gómez',
    plan_nombre: 'Plan 4x Semanal Personalizado',
    monto: 45000,
    fecha_pago: '2026-10-28',
    fecha_vencimiento: '2026-11-28',
    metodo: 'Transferencia',
    estado: 'Pagado'
  },
  {
    id: 'pay-02',
    client_id: 'cli-002',
    client_name: 'Lucía Fernández',
    plan_nombre: 'Plan Fuerza Femenina 3x',
    monto: 38000,
    fecha_pago: '2026-10-30',
    fecha_vencimiento: '2026-11-30',
    metodo: 'MercadoPago',
    estado: 'Pagado'
  },
  {
    id: 'pay-03',
    client_id: 'cli-003',
    client_name: 'Rodrigo Morales',
    plan_nombre: 'Asesoría Online Integral',
    monto: 28000,
    fecha_pago: '2026-10-15',
    fecha_vencimiento: '2026-11-15',
    metodo: 'Transferencia',
    estado: 'Pagado'
  },
  {
    id: 'pay-04',
    client_id: 'cli-004',
    client_name: 'Camila Vega',
    plan_nombre: 'Plan Fitness 3x Semanal',
    monto: 38000,
    fecha_pago: '2026-10-02',
    fecha_vencimiento: '2026-11-02',
    metodo: 'Efectivo',
    estado: 'Pendiente' // Vence o por vencer
  },
  {
    id: 'pay-05',
    client_id: 'cli-005',
    client_name: 'Javier Ruiz',
    plan_nombre: 'Plan Híbrido Flexible',
    monto: 32000,
    fecha_pago: '2026-09-10',
    fecha_vencimiento: '2026-10-10',
    metodo: 'Transferencia',
    estado: 'Vencido'
  }
];

export const WEEKLY_CHART_DATA = [
  { dia: 'Lun', programados: 14, asistencias: 13 },
  { dia: 'Mar', programados: 12, asistencias: 12 },
  { dia: 'Mié', programados: 15, asistencias: 14 },
  { dia: 'Jue', programados: 11, asistencias: 10 },
  { dia: 'Vie', programados: 13, asistencias: 12 },
  { dia: 'Sáb', programados: 8, asistencias: 8 }
];

export const MONTHLY_INCOME_DATA = [
  { mes: 'Jun', total: 680000 },
  { mes: 'Jul', total: 790000 },
  { mes: 'Ago', total: 850000 },
  { mes: 'Sep', total: 940000 },
  { mes: 'Oct', total: 1020000 },
  { mes: 'Nov (Est.)', total: 1150000 }
];
