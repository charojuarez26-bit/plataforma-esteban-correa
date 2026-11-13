/**
 * Utilidades para la gestión de Planes y Pagos de Esteban Correa.
 */

/**
 * Normaliza una fecha ISO o string YYYY-MM-DD forzando el cálculo a medianoche local (00:00:00).
 * Elimina discrepancias entre UTC y huso horario argentino (GMT-3).
 */
export const normalizarFechaLocal = (fechaString) => {
  if (!fechaString) return null;
  if (fechaString instanceof Date) {
    if (isNaN(fechaString.getTime())) return null;
    return new Date(fechaString.getFullYear(), fechaString.getMonth(), fechaString.getDate(), 0, 0, 0);
  }
  const clean = String(fechaString).split('T')[0].trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d, 0, 0, 0);
    }
  }
  const fallback = new Date(fechaString);
  return isNaN(fallback.getTime()) ? null : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0);
};

/**
 * 1. LÓGICA DE ESTADOS DE PAGO (Función pura para alumno o fecha de vencimiento):
 * - Usa estrictamente client.estado_pago, client.fecha_vencimiento y client_payments.
 * - NUNCA usa client.estado ("Activo" / "Inactivo").
 * - Si no tiene fecha_vencimiento válida o client.estado_pago === 'vencido':
 *   - Retorna 'vencido' (rojo) y NUNCA 'al_dia'.
 * - Si tiene fecha_vencimiento:
 *   - Si diffDias <= 0: 'vencido' (rojo).
 *   - Si diffDias entre 1 y 5: 'por_vencer' (amarillo).
 *   - Si diffDias > 5: 'al_dia' (verde).
 */
export function calcularEstadoPago(alumnoOrFecha, payments = []) {
  if (!alumnoOrFecha) return 'vencido';

  let clientObj = null;
  let fechaVencimiento = null;
  let estadoPagoDb = null;

  if (typeof alumnoOrFecha === 'object' && !(alumnoOrFecha instanceof Date)) {
    clientObj = alumnoOrFecha;
    fechaVencimiento = clientObj.fecha_vencimiento;
    estadoPagoDb = clientObj.estado_pago;
  } else {
    fechaVencimiento = alumnoOrFecha;
  }

  // Si se proveen pagos de la tabla client_payments, buscar registros estrictamente de este cliente
  if (clientObj && clientObj.id && Array.isArray(payments) && payments.length > 0) {
    const clientPayments = payments.filter(p => p.client_id === clientObj.id);
    if (clientPayments.length > 0) {
      const latestPay = clientPayments[0];
      fechaVencimiento = fechaVencimiento || latestPay.fecha_vencimiento || latestPay.periodo_hasta;
    }
  }

  const rawEstado = String(estadoPagoDb || '').toLowerCase().trim();

  // 1. Ausencia de fecha de vencimiento válida o "Sin fecha asignada"
  const sinFecha = !fechaVencimiento || 
    fechaVencimiento === 'Sin fecha asignada' || 
    String(fechaVencimiento).trim() === '' || 
    String(fechaVencimiento).toLowerCase() === 'null' ||
    String(fechaVencimiento).toLowerCase() === 'undefined';

  // Si fecha_vencimiento es null o estado_pago es 'vencido', siempre 'vencido' (nunca 'al_dia')
  if (sinFecha || rawEstado === 'vencido') {
    return 'vencido';
  }

  const hoy = normalizarFechaLocal(new Date().toISOString().split('T')[0]);
  const fechaVenc = normalizarFechaLocal(fechaVencimiento);

  if (!fechaVenc || isNaN(fechaVenc.getTime())) {
    return 'vencido';
  }

  const diffMs = fechaVenc.getTime() - hoy.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias <= 0) {
    return 'vencido';
  } else if (diffDias >= 1 && diffDias <= 5) {
    return 'por_vencer';
  } else {
    return 'al_dia';
  }
}

/**
 * Obtiene el nombre real del plan del alumno sin inventar defaults si ambos son null.
 */
export function obtenerNombrePlanAlumno(client, membershipPlans = [], trainingPlans = []) {
  if (!client) return 'Sin plan asignado';

  const planActual = client.plan_actual;
  if (planActual && 
      String(planActual).trim() !== '' && 
      String(planActual).toLowerCase() !== 'sin plan' && 
      String(planActual).toLowerCase() !== 'sin plan asignado' &&
      String(planActual).toLowerCase() !== 'null' &&
      String(planActual).toLowerCase() !== 'undefined') {
    return planActual;
  }

  // Buscar por plan_id en membership_plans o trainingPlans
  if (client.plan_id) {
    const foundMem = (membershipPlans || []).find(p => p.id === client.plan_id);
    if (foundMem) return foundMem.nombre || foundMem.tipo;

    const foundTrain = (trainingPlans || []).find(p => p.id === client.plan_id);
    if (foundTrain) return foundTrain.nombre;
  }

  return 'Sin plan asignado';
}

/**
 * Devuelve la configuración visual (badge, colores, etiqueta) según el estado de pago.
 */
export function getEstadoPagoConfig(estado, client = null) {
  switch (estado) {
    case 'al_dia':
      return {
        key: 'al_dia',
        label: 'Al Día',
        color: 'emerald',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        dotClass: 'bg-emerald-400',
        bgSubtle: 'bg-emerald-500/10',
        textClass: 'text-emerald-400'
      };
    case 'por_vencer':
      return {
        key: 'por_vencer',
        label: 'Por Vencer',
        color: 'amber',
        badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        dotClass: 'bg-amber-400',
        bgSubtle: 'bg-amber-500/10',
        textClass: 'text-amber-400'
      };
    case 'pendiente':
      return {
        key: 'pendiente',
        label: 'Pendiente',
        color: 'amber',
        badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        dotClass: 'bg-amber-400',
        bgSubtle: 'bg-amber-500/10',
        textClass: 'text-amber-400'
      };
    case 'sin_plan':
      return {
        key: 'sin_plan',
        label: 'Sin Plan',
        color: 'gray',
        badgeClass: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
        dotClass: 'bg-gray-400',
        bgSubtle: 'bg-gray-500/10',
        textClass: 'text-gray-400'
      };
    case 'vencido':
    default:
      return {
        key: 'vencido',
        label: 'Vencido',
        color: 'red',
        badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
        dotClass: 'bg-red-400',
        bgSubtle: 'bg-red-500/10',
        textClass: 'text-red-400'
      };
  }
}

/**
 * Calcula cuántos días faltan (o pasaron) para una fecha de vencimiento.
 * Retorna -1 si no hay fecha.
 * Retorna >0 si faltan días, 0 si vence hoy, <0 si ya venció.
 */
export const calcularDiasParaVencer = (fechaVencimiento) => {
  if (!fechaVencimiento) return -1;
  const hoy = normalizarFechaLocal(new Date().toISOString().split('T')[0]);
  const venc = normalizarFechaLocal(fechaVencimiento);
  if (!venc) return -1;
  return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Calcula cuántos días faltan (o pasaron) para una fecha de vencimiento.
 * Devuelve un número entero: >0 faltan X días, 0 vence hoy, <0 venció hace X días.
 */
export function diasRestantesParaVencimiento(fechaVencimiento) {
  if (!fechaVencimiento) return null;
  const hoy = normalizarFechaLocal(new Date().toISOString().split('T')[0]);
  const fechaVenc = normalizarFechaLocal(fechaVencimiento);
  if (!fechaVenc) return null;

  const diffMs = fechaVenc.getTime() - hoy.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formatea una fecha ISO o YYYY-MM-DD a formato amigable argentino (DD/MM/AAAA o extendido).
 */
export function formatearFechaPago(fechaStr, { extendida = false } = {}) {
  if (!fechaStr) return 'Sin fecha';
  try {
    const raw = String(fechaStr).split('T')[0];
    const [y, m, d] = raw.split('-');
    if (!y || !m || !d) return fechaStr;

    if (extendida) {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const idx = parseInt(m, 10) - 1;
      return `${parseInt(d, 10)} de ${meses[idx] || m}, ${y}`;
    }
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  } catch {
    return fechaStr;
  }
}

/**
 * Calcula la nueva fecha de vencimiento sumando los días de vigencia del plan (por defecto 30).
 * Si la fecha de vencimiento actual es posterior a hoy, suma a partir de esa fecha.
 * Si ya venció o no tiene fecha, suma a partir de hoy.
 */
export function calcularNuevaFechaVencimiento(fechaVencimientoActual, diasVigencia = 30, fechaInicio = null) {
  const hoy = normalizarFechaLocal(fechaInicio || new Date().toISOString().split('T')[0]);
  let baseDate = new Date(hoy);

  if (fechaVencimientoActual) {
    const fv = normalizarFechaLocal(fechaVencimientoActual);
    if (fv && !isNaN(fv.getTime()) && fv.getTime() > hoy.getTime()) {
      baseDate = new Date(fv);
    }
  }

  const vigenciaNum = parseInt(diasVigencia, 10) || 30;
  baseDate.setDate(baseDate.getDate() + vigenciaNum);

  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Genera el enlace de WhatsApp con mensaje personalizado según el estado de la cuota.
 */
export function generarEnlaceWhatsAppCobro({ telefono, nombre, plan, fechaVencimiento, estado, datosBancarios }) {
  if (!telefono) return null;

  // Limpiar caracteres del número telefónico
  let cleanPhone = String(telefono).replace(/[^0-9]/g, '');
  if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) {
    cleanPhone = `549${cleanPhone}`;
  } else if (!cleanPhone.startsWith('54') && cleanPhone.startsWith('9')) {
    cleanPhone = `54${cleanPhone}`;
  } else if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549') && cleanPhone.length === 12) {
    cleanPhone = `549${cleanPhone.slice(2)}`;
  }

  const primerNombre = (nombre || 'Alumno').split(' ')[0];
  const planNombre = plan || 'tu plan de entrenamiento';
  const fechaFormateada = formatearFechaPago(fechaVencimiento, { extendida: true });

  let mensaje = '';
  if (estado === 'por_vencer') {
    mensaje = `¡Hola ${primerNombre}! 👋 Te escribo para recordarte que tu cuota de ${planNombre} vence el próximo ${fechaFormateada}.\n\nSi necesitas los datos bancarios para transferir:\n• Alias: ${datosBancarios?.alias || 'ESTEBAN.TRAINER.MP'}\n• Banco: ${datosBancarios?.banco || 'Mercado Pago'}\n\n¡Cualquier duda me avisas! Saludos, Esteban Correa.`;
  } else if (estado === 'vencido') {
    mensaje = `¡Hola ${primerNombre}! 👋 Te escribo para comentarte que tu cuota de ${planNombre} venció el ${fechaFormateada}.\n\nAvisame cuando puedas realizar la renovación para continuar con los entrenamientos.\n• Alias: ${datosBancarios?.alias || 'ESTEBAN.TRAINER.MP'}\n• Banco: ${datosBancarios?.banco || 'Mercado Pago'}\n\n¡Muchas gracias y seguimos con todo! Esteban Correa.`;
  } else {
    mensaje = `¡Hola ${primerNombre}! 👋 Te confirmo que tu cuota de ${planNombre} se encuentra al día hasta el ${fechaFormateada}.\n\n¡A seguir con la mejor energía en los entrenamientos! Esteban Correa.`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Datos bancarios iniciales de Esteban Correa.
 */
export const DEFAULT_BANK_DETAILS = {
  alias: '',
  cbu: '',
  banco: 'Mercado Pago',
  titular: 'Esteban Correa',
  telefono: ''
};

/**
 * Categorías de planes por defecto (sin precios fijos).
 */
export const DEFAULT_PLANS = [
  { id: '12dc754e-4262-4171-9f6c-6669b853af70', nombre: 'Presencial', precio: null, duracion_dias: 30, dias_vigencia: 30, descripcion: 'Entrenamiento presencial' },
  { id: 'b89bd142-8dd2-4a60-8436-fe069f7aeb83', nombre: 'Personalizado', precio: null, duracion_dias: 30, dias_vigencia: 30, descripcion: 'Planificación personalizada' },
  { id: 'e2f87a8f-3ff0-4cd7-9e2b-35737861a172', nombre: 'A distancia', precio: null, duracion_dias: 30, dias_vigencia: 30, descripcion: 'Asesoría a distancia' }
];

/**
 * Los 3 planes oficiales de membresía de Esteban Correa en Supabase:
 * 'Presencial', 'Personalizado', 'A distancia' (precio: null)
 */
export const DEFAULT_MEMBERSHIP_PLANS = [
  { 
    id: '12dc754e-4262-4171-9f6c-6669b853af70', 
    tipo: 'Presencial', 
    nombre: 'Presencial', 
    precio: null, 
    duracion_dias: 30,
    dias_vigencia: 30, 
    descripcion: 'Entrenamiento guiado en sala con supervisión técnica presencial' 
  },
  { 
    id: 'b89bd142-8dd2-4a60-8436-fe069f7aeb83', 
    tipo: 'Personalizado', 
    nombre: 'Personalizado', 
    precio: null, 
    duracion_dias: 30,
    dias_vigencia: 30, 
    descripcion: 'Planificación integral 1 a 1 y seguimiento antropométrico mensual' 
  },
  { 
    id: 'e2f87a8f-3ff0-4cd7-9e2b-35737861a172', 
    tipo: 'A distancia', 
    nombre: 'A distancia', 
    precio: null, 
    duracion_dias: 30,
    dias_vigencia: 30, 
    descripcion: 'Rutina virtual con seguimiento diario por WhatsApp y corrección en video' 
  }
];

export function formatearPrecioARS(monto) {
  if (monto === null || monto === undefined || monto === '') return '-';
  const num = parseFloat(monto);
  if (isNaN(num)) return '-';
  return `$${num.toLocaleString('es-AR')}`;
}

