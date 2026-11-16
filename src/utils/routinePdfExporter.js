import * as jspdfMod from 'jspdf';
import * as autoTableMod from 'jspdf-autotable';

// Resolver constructor jsPDF de forma universal para ESM/CJS/Vite
const getJsPDFConstructor = () => {
  if (typeof jspdfMod.jsPDF === 'function') return jspdfMod.jsPDF;
  if (typeof jspdfMod.default === 'function') return jspdfMod.default;
  if (typeof jspdfMod === 'function') return jspdfMod;
  if (typeof window !== 'undefined') {
    if (typeof window.jspdf?.jsPDF === 'function') return window.jspdf.jsPDF;
    if (typeof window.jsPDF === 'function') return window.jsPDF;
  }
  throw new Error('No se pudo inicializar la librería jsPDF.');
};

// Resolver función autoTable de forma universal para ESM/CJS/Vite
const renderAutoTable = (doc, options) => {
  const fn = autoTableMod.default || autoTableMod.autoTable || autoTableMod;
  if (typeof fn === 'function') {
    return fn(doc, options);
  }
  if (typeof doc.autoTable === 'function') {
    return doc.autoTable(options);
  }
  throw new Error('No se pudo inicializar el plugin jspdf-autotable.');
};

/**
 * Utilidad profesional para exportar rutinas a PDF en formato A4 optimizado para impresión.
 * Diseñado con estética limpia, fondo blanco, bajo consumo de tinta y tipografía de alta legibilidad.
 */

// Formatear fecha en formato legible (ej: "16/11/2026")
function formatDate(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Limpiar cadenas para nombres de archivo seguros
function sanitizeFileName(str) {
  if (!str) return 'Rutina';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

// Obtener etiqueta amigable del tipo de duración
function getDurationLabel(durationType, totalWeeks = 1) {
  if (durationType === 'quarterly' || totalWeeks === 12) return 'Plan Trimestral (12 Semanas)';
  if (durationType === 'monthly' || totalWeeks === 4) return 'Plan Mensual (4 Semanas)';
  if (totalWeeks > 1) return `Plan de ${totalWeeks} Semanas`;
  return 'Plan Semanal (1 Semana)';
}

// Formatear descanso en segundos o minutos
function formatRest(seconds) {
  if (!seconds && seconds !== 0) return '90 s';
  const sec = parseInt(seconds, 10);
  if (isNaN(sec)) return String(seconds);
  if (sec >= 60 && sec % 60 === 0) {
    const mins = Math.floor(sec / 60);
    return `${mins} min`;
  }
  return `${sec} s`;
}

// Formatear carga o peso
function formatWeight(weight) {
  if (weight === null || weight === undefined || weight === '') return '—';
  const num = parseFloat(weight);
  if (!isNaN(num) && num > 0) return `${num} kg`;
  if (typeof weight === 'string' && weight.trim() !== '') return weight.trim();
  return '—';
}

/**
 * Exporta una rutina completa o una semana específica a un archivo PDF (formato A4).
 * 
 * @param {Object} routine - Objeto de la rutina (nombre, objetivo, client, dias, duration_type, total_weeks)
 * @param {Object} options
 * @param {string} [options.studentName] - Nombre del alumno para la carátula y archivo
 * @param {number} [options.selectedWeek] - Número de semana actual/seleccionada (1 a 12)
 * @param {boolean} [options.exportAllWeeks=true] - Si es true y la rutina es multi-semana, exporta todas las semanas
 * @param {string} [options.coachName="Esteban Correa"] - Nombre del entrenador
 * @param {string} [options.coachTitle="Personal Trainer"] - Título del entrenador
 * @param {string} [options.coachContact="@estebancorrea.trainer"] - Contacto / Instagram
 * 
 * @returns {Promise<{ doc: jsPDF, fileName: string, totalPages: number }>}
 */
export async function exportRoutineToPdf(routine, options = {}) {
  if (!routine) {
    throw new Error('No se proporcionó ninguna rutina para exportar.');
  }

  const {
    studentName = routine.client?.nombre_completo || (routine.es_plantilla ? 'Plantilla / Modelo General' : 'Alumno'),
    selectedWeek = 1,
    exportAllWeeks = true,
    coachName = 'ESTEBAN CORREA',
    coachTitle = 'PERSONAL TRAINER • ALTO RENDIMIENTO',
    coachContact = '@estebancorrea.trainer'
  } = options;

  const totalWeeks = parseInt(routine.total_weeks, 10) || 1;
  const durationType = routine.duration_type || (totalWeeks > 4 ? 'quarterly' : totalWeeks > 1 ? 'monthly' : 'weekly');
  const routineDays = routine.dias || routine.days || [];
  const routineName = routine.nombre || routine.title || 'Rutina Personalizada';
  const routineDesc = routine.descripcion || routine.objetivo || '';

  // Determinar qué semanas exportar
  let weeksToExport = [1];
  if (totalWeeks > 1) {
    if (exportAllWeeks) {
      weeksToExport = Array.from({ length: totalWeeks }, (_, i) => i + 1);
    } else {
      weeksToExport = [Math.max(1, Math.min(selectedWeek, totalWeeks))];
    }
  }

  // Inicializar documento jsPDF (A4 vertical en milímetros: 210 x 297 mm)
  const JsPdfClass = getJsPDFConstructor();
  const doc = new JsPdfClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const marginX = 14; // Margen izquierdo y derecho (14 mm)
  const contentWidth = pageWidth - (marginX * 2); // 182 mm
  let currentY = 14;

  // ==========================================================
  // 1. DIBUJAR CABECERA PRINCIPAL (PÁGINA 1)
  // ==========================================================
  
  // Barra superior decorativa con color institucional (Rojo brand #ef4444)
  doc.setFillColor(239, 68, 68);
  doc.rect(marginX, currentY, contentWidth, 3, 'F');
  currentY += 8;

  // Título del Coach y Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27); // #18181b
  doc.text(coachName, marginX, currentY);

  // Subtítulo del Coach
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 38, 38); // #dc2626
  doc.text(coachTitle, marginX, currentY + 4.5);

  // Datos de contacto y fecha a la derecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91); // #52525b
  const fechaTexto = `Fecha: ${formatDate(new Date())}`;
  doc.text(fechaTexto, pageWidth - marginX, currentY, { align: 'right' });
  doc.text(coachContact, pageWidth - marginX, currentY + 4.5, { align: 'right' });

  currentY += 10;

  // Línea divisoria suave
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 5;

  // ==========================================================
  // 2. TARJETA RESUMEN DE LA RUTINA Y DEL ALUMNO
  // ==========================================================
  const summaryBoxY = currentY;
  const summaryBoxH = routineDesc ? 28 : 22;

  // Fondo tenue gris claro para la tarjeta
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.roundedRect(marginX, summaryBoxY, contentWidth, summaryBoxH, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, summaryBoxY, contentWidth, summaryBoxH, 2.5, 2.5, 'S');

  // Nombre de la Rutina
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(routineName, marginX + 4, summaryBoxY + 6.5);

  // Fila de Metadatos: Alumno + Planificación + Frecuencia
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // #475569

  let metaX = marginX + 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Alumno / Destinatario: ', metaX, summaryBoxY + 12);
  metaX += doc.getTextWidth('Alumno / Destinatario: ');
  doc.setFont('helvetica', 'normal');
  doc.text(studentName, metaX, summaryBoxY + 12);

  // Planificación
  const planInfo = getDurationLabel(durationType, totalWeeks);
  const weekInfo = (!exportAllWeeks && totalWeeks > 1) ? ` (Semana ${selectedWeek} de ${totalWeeks})` : '';
  const rightPlanText = `${planInfo}${weekInfo}`;
  doc.setFont('helvetica', 'bold');
  doc.text('Esquema: ', pageWidth - marginX - 4 - doc.getTextWidth(`Esquema: ${rightPlanText}`), summaryBoxY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(rightPlanText, pageWidth - marginX - 4, summaryBoxY + 12, { align: 'right' });

  // Descripción u objetivo si existe
  if (routineDesc) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const splitDesc = doc.splitTextToSize(`Objetivo / Indicaciones: ${routineDesc}`, contentWidth - 8);
    doc.text(splitDesc[0], marginX + 4, summaryBoxY + 19);
  }

  currentY = summaryBoxY + summaryBoxH + 7;

  // ==========================================================
  // 3. GENERACIÓN DE TABLAS POR SEMANA Y POR DÍA
  // ==========================================================
  let isFirstWeek = true;

  for (const weekNum of weeksToExport) {
    // Si la rutina tiene múltiples semanas y no es la primera, evaluar salto de página
    if (!isFirstWeek && exportAllWeeks && totalWeeks > 1) {
      doc.addPage();
      currentY = 16;
    }
    isFirstWeek = false;

    // Filtrar días correspondientes a esta semana
    let daysInWeek = routineDays.filter(d => (d.week_number || 1) === weekNum);
    // Fallback: si los días no tenían week_number asignado y es semana 1, tomar todos
    if (daysInWeek.length === 0 && weekNum === 1) {
      daysInWeek = routineDays;
    }

    // Banner de la Semana (solo si el plan contempla más de 1 semana)
    if (totalWeeks > 1) {
      // Verificar espacio para encabezado de semana
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFillColor(241, 245, 249); // #f1f5f9
      doc.roundedRect(marginX, currentY, contentWidth, 7.5, 1.5, 1.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, currentY, contentWidth, 7.5, 1.5, 1.5, 'S');

      // Título de la semana
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`SEMANA ${weekNum} DE ${totalWeeks}`, marginX + 4, currentY + 5);

      // Total de días en esta semana
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${daysInWeek.length} sesiones programadas`, pageWidth - marginX - 4, currentY + 5, { align: 'right' });

      currentY += 11;
    }

    // Si no hay días cargados en esta semana
    if (daysInWeek.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No hay sesiones programadas para esta semana.', marginX + 4, currentY + 4);
      currentY += 10;
      continue;
    }

    // Iterar cada día de entrenamiento de la semana
    for (let dayIdx = 0; dayIdx < daysInWeek.length; dayIdx++) {
      const day = daysInWeek[dayIdx];
      const dayNumber = day.dia_numero || dayIdx + 1;
      const dayName = (day.dia || day.dia_nombre || `Día ${dayNumber}`).trim();
      const exercises = day.ejercicios || day.exercises || [];

      // Si nos acercamos al final de la página antes de empezar un día nuevo, agregar página
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 16;
      }

      // Encabezado del Día de Entrenamiento
      doc.setFillColor(239, 68, 68);
      doc.circle(marginX + 2.5, currentY + 2.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const cleanDayTitle = dayName.toUpperCase().startsWith('DÍA') ? dayName : `DÍA ${dayNumber} — ${dayName}`;
      doc.text(cleanDayTitle, marginX + 6, currentY + 4);

      // Subtítulo con total de ejercicios
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${exercises.length} ejercicios`, pageWidth - marginX, currentY + 4, { align: 'right' });

      currentY += 6.5;

      // Si el día no contiene ejercicios cargados
      if (exercises.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Sin ejercicios registrados para esta sesión.', marginX + 6, currentY + 3);
        currentY += 8;
        continue;
      }

      // Preparar filas para jspdf-autotable
      const tableRows = exercises.map((item, exIdx) => {
        const exName = item.exercise?.nombre || item.nombre || item.name || 'Ejercicio';
        const muscle = item.exercise?.grupo_muscular || item.grupo_muscular || '';
        
        // Detectar superseries, circuitos o bloques especiales
        const blockType = item.bloque || item.superserie || item.circuito || item.tipo_bloque || '';
        let exerciseLabel = exName;
        if (muscle) {
          exerciseLabel += `\n[${muscle}]`;
        }
        if (blockType) {
          exerciseLabel += ` (${blockType})`;
        }

        const sets = String(item.series || item.totalSets || 4);
        const reps = String(item.repeticiones || item.reps || '10-12');
        const weight = formatWeight(item.peso_sugerido ?? item.peso_raw ?? item.peso ?? item.weight);
        const rest = formatRest(item.descanso_seg ?? item.descanso_segundos ?? item.descanso);
        const notes = item.notas || item.indicaciones || item.observaciones || item.exercise?.descripcion || '—';

        // Identificador de columna #
        const orderLabel = blockType ? `${exIdx + 1}*` : String(exIdx + 1);

        return [
          orderLabel,
          exerciseLabel,
          sets,
          reps,
          weight,
          rest,
          notes
        ];
      });

      // Dibujar tabla con jspdf-autotable
      renderAutoTable(doc, {
        startY: currentY,
        head: [['#', 'Ejercicio', 'Series', 'Reps / Tiempo', 'Carga / Peso', 'Descanso', 'Notas / Indicaciones']],
        body: tableRows,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        tableWidth: contentWidth,
        headStyles: {
          fillColor: [30, 41, 59], // #1e293b (Gris pizarra oscuro, profesional y legible impreso)
          textColor: [255, 255, 255],
          font: 'helvetica',
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
          halign: 'left',
          valign: 'middle'
        },
        bodyStyles: {
          textColor: [30, 41, 59],
          font: 'helvetica',
          fontStyle: 'normal',
          fontSize: 7.5,
          cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
          valign: 'middle',
          lineColor: [226, 232, 240], // #e2e8f0
          lineWidth: 0.2
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // #f8fafc (Sutil zebra striping)
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, // #
          1: { cellWidth: 50, halign: 'left' },                     // Ejercicio + Grupo
          2: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Series
          3: { cellWidth: 24, halign: 'center' },                    // Reps
          4: { cellWidth: 22, halign: 'center' },                    // Carga
          5: { cellWidth: 18, halign: 'center' },                    // Descanso
          6: { cellWidth: 43, halign: 'left' }                       // Notas
        },
        didDrawPage: () => {
          // hook si es necesario
        }
      });

      // Actualizar posición Y para la siguiente sección
      currentY = doc.lastAutoTable.finalY + 7;
    }
  }

  // ==========================================================
  // 4. FOOTER Y ENCABEZADOS SECUNDARIOS EN TODAS LAS PÁGINAS
  // ==========================================================
  const totalPages = doc.internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Running header en páginas 2 en adelante
    if (p > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // #94a3b8
      doc.text(`${coachName} | Rutina de Entrenamiento`, marginX, 10);
      doc.text(routineName, pageWidth - marginX, 10, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, 12, pageWidth - marginX, 12);
    }

    // Pie de página (Footer) en todas las páginas
    const footerY = pageHeight - 9;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);

    // Texto de marca a la izquierda
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${coachName} • Personal Trainer | ${coachContact}`, marginX, footerY);

    // Slogan central
    doc.setFont('helvetica', 'italic');
    doc.text('Construí tu mejor versión', pageWidth / 2, footerY, { align: 'center' });

    // Numeración de página a la derecha
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, footerY, { align: 'right' });
  }

  // ==========================================================
  // 5. GUARDAR Y RETORNAR ARCHIVO PDF
  // ==========================================================
  const cleanRoutine = sanitizeFileName(routineName);
  const cleanStudent = sanitizeFileName(studentName);
  const weekSuffix = (!exportAllWeeks && totalWeeks > 1) ? `_Semana${selectedWeek}` : '';
  const fileName = `Rutina_${cleanRoutine}_${cleanStudent}${weekSuffix}.pdf`;

  doc.save(fileName);

  return {
    doc,
    fileName,
    totalPages
  };
}

export default exportRoutineToPdf;
