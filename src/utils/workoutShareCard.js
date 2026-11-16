/**
 * Utilidad para la generación de imágenes de resumen de entrenamiento
 * optimizadas para Instagram Stories (formato 9:16 vertical, 1080 × 1920 px).
 * Construido con HTML5 Canvas nativo, sin dependencias externas pesadas.
 */

// Formatear fecha en español: "Lunes, 16 de noviembre de 2026"
export function formatWorkoutDate(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const diaSemana = dias[d.getDay()];
  const diaMes = d.getDate();
  const mes = meses[d.getMonth()];
  const anio = d.getFullYear();

  return `${diaSemana}, ${diaMes} de ${mes} de ${anio}`;
}

// Helper para dibujar rectángulos con esquinas redondeadas
function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = typeof radius === 'number' 
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : { tl: radius.tl || 0, tr: radius.tr || 0, br: radius.br || 0, bl: radius.bl || 0 };

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

// Truncar texto con puntos suspensivos si excede el ancho máximo
function fitText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Genera la imagen PNG del resumen de entrenamiento en resolución Full HD vertical (1080 × 1920).
 * 
 * @param {Object} workoutData
 * @param {string} workoutData.studentName - Nombre del alumno
 * @param {string} workoutData.routineName - Nombre de la rutina
 * @param {string} workoutData.dayName - Nombre del día / sesión (ej: "Día 1 • Pecho y Bíceps")
 * @param {number|string} [workoutData.weekNumber] - Número de semana del ciclo
 * @param {Array} workoutData.exercises - Lista de ejercicios completados
 * @param {number} workoutData.totalSets - Total de series ejecutadas
 * @param {number} workoutData.completedExercisesCount - Cantidad de ejercicios completados
 * @param {number} workoutData.totalExercisesCount - Total de ejercicios en la rutina
 * @param {number} workoutData.totalVolumeKg - Carga total levantada en kg (peso * reps)
 * @param {number} workoutData.totalReps - Total de repeticiones acumuladas
 * @param {string} [workoutData.dateFormatted] - Fecha formateada (opcional)
 * 
 * @returns {Promise<{ blob: Blob, file: File, dataUrl: string }>}
 */
export async function generateWorkoutSummaryImage(workoutData) {
  // Asegurar que las fuentes web estén completamente cargadas antes de pintar el canvas
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continuar con fuentes del sistema si falla
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d', { alpha: false });

  const {
    studentName = 'Atleta',
    routineName = 'Rutina Personalizada',
    dayName = 'Sesión de Entrenamiento',
    weekNumber = null,
    exercises = [],
    totalSets = 0,
    completedExercisesCount = 0,
    totalExercisesCount = 0,
    totalVolumeKg = 0,
    totalReps = 0,
    dateFormatted = formatWorkoutDate(new Date())
  } = workoutData || {};

  // ==========================================================
  // 1. FONDO PRINCIPAL Y GRADIENTES RADIALES (DARK PREMIUM)
  // ==========================================================
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 1080, 1920);

  // Gradiente radial superior (Rojo brand cálido)
  const topGlow = ctx.createRadialGradient(540, 180, 50, 540, 180, 650);
  topGlow.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
  topGlow.addColorStop(0.5, 'rgba(185, 28, 28, 0.12)');
  topGlow.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, 1080, 900);

  // Gradiente radial inferior derecho (Acento sutil de profundidad)
  const botGlow = ctx.createRadialGradient(900, 1650, 80, 900, 1650, 750);
  botGlow.addColorStop(0, 'rgba(220, 38, 38, 0.16)');
  botGlow.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = botGlow;
  ctx.fillRect(0, 1000, 1080, 920);

  // Gradiente radial lateral izquierdo (Toque atmosférico)
  const sideGlow = ctx.createRadialGradient(100, 900, 40, 100, 900, 500);
  sideGlow.addColorStop(0, 'rgba(239, 68, 68, 0.08)');
  sideGlow.addColorStop(1, 'rgba(9, 9, 11, 0)');
  ctx.fillStyle = sideGlow;
  ctx.fillRect(0, 500, 600, 900);

  // Patrón geométrico sutil de cuadrícula deportiva
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = gridSize; x < 1080; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1920);
    ctx.stroke();
  }
  for (let y = gridSize; y < 1920; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1080, y);
    ctx.stroke();
  }

  // ==========================================================
  // 2. MARCO PRINCIPAL VIDRIADO (GLASSMORPHIC FRAME)
  // ==========================================================
  const frameX = 54;
  const frameY = 64;
  const frameW = 972;
  const frameH = 1792;
  const frameRadius = 46;

  // Sombra del contenedor
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;

  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
  ctx.fillStyle = 'rgba(18, 18, 24, 0.82)';
  ctx.fill();
  ctx.restore();

  // Borde fino del marco con gradiente elegante
  const frameBorderGrad = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
  frameBorderGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
  frameBorderGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.12)');
  frameBorderGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
  frameBorderGrad.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
  ctx.strokeStyle = frameBorderGrad;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
  ctx.stroke();

  // ==========================================================
  // 3. CABECERA SUPERIOR: BADGE + BRANDING + FECHA
  // ==========================================================
  // Pill Badge: "ENTRENAMIENTO COMPLETADO ✓"
  const badgeW = 440;
  const badgeH = 52;
  const badgeX = (1080 - badgeW) / 2;
  const badgeY = 120;

  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 26);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Punto brillante dentro del badge
  ctx.beginPath();
  ctx.arc(badgeX + 32, badgeY + badgeH / 2, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  ctx.font = '700 17px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENTRENAMIENTO COMPLETADO  ✓', 540 + 8, badgeY + badgeH / 2);

  // Título Principal del Entrenador: "ESTEBAN CORREA"
  ctx.font = '900 52px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '3px';
  ctx.fillText('ESTEBAN CORREA', 540, 240);

  // Subtítulo: "PERSONAL TRAINER • ALTO RENDIMIENTO"
  ctx.font = '800 18px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ef4444';
  ctx.letterSpacing = '5px';
  ctx.fillText('PERSONAL TRAINER', 540, 274);
  ctx.letterSpacing = '0px';

  // Fecha del entrenamiento
  ctx.font = '500 19px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(dateFormatted, 540, 312);

  // Línea divisoria suave bajo la cabecera
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 342);
  ctx.lineTo(980, 342);
  ctx.stroke();

  // ==========================================================
  // 4. TARJETA DE LA SESIÓN Y DEL ALUMNO
  // ==========================================================
  const sessionCardX = 96;
  const sessionCardY = 372;
  const sessionCardW = 888;
  const sessionCardH = 176;

  drawRoundedRect(ctx, sessionCardX, sessionCardY, sessionCardW, sessionCardH, 26);
  ctx.fillStyle = 'rgba(26, 26, 36, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Barra de acento izquierda roja
  drawRoundedRect(ctx, sessionCardX + 18, sessionCardY + 28, 6, 120, 3);
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  // Etiqueta: "SESIÓN DEL DÍA"
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 14px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ef4444';
  ctx.letterSpacing = '2px';
  const weekLabel = weekNumber ? `SEMANA ${weekNumber} • ` : '';
  ctx.fillText(`${weekLabel}SESIÓN DE HOY`, sessionCardX + 42, sessionCardY + 54);
  ctx.letterSpacing = '0px';

  // Título del Día (ej: "Día 1 - Pecho y Bíceps")
  ctx.font = '800 32px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  const cleanDayTitle = fitText(ctx, dayName, 560);
  ctx.fillText(cleanDayTitle, sessionCardX + 42, sessionCardY + 98);

  // Nombre de la Rutina
  ctx.font = '500 18px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  const cleanRoutineTitle = fitText(ctx, routineName, 560);
  ctx.fillText(cleanRoutineTitle, sessionCardX + 42, sessionCardY + 134);

  // Badge del Alumno (Costado derecho de la tarjeta de sesión)
  const athleteBadgeW = 230;
  const athleteBadgeH = 68;
  const athleteBadgeX = sessionCardX + sessionCardW - athleteBadgeW - 24;
  const athleteBadgeY = sessionCardY + (sessionCardH - athleteBadgeH) / 2;

  drawRoundedRect(ctx, athleteBadgeX, athleteBadgeY, athleteBadgeW, athleteBadgeH, 18);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '700 12px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ef4444';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('ATLETA', athleteBadgeX + 18, athleteBadgeY + 26);
  ctx.letterSpacing = '0px';

  ctx.font = '800 18px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  const cleanStudentName = fitText(ctx, studentName, athleteBadgeW - 36);
  ctx.fillText(cleanStudentName, athleteBadgeX + 18, athleteBadgeY + 50);

  // ==========================================================
  // 5. TARJETAS DE MÉTRICAS CLAVE (3 KPIS)
  // ==========================================================
  const kpiY = 574;
  const kpiH = 186;
  const kpiW = 280;
  const kpiGap = 24;
  const kpiStartX = sessionCardX;

  const kpisData = [
    {
      label: 'EJERCICIOS',
      sublabel: 'Completados',
      value: `${completedExercisesCount || exercises.length} / ${totalExercisesCount || exercises.length}`,
      accentColor: '#ef4444',
      glow: true
    },
    {
      label: 'SERIES TOTALES',
      sublabel: 'Ejecutadas hoy',
      value: `${totalSets || (exercises.length * 4)}`,
      accentColor: '#f97316',
      glow: false
    },
    {
      label: totalVolumeKg > 0 ? 'VOLUMEN LEVANTADO' : 'TOTAL REPETICIONES',
      sublabel: totalVolumeKg > 0 ? 'Carga acumulada' : 'Reps ejecutadas',
      value: totalVolumeKg > 0 
        ? `${Math.round(totalVolumeKg).toLocaleString('es-AR')} kg` 
        : `${totalReps > 0 ? totalReps : (totalSets || 16) * 10} reps`,
      accentColor: '#10b981',
      glow: true
    }
  ];

  kpisData.forEach((kpi, idx) => {
    const cardX = kpiStartX + idx * (kpiW + kpiGap);

    drawRoundedRect(ctx, cardX, kpiY, kpiW, kpiH, 24);
    ctx.fillStyle = 'rgba(26, 26, 36, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Línea de color superior
    drawRoundedRect(ctx, cardX + 18, kpiY, kpiW - 36, 3, 2);
    ctx.fillStyle = kpi.accentColor;
    ctx.fill();

    // Etiqueta del KPI
    ctx.textAlign = 'center';
    ctx.font = '800 13px "Montserrat", "Inter", sans-serif';
    ctx.fillStyle = kpi.accentColor;
    ctx.letterSpacing = '1.5px';
    ctx.fillText(kpi.label, cardX + kpiW / 2, kpiY + 44);
    ctx.letterSpacing = '0px';

    // Valor del KPI
    ctx.font = '900 42px "Montserrat", "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    // Si el valor es largo (ej: 12.500 kg), reducir tamaño para que nunca desborde
    if (kpi.value.length > 7) {
      ctx.font = '900 34px "Montserrat", "Inter", sans-serif';
    }
    ctx.fillText(kpi.value, cardX + kpiW / 2, kpiY + 112);

    // Sublabel
    ctx.font = '500 15px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(kpi.sublabel, cardX + kpiW / 2, kpiY + 150);
  });

  // ==========================================================
  // 6. LISTADO DE EJERCICIOS REALIZADOS (HASTA 7 ITEMS)
  // ==========================================================
  const listCardX = sessionCardX;
  const listCardY = 786;
  const listCardW = sessionCardW;
  const listCardH = 820;

  drawRoundedRect(ctx, listCardX, listCardY, listCardW, listCardH, 28);
  ctx.fillStyle = 'rgba(20, 20, 28, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header del Listado
  ctx.textAlign = 'left';
  ctx.font = '800 17px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '1px';
  ctx.fillText('DETALLE DEL ENTRENAMIENTO', listCardX + 32, listCardY + 46);
  ctx.letterSpacing = '0px';

  // Badge contador derecho: "X EJERCICIOS"
  const countBadgeText = `${exercises.length} EJERCICIOS`;
  ctx.font = '800 13px "Montserrat", "Inter", sans-serif';
  ctx.letterSpacing = '1px';
  const countBadgeW = ctx.measureText(countBadgeText).width + 28;
  const countBadgeH = 34;
  const countBadgeX = listCardX + listCardW - countBadgeW - 32;
  const countBadgeY = listCardY + 24;

  drawRoundedRect(ctx, countBadgeX, countBadgeY, countBadgeW, countBadgeH, 12);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.fillText(countBadgeText, countBadgeX + countBadgeW / 2, countBadgeY + 22);
  ctx.letterSpacing = '0px';

  // Línea separadora bajo el header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(listCardX + 24, listCardY + 70);
  ctx.lineTo(listCardX + listCardW - 24, listCardY + 70);
  ctx.stroke();

  // Dibujar cada ejercicio (hasta 7)
  const maxExercisesToShow = 7;
  const visibleExercises = exercises.slice(0, maxExercisesToShow);
  const remainingCount = exercises.length - maxExercisesToShow;
  const rowH = 92;
  const startRowY = listCardY + 82;

  visibleExercises.forEach((ex, i) => {
    const rowY = startRowY + i * rowH;
    const isEven = i % 2 === 0;

    // Fondo alternado sutil
    if (isEven) {
      drawRoundedRect(ctx, listCardX + 16, rowY + 4, listCardW - 32, rowH - 8, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fill();
    }

    // Número índice (01, 02...)
    const numX = listCardX + 32;
    const numY = rowY + 18;
    drawRoundedRect(ctx, numX, numY, 44, 44, 12);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 16px "Montserrat", "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(i + 1).padStart(2, '0'), numX + 22, numY + 22);

    // Nombre del Ejercicio
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    const rawName = ex.name || ex.exercise?.nombre || ex.nombre || 'Ejercicio';
    const cleanExName = fitText(ctx, rawName, 520);
    ctx.fillText(cleanExName, listCardX + 94, rowY + 42);

    // Detalle de Series, Reps y Peso
    ctx.font = '500 16px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    
    // Obtener desglose de sets / reps / peso
    const sCount = ex.totalSets || ex.series || 4;
    const repsStr = ex.reps || ex.repeticiones || '10-12';
    const weightStr = ex.weight ? `${ex.weight} kg` : (ex.peso_sugerido ? `${ex.peso_sugerido}` : null);
    const detailText = weightStr 
      ? `${sCount} series × ${repsStr} reps • ${weightStr}`
      : `${sCount} series × ${repsStr} reps`;

    ctx.fillText(detailText, listCardX + 94, rowY + 68);

    // Badge Checkmark Verde de Completado
    const checkCircleX = listCardX + listCardW - 54;
    const checkCircleY = rowY + 40;
    ctx.beginPath();
    ctx.arc(checkCircleX, checkCircleY, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '900 16px "Inter", sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', checkCircleX, checkCircleY);
  });

  // Si hay más de 7 ejercicios, mostrar banner de adicionales
  if (remainingCount > 0) {
    const extraBannerY = startRowY + maxExercisesToShow * rowH - 12;
    drawRoundedRect(ctx, listCardX + 24, extraBannerY, listCardW - 48, 52, 16);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 16px "Montserrat", "Inter", sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText(`+ ${remainingCount} EJERCICIOS MÁS COMPLETADOS CON ÉXITO`, listCardX + listCardW / 2, extraBannerY + 26);
  }

  // ==========================================================
  // 7. FOOTER INFERIOR: BRANDING, REDES Y MOTIVACIÓN
  // ==========================================================
  const footerY = 1630;

  // Línea divisoria elegante
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, footerY);
  ctx.lineTo(980, footerY);
  ctx.stroke();

  // Emblema circular "EC"
  const logoX = 130;
  const logoY = footerY + 36;
  const logoR = 40;

  ctx.beginPath();
  ctx.arc(logoX, logoY, logoR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = '900 32px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EC', logoX, logoY);

  // Textos de marca del Coach
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 24px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '1px';
  ctx.fillText('ESTEBAN CORREA', logoX + 54, logoY - 4);
  ctx.letterSpacing = '0px';

  ctx.font = '600 16px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Construí tu mejor versión • Entrenamiento Personalizado', logoX + 54, logoY + 24);

  // Badge Redes Sociales / Instagram
  const igBadgeW = 240;
  const igBadgeH = 50;
  const igBadgeX = listCardX + listCardW - igBadgeW - 16;
  const igBadgeY = footerY + 18;

  drawRoundedRect(ctx, igBadgeX, igBadgeY, igBadgeW, igBadgeH, 16);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 17px "Montserrat", "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('@estebancorrea.trainer', igBadgeX + igBadgeW / 2, igBadgeY + igBadgeH / 2);

  // ==========================================================
  // 8. GENERACIÓN DE BLOB, FILE Y DATA URL
  // ==========================================================
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar el archivo de imagen desde Canvas'));
          return;
        }

        const fileName = `entrenamiento-esteban-correa-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        const dataUrl = canvas.toDataURL('image/png');

        resolve({
          blob,
          file,
          dataUrl
        });
      },
      'image/png',
      1.0
    );
  });
}
