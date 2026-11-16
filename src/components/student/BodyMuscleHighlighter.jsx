import React from 'react';

/**
 * Normaliza nombres de grupos musculares y ejercicios para identificar qué zonas anatómicas pintar.
 * Soporta entradas como: "Pecho", "Pectoral", "Press Banca", "Espalda", "Dorsales", "Remo", "Piernas", "Cuádriceps", etc.
 */
export function extractActiveMuscleGroups(exercises = [], explicitGroups = []) {
  const active = new Set();

  const add = (key) => active.add(key.toLowerCase().trim());

  // Agregar grupos explícitos si vienen dados
  (explicitGroups || []).forEach(g => {
    if (!g) return;
    const str = String(g).toLowerCase();
    if (str.includes('pecho') || str.includes('pectoral')) add('pecho');
    if (str.includes('espalda') || str.includes('dorsal') || str.includes('trapecio') || str.includes('remo') || str.includes('jalon')) add('espalda');
    if (str.includes('hombro') || str.includes('deltoid')) add('hombros');
    if (str.includes('bicep') || str.includes('brazo')) add('biceps');
    if (str.includes('tricep')) add('triceps');
    if (str.includes('core') || str.includes('abdomen') || str.includes('abdominal') || str.includes('abs')) add('core');
    if (str.includes('pierna') || str.includes('cuad') || str.includes('femoral') || str.includes('isquio') || str.includes('gluteo') || str.includes('sentadilla') || str.includes('prensa')) {
      add('cuadriceps');
      add('isquios');
      add('gluteos');
      add('gemelos');
    }
  });

  // Analizar cada ejercicio de la sesión
  (exercises || []).forEach(item => {
    const rawName = String(item.name || item.exercise?.nombre || item.nombre || '').toLowerCase();
    const rawGroup = String(item.muscleGroup || item.exercise?.grupo_muscular || item.grupo_muscular || '').toLowerCase();
    const combined = `${rawName} ${rawGroup}`;

    // Pecho
    if (combined.includes('pecho') || combined.includes('pectoral') || combined.includes('banca') || combined.includes('apertura') || combined.includes('cruce') || combined.includes('push up') || combined.includes('flexion')) {
      add('pecho');
      add('triceps'); // sinergista
    }

    // Espalda
    if (combined.includes('espalda') || combined.includes('dorsal') || combined.includes('remo') || combined.includes('jalon') || combined.includes('dominada') || combined.includes('pull') || combined.includes('pulldown') || combined.includes('peso muerto')) {
      add('espalda');
      add('biceps'); // sinergista
      if (combined.includes('peso muerto')) {
        add('gluteos');
        add('isquios');
      }
    }

    // Hombros
    if (combined.includes('hombro') || combined.includes('deltoid') || combined.includes('militar') || combined.includes('lateral') || combined.includes('frontal') || combined.includes('pajaros') || combined.includes('press arnold')) {
      add('hombros');
      add('trapecio');
    }

    // Bíceps
    if (combined.includes('bicep') || combined.includes('curl') || combined.includes('martillo')) {
      add('biceps');
    }

    // Tríceps
    if (combined.includes('tricep') || combined.includes('frances') || combined.includes('fondo') || combined.includes('polea tricep') || combined.includes('copa') || combined.includes('extension tricep')) {
      add('triceps');
    }

    // Core / Abdomen
    if (combined.includes('core') || combined.includes('abdomen') || combined.includes('abdominal') || combined.includes('plank') || combined.includes('plancha') || combined.includes('crunch') || combined.includes('rueda')) {
      add('core');
    }

    // Piernas generales / Cuádriceps
    if (combined.includes('pierna') || combined.includes('sentadilla') || combined.includes('squat') || combined.includes('prensa') || combined.includes('cuad') || combined.includes('estocada') || combined.includes('lunge') || combined.includes('sillon')) {
      add('cuadriceps');
      add('gluteos');
    }

    // Isquios / Femorales
    if (combined.includes('isquio') || combined.includes('femoral') || combined.includes('curl femoral') || combined.includes('camilla') || combined.includes('peso muerto rumano')) {
      add('isquios');
      add('gluteos');
    }

    // Glúteos
    if (combined.includes('gluteo') || combined.includes('hip thrust') || combined.includes('patada') || combined.includes('abductor')) {
      add('gluteos');
    }

    // Gemelos / Pantorrillas
    if (combined.includes('gemelo') || combined.includes('pantorrilla') || combined.includes('soleo') || combined.includes('elevacion talon')) {
      add('gemelos');
    }
  });

  return Array.from(active);
}

/**
 * Componente SVG de Silueta Humana Frontal y Dorsal con resaltado de grupos musculares.
 * Los músculos activos se colorean con `#ef4444` (Rojo brand) y brillo.
 * Los músculos inactivos permanecen en gris oscuro elegante `#27272a`.
 */
export default function BodyMuscleHighlighter({
  activeMuscles = [],
  className = '',
  accentColor = '#ef4444',
  inactiveColor = '#27272a',
  glow = true
}) {
  const activeSet = new Set((activeMuscles || []).map(m => String(m).toLowerCase().trim()));

  const isMActive = (...keys) => keys.some(k => activeSet.has(k.toLowerCase().trim()));

  const getColor = (...keys) => (isMActive(...keys) ? accentColor : inactiveColor);
  const getFilter = (...keys) => (isMActive(...keys) && glow ? 'url(#muscleGlow)' : 'none');
  const getStroke = (...keys) => (isMActive(...keys) ? '#f87171' : '#3f3f46');

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 540 540"
        className="w-full h-full max-h-[520px] select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Filtro de brillo sutil para músculos activados */}
          <filter id="muscleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.93  0 0.27 0 0 0.27  0 0 0.27 0 0.27  0 0 0 0.8 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="bodyBaseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1e24" />
            <stop offset="100%" stopColor="#121217" />
          </linearGradient>
        </defs>

        {/* ETIQUETAS DE ORIENTACIÓN */}
        <g opacity="0.6">
          <text
            x="145"
            y="32"
            textAnchor="middle"
            fill="#a1a1aa"
            fontSize="14"
            fontWeight="800"
            letterSpacing="3"
          >
            VISTA FRONTAL
          </text>
          <text
            x="395"
            y="32"
            textAnchor="middle"
            fill="#a1a1aa"
            fontSize="14"
            fontWeight="800"
            letterSpacing="3"
          >
            VISTA POSTERIOR
          </text>
        </g>

        {/* ======================================================== */}
        {/* SILUETA 1: FRENTE (Centro X ~ 145)                        */}
        {/* ======================================================== */}
        <g id="figure-front" transform="translate(0, 10)">
          {/* Cabeza y cuello (Frontal) */}
          <ellipse cx="145" cy="62" rx="19" ry="24" fill="#18181f" stroke="#3f3f46" strokeWidth="1.5" />
          <path d="M 137 84 L 137 100 L 153 100 L 153 84 Z" fill="#18181f" />

          {/* Trapecio / Cuello Superior */}
          <path
            d="M 134 94 Q 145 98 156 94 L 165 106 L 125 106 Z"
            fill={getColor('trapecio', 'hombros', 'espalda')}
            filter={getFilter('trapecio', 'hombros', 'espalda')}
            stroke={getStroke('trapecio', 'hombros', 'espalda')}
            strokeWidth="1"
          />

          {/* Hombros / Deltoides Frontales */}
          {/* Hombro Izquierdo */}
          <path
            d="M 125 106 Q 106 108 100 125 Q 106 142 118 140 Q 124 125 125 106 Z"
            fill={getColor('hombros')}
            filter={getFilter('hombros')}
            stroke={getStroke('hombros')}
            strokeWidth="1"
          />
          {/* Hombro Derecho */}
          <path
            d="M 165 106 Q 184 108 190 125 Q 184 142 172 140 Q 166 125 165 106 Z"
            fill={getColor('hombros')}
            filter={getFilter('hombros')}
            stroke={getStroke('hombros')}
            strokeWidth="1"
          />

          {/* Pecho / Pectorales */}
          {/* Pectoral Izquierdo */}
          <path
            d="M 143 108 L 126 108 Q 120 125 122 145 Q 138 152 143 144 Z"
            fill={getColor('pecho')}
            filter={getFilter('pecho')}
            stroke={getStroke('pecho')}
            strokeWidth="1.2"
          />
          {/* Pectoral Derecho */}
          <path
            d="M 147 108 L 164 108 Q 170 125 168 145 Q 152 152 147 144 Z"
            fill={getColor('pecho')}
            filter={getFilter('pecho')}
            stroke={getStroke('pecho')}
            strokeWidth="1.2"
          />

          {/* Bíceps (Frontal) */}
          {/* Bíceps Izquierdo */}
          <path
            d="M 103 138 Q 94 150 94 175 Q 106 182 113 172 Q 115 152 113 138 Z"
            fill={getColor('biceps', 'brazos')}
            filter={getFilter('biceps', 'brazos')}
            stroke={getStroke('biceps', 'brazos')}
            strokeWidth="1"
          />
          {/* Bíceps Derecho */}
          <path
            d="M 187 138 Q 196 150 196 175 Q 184 182 177 172 Q 175 152 177 138 Z"
            fill={getColor('biceps', 'brazos')}
            filter={getFilter('biceps', 'brazos')}
            stroke={getStroke('biceps', 'brazos')}
            strokeWidth="1"
          />

          {/* Antebrazos (Frontal) */}
          {/* Antebrazo Izquierdo */}
          <path
            d="M 94 178 Q 84 205 82 240 Q 94 242 101 230 Q 108 200 108 178 Z"
            fill={getColor('brazos', 'biceps')}
            filter={getFilter('brazos', 'biceps')}
            stroke={getStroke('brazos', 'biceps')}
            strokeWidth="1"
          />
          {/* Antebrazo Derecho */}
          <path
            d="M 196 178 Q 206 205 208 240 Q 196 242 189 230 Q 182 200 182 178 Z"
            fill={getColor('brazos', 'biceps')}
            filter={getFilter('brazos', 'biceps')}
            stroke={getStroke('brazos', 'biceps')}
            strokeWidth="1"
          />
          {/* Manos */}
          <ellipse cx="80" cy="254" rx="6" ry="11" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
          <ellipse cx="210" cy="254" rx="6" ry="11" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />

          {/* Abdominales y Core */}
          {/* Recto Abdominal Superior */}
          <path
            d="M 132 150 L 143 150 L 143 168 L 132 168 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />
          <path
            d="M 147 150 L 158 150 L 158 168 L 147 168 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />
          {/* Recto Abdominal Medio */}
          <path
            d="M 132 171 L 143 171 L 143 189 L 132 189 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />
          <path
            d="M 147 171 L 158 171 L 158 189 L 147 189 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />
          {/* Recto Abdominal Inferior */}
          <path
            d="M 133 192 L 143 192 L 143 212 L 135 212 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />
          <path
            d="M 147 192 L 157 192 L 155 212 L 147 212 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />
          {/* Oblicuos */}
          <path
            d="M 124 154 Q 130 180 131 210 Q 120 205 118 175 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />
          <path
            d="M 166 154 Q 160 180 159 210 Q 170 205 172 175 Z"
            fill={getColor('core')}
            filter={getFilter('core')}
            stroke={getStroke('core')}
            strokeWidth="1"
          />

          {/* Pelvis / Cadera */}
          <path d="M 128 214 L 162 214 L 155 235 L 135 235 Z" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />

          {/* Cuádriceps (Muslos Frontales) */}
          {/* Cuádriceps Izquierdo */}
          <path
            d="M 125 224 Q 112 245 110 290 Q 115 330 128 340 Q 140 330 142 285 Q 140 240 130 224 Z"
            fill={getColor('cuadriceps', 'piernas')}
            filter={getFilter('cuadriceps', 'piernas')}
            stroke={getStroke('cuadriceps', 'piernas')}
            strokeWidth="1.2"
          />
          {/* Cuádriceps Derecho */}
          <path
            d="M 165 224 Q 178 245 180 290 Q 175 330 162 340 Q 150 330 148 285 Q 150 240 160 224 Z"
            fill={getColor('cuadriceps', 'piernas')}
            filter={getFilter('cuadriceps', 'piernas')}
            stroke={getStroke('cuadriceps', 'piernas')}
            strokeWidth="1.2"
          />

          {/* Rodillas */}
          <circle cx="127" cy="350" r="7" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
          <circle cx="163" cy="350" r="7" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />

          {/* Pantorrillas / Tibiales (Frontales) */}
          {/* Gemelo/Tibial Izquierdo */}
          <path
            d="M 121 358 Q 114 390 118 440 Q 128 445 133 440 Q 137 395 133 358 Z"
            fill={getColor('gemelos', 'piernas')}
            filter={getFilter('gemelos', 'piernas')}
            stroke={getStroke('gemelos', 'piernas')}
            strokeWidth="1"
          />
          {/* Gemelo/Tibial Derecho */}
          <path
            d="M 169 358 Q 176 390 172 440 Q 162 445 157 440 Q 153 395 157 358 Z"
            fill={getColor('gemelos', 'piernas')}
            filter={getFilter('gemelos', 'piernas')}
            stroke={getStroke('gemelos', 'piernas')}
            strokeWidth="1"
          />

          {/* Pies (Frontales) */}
          <ellipse cx="124" cy="456" rx="8" ry="12" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
          <ellipse cx="166" cy="456" rx="8" ry="12" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
        </g>

        {/* ======================================================== */}
        {/* SILUETA 2: ESPALDA (Centro X ~ 395)                       */}
        {/* ======================================================== */}
        <g id="figure-back" transform="translate(0, 10)">
          {/* Cabeza y cuello (Posterior) */}
          <ellipse cx="395" cy="62" rx="19" ry="24" fill="#18181f" stroke="#3f3f46" strokeWidth="1.5" />
          <path d="M 387 84 L 387 100 L 403 100 L 403 84 Z" fill="#18181f" />

          {/* Trapecio y Espalda Alta */}
          <path
            d="M 384 94 Q 395 100 406 94 L 420 110 L 395 148 L 370 110 Z"
            fill={getColor('espalda', 'trapecio')}
            filter={getFilter('espalda', 'trapecio')}
            stroke={getStroke('espalda', 'trapecio')}
            strokeWidth="1.2"
          />

          {/* Deltoides Posteriores (Hombros Espalda) */}
          {/* Hombro Posterior Izquierdo */}
          <path
            d="M 375 106 Q 356 108 350 125 Q 356 142 368 140 Q 374 125 375 106 Z"
            fill={getColor('hombros')}
            filter={getFilter('hombros')}
            stroke={getStroke('hombros')}
            strokeWidth="1"
          />
          {/* Hombro Posterior Derecho */}
          <path
            d="M 415 106 Q 434 108 440 125 Q 434 142 422 140 Q 416 125 415 106 Z"
            fill={getColor('hombros')}
            filter={getFilter('hombros')}
            stroke={getStroke('hombros')}
            strokeWidth="1"
          />

          {/* Tríceps (Posterior) */}
          {/* Tríceps Izquierdo */}
          <path
            d="M 353 138 Q 344 152 344 176 Q 356 182 363 172 Q 365 152 363 138 Z"
            fill={getColor('triceps', 'brazos')}
            filter={getFilter('triceps', 'brazos')}
            stroke={getStroke('triceps', 'brazos')}
            strokeWidth="1"
          />
          {/* Tríceps Derecho */}
          <path
            d="M 437 138 Q 446 152 446 176 Q 434 182 427 172 Q 425 152 427 138 Z"
            fill={getColor('triceps', 'brazos')}
            filter={getFilter('triceps', 'brazos')}
            stroke={getStroke('triceps', 'brazos')}
            strokeWidth="1"
          />

          {/* Antebrazo Posterior */}
          <path
            d="M 344 178 Q 334 205 332 240 Q 344 242 351 230 Q 358 200 358 178 Z"
            fill={getColor('brazos', 'triceps')}
            filter={getFilter('brazos', 'triceps')}
            stroke={getStroke('brazos', 'triceps')}
            strokeWidth="1"
          />
          <path
            d="M 446 178 Q 456 205 458 240 Q 446 242 439 230 Q 432 200 432 178 Z"
            fill={getColor('brazos', 'triceps')}
            filter={getFilter('brazos', 'triceps')}
            stroke={getStroke('brazos', 'triceps')}
            strokeWidth="1"
          />
          {/* Manos Posteriores */}
          <ellipse cx="330" cy="254" rx="6" ry="11" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
          <ellipse cx="460" cy="254" rx="6" ry="11" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />

          {/* Dorsales (Lats) */}
          {/* Dorsal Izquierdo */}
          <path
            d="M 370 125 Q 365 155 373 192 Q 388 185 393 150 Z"
            fill={getColor('espalda')}
            filter={getFilter('espalda')}
            stroke={getStroke('espalda')}
            strokeWidth="1.2"
          />
          {/* Dorsal Derecho */}
          <path
            d="M 420 125 Q 425 155 417 192 Q 402 185 397 150 Z"
            fill={getColor('espalda')}
            filter={getFilter('espalda')}
            stroke={getStroke('espalda')}
            strokeWidth="1.2"
          />

          {/* Lumbar / Espalda Baja */}
          <path
            d="M 380 188 L 410 188 L 405 214 L 385 214 Z"
            fill={getColor('espalda', 'core')}
            filter={getFilter('espalda', 'core')}
            stroke={getStroke('espalda', 'core')}
            strokeWidth="1"
          />

          {/* Glúteos */}
          {/* Glúteo Izquierdo */}
          <path
            d="M 374 214 Q 368 238 372 260 Q 384 272 394 260 Q 396 230 395 214 Z"
            fill={getColor('gluteos', 'piernas')}
            filter={getFilter('gluteos', 'piernas')}
            stroke={getStroke('gluteos', 'piernas')}
            strokeWidth="1.2"
          />
          {/* Glúteo Derecho */}
          <path
            d="M 416 214 Q 422 238 418 260 Q 406 272 396 260 Q 394 230 395 214 Z"
            fill={getColor('gluteos', 'piernas')}
            filter={getFilter('gluteos', 'piernas')}
            stroke={getStroke('gluteos', 'piernas')}
            strokeWidth="1.2"
          />

          {/* Isquiotibiales (Femorales) */}
          {/* Isquio Izquierdo */}
          <path
            d="M 372 264 Q 366 295 372 338 Q 384 340 392 334 Q 394 295 394 264 Z"
            fill={getColor('isquios', 'piernas')}
            filter={getFilter('isquios', 'piernas')}
            stroke={getStroke('isquios', 'piernas')}
            strokeWidth="1.2"
          />
          {/* Isquio Derecho */}
          <path
            d="M 418 264 Q 424 295 418 338 Q 406 340 398 334 Q 396 295 396 264 Z"
            fill={getColor('isquios', 'piernas')}
            filter={getFilter('isquios', 'piernas')}
            stroke={getStroke('isquios', 'piernas')}
            strokeWidth="1.2"
          />

          {/* Hueco Poplíteo (Atrás de rodillas) */}
          <circle cx="377" cy="350" r="7" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
          <circle cx="413" cy="350" r="7" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />

          {/* Gemelos / Pantorrillas (Posterior) */}
          {/* Gemelo Izquierdo */}
          <path
            d="M 371 358 Q 360 385 368 438 Q 378 444 383 438 Q 387 395 383 358 Z"
            fill={getColor('gemelos', 'piernas')}
            filter={getFilter('gemelos', 'piernas')}
            stroke={getStroke('gemelos', 'piernas')}
            strokeWidth="1.2"
          />
          {/* Gemelo Derecho */}
          <path
            d="M 419 358 Q 430 385 422 438 Q 412 444 407 438 Q 403 395 407 358 Z"
            fill={getColor('gemelos', 'piernas')}
            filter={getFilter('gemelos', 'piernas')}
            stroke={getStroke('gemelos', 'piernas')}
            strokeWidth="1.2"
          />

          {/* Talones y Pies */}
          <ellipse cx="374" cy="454" rx="8" ry="10" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
          <ellipse cx="416" cy="454" rx="8" ry="10" fill="#18181f" stroke="#3f3f46" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
