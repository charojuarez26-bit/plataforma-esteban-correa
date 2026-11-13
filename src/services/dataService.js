import { supabase, withAuthRetry, isAuthError } from '../lib/supabaseClient';
import {
  calcularEstadoPago,
  calcularNuevaFechaVencimiento,
  DEFAULT_BANK_DETAILS,
  DEFAULT_PLANS,
  DEFAULT_MEMBERSHIP_PLANS
} from '../utils/paymentUtils';
import {
  INITIAL_EXERCISES,
  INITIAL_EVALUATIONS,
  INITIAL_PAYMENTS,
  WEEKLY_CHART_DATA,
  MONTHLY_INCOME_DATA
} from '../data/mockData';

export const MEMBERSHIP_PLAN_IDS = {
  'Presencial': '12dc754e-4262-4171-9f6c-6669b853af70',
  'Personalizado': 'b89bd142-8dd2-4a60-8436-fe069f7aeb83',
  'A distancia': 'e2f87a8f-3ff0-4cd7-9e2b-35737861a172'
};

const CLIENT_DB_COLUMNS = [
  'id',
  'coach_id',
  'nombre_completo',
  'telefono',
  'email',
  'edad',
  'altura',
  'modalidad',
  'objetivo',
  'estado',
  'access_code',
  'creado_el',
  'foto_url',
  'fecha_vencimiento',
  'fecha_inicio',
  'fecha_inicio_rutina',
  'plan_id',
  'plan_actual',
  'estado_pago',
  'peso_actual'
];

function enrichClient(c) {
  if (!c) return null;
  let meta = {};
  try {
    const raw = localStorage.getItem(`ec_client_meta_${c.id}`);
    if (raw) meta = JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  const photo = c.foto_url || meta.foto_url || meta.avatar_url || null;
  const activeRoutine = (c.routines || []).find(r => r.activa);
  const routineName = activeRoutine ? activeRoutine.nombre : (c.rutina_activa || null);
  const fechaVenc = c.fecha_vencimiento || meta.fecha_vencimiento || null;
  const estadoPago = c.estado_pago || meta.estado_pago || calcularEstadoPago(fechaVenc);
  const fechaIni = c.fecha_inicio || meta.fecha_inicio || null;
  const fechaIniRut = c.fecha_inicio_rutina || meta.fecha_inicio_rutina || fechaIni;

  return {
    ...c,
    foto_url: photo,
    avatar_url: photo,
    rutina_activa: routineName,
    tiene_rutina: Boolean(routineName),
    notas: meta.notas || c.notas || '',
    plan_actual: c.plan_actual || meta.plan_actual || 'Presencial',
    plan_id: c.plan_id || meta.plan_id || null,
    fecha_inicio: fechaIni,
    fecha_inicio_rutina: fechaIniRut,
    fecha_vencimiento: fechaVenc,
    estado_pago: estadoPago,
    dias_por_semana: meta.dias_por_semana || c.dias_por_semana || 3,
    dias_asignados: meta.dias_asignados || c.dias_asignados || ['Lunes', 'Miércoles', 'Viernes'],
    tipo_planificacion: meta.tipo_planificacion || c.tipo_planificacion || 'Semanal',
    duracion_sesion_min: meta.duracion_sesion_min || c.duracion_sesion_min || 60,
    access_code: c.access_code || meta.access_code || ''
  };
}

function saveClientMeta(id, data) {
  if (!id) return;
  try {
    const prev = JSON.parse(localStorage.getItem(`ec_client_meta_${id}`) || '{}');
    localStorage.setItem(`ec_client_meta_${id}`, JSON.stringify({ ...prev, ...data }));
  } catch (e) {
    // ignore
  }
}

export function extractWeekday(str) {
  if (!str) return null;
  const match = str.match(/(Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)/i);
  return match ? match[1] : null;
}

export function parseWeight(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const match = String(val).match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

export function formatRoutineWithDays(rawRoutine) {
  if (!rawRoutine) return null;

  // 1. Días parseados desde campo jsonb 'dias' o json string
  let dias = [];
  if (Array.isArray(rawRoutine.dias) && rawRoutine.dias.length > 0) {
    dias = rawRoutine.dias;
  } else if (typeof rawRoutine.dias === 'string') {
    try {
      const parsed = JSON.parse(rawRoutine.dias);
      if (Array.isArray(parsed) && parsed.length > 0) dias = parsed;
    } catch (e) {}
  }

  // 2. Días parseados desde campo 'dia_semana' (donde guardamos respaldo JSON seguro)
  if (dias.length === 0 && rawRoutine.dia_semana) {
    try {
      const parsed = JSON.parse(rawRoutine.dia_semana);
      if (Array.isArray(parsed) && parsed.length > 0) dias = parsed;
    } catch (e) {}
  }

  // 3. Días en localStorage por ID de rutina
  if (dias.length === 0 && rawRoutine.id) {
    try {
      const local = localStorage.getItem(`ec_routine_days_${rawRoutine.id}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) dias = parsed;
      }
    } catch (e) {}
  }

  // 4. Si viene de routine_exercises relacional
  if (dias.length === 0 && Array.isArray(rawRoutine.routine_exercises) && rawRoutine.routine_exercises.length > 0) {
    const rawExercises = rawRoutine.routine_exercises.slice().sort((a, b) => {
      if ((a.dia_numero || 1) !== (b.dia_numero || 1)) {
        return (a.dia_numero || 1) - (b.dia_numero || 1);
      }
      return (a.orden || 0) - (b.orden || 0);
    });

    const daysMap = {};
    const dayKeysInOrder = [];

    rawExercises.forEach(re => {
      const dayNum = re.dia_numero || 1;
      const key = `day-${dayNum}`;
      if (!daysMap[key]) {
        const dayTitle = re.dia_nombre || `Día ${dayNum}`;
        daysMap[key] = {
          id: `d-${dayNum}`,
          dia_numero: dayNum,
          dia_nombre: dayTitle,
          dia: dayTitle,
          dia_semana: extractWeekday(dayTitle) || `Día ${dayNum}`,
          ejercicios: []
        };
        dayKeysInOrder.push(key);
      }

      daysMap[key].ejercicios.push({
        id: re.id,
        routine_id: re.routine_id,
        exercise_id: re.exercise_id,
        exercise: re.exercise || null,
        series: re.series || 4,
        repeticiones: re.repeticiones || '10-12',
        peso_sugerido: re.peso_sugerido !== null && re.peso_sugerido !== undefined ? `${re.peso_sugerido} kg` : 'RPE 8',
        peso_raw: re.peso_sugerido,
        descanso_seg: re.descanso_segundos || 90,
        descanso_segundos: re.descanso_segundos || 90,
        orden: re.orden || 1
      });
    });

    dias = dayKeysInOrder.map(k => daysMap[k]);
  }

  // 5. Fallback si todavía no tiene días configurados
  if (dias.length === 0) {
    const totalDays = rawRoutine.dias_por_semana || 3;
    const defaultDayNames = ['Lunes', 'Miércoles', 'Viernes', 'Sábado', 'Martes', 'Jueves'];
    dias = Array.from({ length: totalDays }, (_, i) => ({
      id: `d-${i + 1}`,
      dia_numero: i + 1,
      dia_nombre: `Día ${i + 1} (${defaultDayNames[i] || `Día ${i + 1}`})`,
      dia: `Día ${i + 1} (${defaultDayNames[i] || `Día ${i + 1}`})`,
      dia_semana: defaultDayNames[i] || `Día ${i + 1}`,
      ejercicios: []
    }));
  }

  const isTemplate = Boolean(
    rawRoutine.es_plantilla || 
    rawRoutine.client_id === '00000000-0000-0000-0000-000000000000' ||
    rawRoutine.client?.nombre_completo === 'Plantilla General'
  );

  const totalExercisesCount = dias.reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);

  return {
    ...rawRoutine,
    objetivo: rawRoutine.descripcion || 'Sobrecarga progresiva e hipertrofia',
    nivel: 'Intermedio',
    activa: rawRoutine.activa ?? true,
    activo: rawRoutine.activa ?? true,
    es_plantilla: isTemplate,
    dias,
    total_ejercicios: totalExercisesCount,
    client: isTemplate ? null : rawRoutine.client
  };
}

export const dataService = {
  // ==========================================================
  // 1. MÉTRICAS CON SELECT A CLIENTS, EVALUATIONS Y PAYMENTS
  // ==========================================================
  async getDashboardMetrics() {
    try {
      // Consultas protegidas con reintento automático y verificación de sesión
      const [
        { data: clientsData, error: clientsError },
        { data: evaluationsData, error: evalError },
        { data: paymentsData, error: paymentsError },
        { data: aptsData }
      ] = await Promise.all([
        withAuthRetry(() => supabase.from('clients').select('*').order('creado_el', { ascending: false })),
        withAuthRetry(() => supabase.from('evaluations').select('*')),
        withAuthRetry(() => supabase.from('client_payments').select('*')),
        withAuthRetry(() => supabase.from('appointments').select('*'))
      ]);

      if (clientsError) {
        console.error('[DataService] Error consultando clients en Supabase:', clientsError);
      }

      // Clientes provienen EXCLUSIVAMENTE de Supabase (sin mocks y excluyendo cliente de plantillas)
      const rawClients = (!clientsError && clientsData)
        ? clientsData.filter(c => c.id !== '00000000-0000-0000-0000-000000000000')
        : [];
      const clients = rawClients.map(c => enrichClient(c));

      const evaluations = (!evalError && evaluationsData && evaluationsData.length > 0)
        ? evaluationsData
        : [];

      const payments = (!paymentsError && paymentsData && paymentsData.length > 0)
        ? paymentsData
        : [];

      const appointments = (aptsData && aptsData.length > 0)
        ? aptsData
        : [];

      // Cálculo de Métricas Reales
      const activeClientsCount = clients.filter(c => (c.estado || 'Activo').toLowerCase() === 'activo').length;
      
      // Entrenamientos hoy
      const todayAppointments = appointments.filter(a => a.estado === 'Confirmado');
      const todayCount = todayAppointments.length;

      // Evaluaciones pendientes
      const pendingEvaluationsCount = Math.max(0, clients.length - evaluations.length);

      // Planes por vencer o vencidos en tiempo real según fecha_vencimiento de los alumnos
      const expiringPlansCount = clients.filter(c => {
        const est = c.estado_pago || calcularEstadoPago(c.fecha_vencimiento);
        return est === 'por_vencer' || est === 'vencido';
      }).length;

      return {
        activeClients: activeClientsCount,
        todayWorkouts: todayCount,
        pendingEvaluations: pendingEvaluationsCount,
        expiringPlans: expiringPlansCount,
        weeklyChart: WEEKLY_CHART_DATA,
        monthlyIncome: MONTHLY_INCOME_DATA,
        clientsList: clients,
        paymentsList: payments,
        evaluationsList: evaluations
      };
    } catch (err) {
      console.error('[DataService] Error consultando Supabase en getDashboardMetrics:', err);
      return {
        activeClients: 0,
        todayWorkouts: 0,
        pendingEvaluations: 0,
        expiringPlans: 0,
        weeklyChart: WEEKLY_CHART_DATA,
        monthlyIncome: MONTHLY_INCOME_DATA,
        clientsList: [],
        paymentsList: [],
        evaluationsList: []
      };
    }
  },

  /**
   * Actividad real de la semana en curso (Lunes a Sábado).
   * Fuente: tabla `appointments` (fecha_hora_inicio, estado). Los turnos cancelados no cuentan
   * como programados y `Completado` cuenta como asistencia real.
   * Si no hay turnos en la semana, estima las sesiones programadas desde los días de
   * entrenamiento de los clientes activos (sin asistencias, porque no hay sesiones completadas).
   */
  async getWeeklyActivity() {
    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const chart = DAYS.map(dia => ({ dia, programados: 0, asistencias: 0 }));

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Lunes de esta semana
    const end = new Date(start);
    end.setDate(end.getDate() + 7); // Lunes siguiente (exclusivo)

    let source = 'none';
    try {
      const { data: apts, error } = await withAuthRetry(() =>
        supabase
          .from('appointments')
          .select('id, fecha_hora_inicio, estado')
          .gte('fecha_hora_inicio', start.toISOString())
          .lt('fecha_hora_inicio', end.toISOString())
      );

      if (error) throw error;

      (apts || []).forEach(a => {
        if ((a.estado || '').toLowerCase() === 'cancelado') return;
        const idx = (new Date(a.fecha_hora_inicio).getDay() + 6) % 7; // 0 = Lunes
        if (idx > 5) return; // Domingo no se grafica
        chart[idx].programados += 1;
        if ((a.estado || '').toLowerCase() === 'completado') chart[idx].asistencias += 1;
      });

      if ((apts || []).length > 0) source = 'appointments';
    } catch (err) {
      console.error('[DataService] Error consultando actividad semanal:', err);
    }

    if (source === 'none') {
      try {
        const clients = await this.getClients();
        clients
          .filter(c => (c.estado || 'Activo').toLowerCase() === 'activo')
          .forEach(c => {
            (c.dias_asignados || []).forEach(d => {
              const norm = String(d).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
              const idx = DAYS.findIndex(x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === norm);
              if (idx >= 0) {
                chart[idx].programados += 1;
                source = 'clients';
              }
            });
          });
      } catch (err) {
        console.error('[DataService] Error estimando actividad desde clientes:', err);
      }
    }

    const totalProgramados = chart.reduce((t, d) => t + d.programados, 0);
    const totalAsistencias = chart.reduce((t, d) => t + d.asistencias, 0);
    const adherencia = totalProgramados > 0
      ? Math.round((totalAsistencias / totalProgramados) * 100)
      : null;

    return { chart, totalProgramados, totalAsistencias, adherencia, source };
  },

  // ==========================================================
  // 2. CLIENTES (SELECT, INSERT Y UPDATE EXCLUSIVAMENTE EN SUPABASE)
  // ==========================================================
  async getClients() {
    try {
      const { data, error, isAuthError: hadAuthError } = await withAuthRetry(() =>
        supabase
          .from('clients')
          .select('*, routines(id, nombre, activa)')
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .order('creado_el', { ascending: false })
      );

      if (error || hadAuthError) {
        console.error('[DataService] Error consultando clients en Supabase:', error);
        return [];
      }
      return (data || [])
        .filter(c => {
          const nombre = (c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`).toLowerCase();
          return c.id !== '00000000-0000-0000-0000-000000000000' && !nombre.includes('plantilla') && !c.es_plantilla && !c.is_template;
        })
        .map(enrichClient);
    } catch (err) {
      console.error('[DataService] Error en getClients:', err);
      return [];
    }
  },

  async getClientById(id) {
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('clients')
          .select('*, routines(id, nombre, activa)')
          .eq('id', id)
          .single()
      );

      if (error) {
        console.error('[DataService] Error en getClientById Supabase:', error);
        return null;
      }
      return enrichClient(data);
    } catch (err) {
      console.error('[DataService] Error en getClientById:', err);
      return null;
    }
  },

  async uploadClientAvatar(file) {
    if (!file) return null;
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('[DataService] Error subiendo foto a Supabase Storage:', uploadError);
        throw uploadError;
      }

      const uploadPath = uploadData?.path || fileName;
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadPath);

      return publicUrlData?.publicUrl || null;
    } catch (err) {
      console.error('[DataService] Error en uploadClientAvatar:', err);
      throw err;
    }
  },

  async addClient(clientData) {
    const code = clientData.access_code || `EC-${Math.floor(1000 + Math.random() * 9000)}`;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const coachId = (clientData.coach_id && uuidRegex.test(clientData.coach_id))
      ? clientData.coach_id
      : '00000000-0000-0000-0000-000000000001';

    const photoUrl = clientData.foto_url || clientData.avatar_url || null;

    const payload = {
      coach_id: coachId,
      nombre_completo: (clientData.nombre_completo || '').trim(),
      telefono: (clientData.telefono || '').trim(),
      email: clientData.email ? clientData.email.trim() : null,
      edad: clientData.edad ? parseInt(clientData.edad, 10) : null,
      altura: clientData.altura ? parseFloat(clientData.altura) : null,
      peso_actual: clientData.peso_actual ? parseFloat(clientData.peso_actual) : null,
      modalidad: clientData.modalidad || 'Presencial',
      objetivo: (clientData.objetivo || 'Acondicionamiento físico general').trim(),
      access_code: code,
      estado: clientData.estado || 'Activo',
      foto_url: photoUrl
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error al guardar cliente en Supabase:", error);
      throw error;
    }

    // Persistir metadatos adicionales del cliente
    saveClientMeta(data.id, {
      avatar_url: photoUrl,
      foto_url: photoUrl,
      peso_actual: clientData.peso_actual ? parseFloat(clientData.peso_actual) : null,
      notas: clientData.notas,
      plan_actual: clientData.plan_actual,
      dias_por_semana: clientData.dias_por_semana,
      dias_asignados: clientData.dias_asignados,
      tipo_planificacion: clientData.tipo_planificacion,
      duracion_sesion_min: clientData.duracion_sesion_min
    });

    return enrichClient(data);
  },

  async updateClient(id, updates) {
    try {
      const dbPayload = {};
      const metaPayload = {};

      // Lista explícita de campos que NUNCA deben enviarse directamente a columnas de clients en Supabase
      const EXCLUDED_FROM_DB = new Set([
        'notas',
        'rutina_activa',
        'tiene_rutina',
        'routines',
        'total_sesiones',
        'asistencia_pct',
        'asistencia',
        'id',
        'creado_el',
        'created_at',
        'avatar_url',
        'dias_por_semana',
        'dias_asignados',
        'tipo_planificacion',
        'duracion_sesion_min'
      ]);

      // Mapeo automático de plan_id si se envía plan_actual
      if (updates.plan_actual && !updates.plan_id) {
        const pLower = updates.plan_actual.toLowerCase();
        if (pLower.includes('presencial')) {
          updates.plan_id = MEMBERSHIP_PLAN_IDS['Presencial'];
        } else if (pLower.includes('distancia') || pLower.includes('online')) {
          updates.plan_id = MEMBERSHIP_PLAN_IDS['A distancia'];
        } else if (pLower.includes('personalizado')) {
          updates.plan_id = MEMBERSHIP_PLAN_IDS['Personalizado'];
        }
      }

      Object.keys(updates).forEach((key) => {
        if (EXCLUDED_FROM_DB.has(key)) {
          metaPayload[key] = updates[key];
          return;
        }

        if (CLIENT_DB_COLUMNS.includes(key)) {
          if (key === 'edad') {
            dbPayload[key] = (updates[key] !== '' && updates[key] !== null && updates[key] !== undefined)
              ? parseInt(updates[key], 10)
              : null;
          } else if (key === 'altura' || key === 'peso_actual') {
            dbPayload[key] = (updates[key] !== '' && updates[key] !== null && updates[key] !== undefined)
              ? parseFloat(updates[key])
              : null;
          } else {
            dbPayload[key] = updates[key];
          }
        } else {
          metaPayload[key] = updates[key];
        }
      });

      if (updates.avatar_url && dbPayload.foto_url === undefined) {
        dbPayload.foto_url = updates.avatar_url;
      }
      if (dbPayload.foto_url !== undefined) {
        metaPayload.foto_url = dbPayload.foto_url;
        metaPayload.avatar_url = dbPayload.foto_url;
      }
      if (updates.plan_actual !== undefined) {
        metaPayload.plan_actual = updates.plan_actual;
      }
      if (updates.plan_id !== undefined) {
        metaPayload.plan_id = updates.plan_id;
      }
      if (updates.estado_pago !== undefined) {
        metaPayload.estado_pago = updates.estado_pago;
      }
      if (updates.notas !== undefined) {
        metaPayload.notas = updates.notas;
      }

      saveClientMeta(id, metaPayload);

      if (Object.keys(dbPayload).length > 0) {
        let currentPayload = { ...dbPayload };
        let updatedData = null;
        let lastError = null;

        // Auto-recuperación ante columnas no existentes en Supabase (código PGRST204)
        for (let attempt = 0; attempt < 4; attempt++) {
          const { data, error } = await supabase
            .from('clients')
            .update(currentPayload)
            .eq('id', id)
            .select()
            .single();

          if (!error) {
            updatedData = data;
            lastError = null;
            break;
          }

          lastError = error;
          if (error.code === 'PGRST204' || error.message?.includes('column')) {
            const match = error.message.match(/'([^']+)' column/) ||
                          error.message.match(/column ['"]?([a-zA-Z0-9_]+)['"]?/i) ||
                          error.message.match(/Could not find the '([^']+)'/i);
            const missingCol = match ? match[1] : null;
            if (missingCol && currentPayload[missingCol] !== undefined) {
              console.warn(`[DataService] Columna '${missingCol}' no existe en clients de Supabase. Aislándola en metadatos.`);
              metaPayload[missingCol] = currentPayload[missingCol];
              saveClientMeta(id, { [missingCol]: currentPayload[missingCol] });
              delete currentPayload[missingCol];
              if (Object.keys(currentPayload).length === 0) {
                break;
              }
              continue;
            }
          }
          break;
        }

        if (lastError && !updatedData && Object.keys(currentPayload).length > 0) {
          console.error('[DataService] Error actualizando cliente en Supabase:', lastError);
        }

        const fresh = updatedData || (await this.getClientById(id));
        return enrichClient({ ...fresh, ...metaPayload });
      }

      return enrichClient(await this.getClientById(id));
    } catch (err) {
      console.error('[DataService] Error actualizando cliente:', err);
      throw err;
    }
  },

  // ==========================================================
  // 3. EVALUACIONES (SELECT E INSERT EN SUPABASE)
  // ==========================================================
  // 3. EVALUACIONES (SELECT E INSERT EN SUPABASE)
  // ==========================================================
  async getEvaluations(clientId = null) {
    try {
      const { data, error } = await withAuthRetry(() => {
        let query = supabase
          .from('evaluations')
          .select('*')
          .order('fecha', { ascending: true });

        if (clientId) {
          query = query.eq('client_id', clientId);
        }
        return query;
      });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('[DataService] Error en getEvaluations Supabase:', err);
    }

    if (clientId) {
      return INITIAL_EVALUATIONS.filter(e => e.client_id === clientId);
    }
    return INITIAL_EVALUATIONS;
  },

  async addEvaluation(evalData) {
    const payload = {
      client_id: evalData.client_id,
      fecha: evalData.fecha || new Date().toISOString().split('T')[0],
      peso: parseFloat(evalData.peso),
      porcentaje_grasa: evalData.porcentaje_grasa ? parseFloat(evalData.porcentaje_grasa) : null,
      cintura: evalData.cintura ? parseFloat(evalData.cintura) : null,
      cadera: evalData.cadera ? parseFloat(evalData.cadera) : null,
      brazo: evalData.brazo ? parseFloat(evalData.brazo) : null,
      muslo: evalData.muslo ? parseFloat(evalData.muslo) : null,
      notas: evalData.notas || ''
    };

    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('evaluations')
          .insert([payload])
          .select()
          .single()
      );

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('[DataService] Error insertando evaluación en Supabase:', err);
    }

    return {
      id: `eval-${Date.now()}`,
      ...payload
    };
  },

  // ==========================================================
  // 4. PAGOS (SELECT E INSERT EN CLIENT_PAYMENTS DE SUPABASE)
  // ==========================================================
  async getPayments(clientId = null) {
    try {
      // Columnas reales de la tabla client_payments en Supabase:
      // id, client_id, monto, fecha_pago, metodo_pago, periodo_desde, periodo_hasta, fecha_vencimiento, notas
      let query = supabase
        .from('client_payments')
        .select(`
          id,
          client_id,
          monto,
          fecha_pago,
          metodo_pago,
          periodo_desde,
          periodo_hasta,
          fecha_vencimiento,
          notas,
          clients (
            id,
            nombre_completo,
            plan_actual,
            fecha_vencimiento
          )
        `);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      // Ordenar preferentemente por fecha_pago DESC
      query = query.order('fecha_pago', { ascending: false });

      const { data, error } = await withAuthRetry(() => query);

      if (!error && Array.isArray(data)) {
        // Mapear y normalizar propiedades para compatibilidad total con la UI
        return data.map(item => {
          const clientObj = item.clients || {};
          const vto = item.fecha_vencimiento || item.periodo_hasta || clientObj.fecha_vencimiento || null;
          return {
            ...item,
            plan_nombre: item.notas || clientObj.plan_actual || 'Plan Personalizado',
            metodo: item.metodo_pago || 'Transferencia',
            estado: 'Pagado',
            fecha_vencimiento: vto,
            client_name: clientObj.nombre_completo || 'Alumno'
          };
        });
      }

      if (error) {
        console.warn('[DataService] Error consultando client_payments:', error);
      }
    } catch (err) {
      console.warn('[DataService] Error en getPayments Supabase:', err);
    }

    // Fallback seguro: array vacío para evitar romper la interfaz
    return [];
  },

  async addPayment(payData) {
    const payload = {
      client_id: payData.client_id,
      monto: parseFloat(payData.monto) || 0,
      fecha_pago: payData.fecha_pago || new Date().toISOString().split('T')[0],
      metodo_pago: payData.metodo || payData.metodo_pago || 'Transferencia',
      periodo_desde: payData.periodo_desde || payData.fecha_pago || new Date().toISOString().split('T')[0],
      periodo_hasta: payData.periodo_hasta || payData.fecha_vencimiento || null,
      fecha_vencimiento: payData.fecha_vencimiento || payData.periodo_hasta || null,
      notas: payData.plan_nombre || payData.notas || 'Plan de Entrenamiento'
    };

    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('client_payments')
          .insert([payload])
          .select()
          .single()
      );

      if (!error && data) {
        return {
          ...data,
          plan_nombre: data.notas || payload.notas,
          metodo: data.metodo_pago || payload.metodo_pago,
          estado: 'Pagado'
        };
      }
      if (error) {
        console.warn('[DataService] Error insertando en client_payments:', error);
      }
    } catch (err) {
      console.warn('[DataService] Error insertando pago en Supabase:', err);
    }

    return {
      id: `pay-${Date.now()}`,
      ...payload,
      plan_nombre: payload.notas,
      metodo: payload.metodo_pago,
      estado: 'Pagado',
      client_name: payData.client_name || 'Alumno'
    };
  },

  /**
   * Registra el cobro de un alumno:
   * 1. Guardia de integridad: valida que el alumno no cuente ya con una cuota vigente.
   * 2. Inserta el registro en client_payments con columnas reales.
   * 3. Actualiza en clients la nueva fecha_vencimiento (+30 días por defecto o días del plan).
   * 4. Actualiza el estado a 'al_dia'.
   */
  async recordClientPayment({ clientId, planNombre, monto, metodo = 'Transferencia', diasVigencia = 30, fechaPago = null }) {
    if (!clientId) throw new Error('El ID del alumno es obligatorio');

    const client = await this.getClientById(clientId);

    // Guardia en el servicio: prevenir pagos duplicados (solo permitir si faltan 3 días o menos, o ya venció)
    if (client?.fecha_vencimiento) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const venc = new Date(client.fecha_vencimiento);
      venc.setHours(0, 0, 0, 0);
      const diasRestantes = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));

      if (diasRestantes > 3) {
        throw new Error(`El alumno ya cuenta con un pago vigente (faltan ${diasRestantes} días para el vencimiento). El cobro se habilitará 3 días antes de vencer.`);
      }
    }

    const fechaPagoFinal = fechaPago || new Date().toISOString().split('T')[0];
    const nuevaFechaVencimiento = calcularNuevaFechaVencimiento(client?.fecha_vencimiento, diasVigencia);

    const paymentPayload = {
      client_id: clientId,
      monto: parseFloat(monto) || 0,
      fecha_pago: fechaPagoFinal,
      metodo_pago: metodo,
      periodo_desde: fechaPagoFinal,
      periodo_hasta: nuevaFechaVencimiento,
      fecha_vencimiento: nuevaFechaVencimiento,
      notas: planNombre || client?.plan_actual || 'Plan 3x Semanal Personalizado'
    };

    let createdPayment = null;

    // Insertar exclusivamente en 'client_payments'
    try {
      const { data: cpData, error: cpError } = await withAuthRetry(() =>
        supabase
          .from('client_payments')
          .insert([paymentPayload])
          .select()
          .single()
      );

      if (!cpError && cpData) {
        createdPayment = {
          ...cpData,
          plan_nombre: cpData.notas || paymentPayload.notas,
          metodo: cpData.metodo_pago || paymentPayload.metodo_pago,
          estado: 'Pagado',
          client_name: client?.nombre_completo || 'Alumno'
        };
      } else if (cpError) {
        console.warn('[DataService] Error insertando en client_payments:', cpError);
      }
    } catch (e) {
      console.warn('[DataService] Excepción registrando en client_payments:', e);
    }

    if (!createdPayment) {
      createdPayment = {
        id: `pay-${Date.now()}`,
        ...paymentPayload,
        plan_nombre: paymentPayload.notas,
        metodo: paymentPayload.metodo_pago,
        estado: 'Pagado',
        client_name: client?.nombre_completo || 'Alumno'
      };
    }

    // 3. Actualizar en clients la nueva fecha_vencimiento, plan_actual y estado a 'al_dia'
    await this.updateClient(clientId, {
      fecha_vencimiento: nuevaFechaVencimiento,
      plan_actual: paymentPayload.notas,
      estado_pago: 'al_dia'
    });

    // Guardar respaldo local por alumno
    try {
      const key = `ec_payments_${clientId}`;
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.unshift(createdPayment);
      localStorage.setItem(key, JSON.stringify(prev));
    } catch {}

    return {
      success: true,
      payment: createdPayment,
      nuevaFechaVencimiento,
      estadoPago: 'al_dia'
    };
  },

  // ==========================================
  // GESTIÓN DE FICHA MÉDICA / SALUD (medical_records)
  // ==========================================
  async getMedicalRecord(clientId) {
    if (!clientId) return null;
    try {
      const cleanId = String(clientId).trim();
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('medical_records')
          .select('*')
          .eq('client_id', cleanId)
          .maybeSingle()
      );
      if (!error) {
        // La verdad absoluta proviene de la base de datos
        return data || null;
      }
      if (error) {
        console.warn('[DataService] Error consultando medical_records en Supabase:', error);
      }
    } catch (e) {
      console.warn('[DataService] Excepción cargando medical_records:', e);
    }

    return null;
  },

  async saveMedicalRecord({ clientId, lesiones = [], detalleLesiones = '', condicionesCronicas = '', alergias = '', medicamentos = '', declaracionJurada = true, completada = true, permitirEdicion = false }) {
    if (!clientId || typeof clientId !== 'string' || clientId.includes('00000000')) {
      throw new Error('Error: Sesión no válida o ID de alumno inexistente.');
    }

    const cleanId = String(clientId).trim();

    const payload = {
      client_id: cleanId,
      lesiones: Array.isArray(lesiones) ? lesiones : [],
      detalle_lesiones: detalleLesiones || '',
      condiciones_cronicas: condicionesCronicas || '',
      alergias: alergias || '',
      medicamentos: medicamentos || '',
      declaracion_jurada: Boolean(declaracionJurada),
      completada: Boolean(completada),
      permitir_edicion: Boolean(permitirEdicion),
      actualizado_el: new Date().toISOString()
    };

    // Upsert atómico por client_id en Supabase
    const { data, error } = await withAuthRetry(() =>
      supabase
        .from('medical_records')
        .upsert([payload], { onConflict: 'client_id' })
        .select()
        .single()
    );

    if (error) {
      console.error('[DataService] Error crítico al guardar ficha médica en Supabase:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No se recibió confirmación del registro guardado en la base de datos.');
    }

    return data;
  },

  async setMedicalRecordEditPermission(clientId, permitirEdicion = true) {
    if (!clientId) throw new Error('El ID del alumno es obligatorio');
    try {
      const existing = await this.getMedicalRecord(clientId);
      if (existing?.id) {
        const { data, error } = await withAuthRetry(() =>
          supabase
            .from('medical_records')
            .update({ permitir_edicion: permitirEdicion, actualizado_el: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single()
        );
        if (!error && data) {
          localStorage.setItem(`ec_medical_${clientId}`, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.warn('[DataService] Error actualizando permiso de edición médica:', e);
    }

    // Fallback local
    try {
      const local = localStorage.getItem(`ec_medical_${clientId}`);
      if (local) {
        const parsed = JSON.parse(local);
        parsed.permitir_edicion = permitirEdicion;
        localStorage.setItem(`ec_medical_${clientId}`, JSON.stringify(parsed));
        return parsed;
      }
    } catch {}

    return { client_id: clientId, permitir_edicion: permitirEdicion };
  },

  getBankDetails() {
    try {
      const raw = localStorage.getItem('ec_bank_details');
      if (raw) return { ...DEFAULT_BANK_DETAILS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_BANK_DETAILS;
  },

  async saveBankDetails(details) {
    try {
      const merged = { ...DEFAULT_BANK_DETAILS, ...details };
      localStorage.setItem('ec_bank_details', JSON.stringify(merged));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await supabase
            .from('coaches')
            .update({ bank_details: merged })
            .eq('user_id', session.user.id);
        }
      } catch {}
      return merged;
    } catch (e) {
      console.warn('Error guardando datos bancarios:', e);
      return details;
    }
  },

  getTrainingPlans() {
    try {
      const raw = localStorage.getItem('ec_training_plans');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PLANS;
  },

  saveTrainingPlans(plans) {
    try {
      localStorage.setItem('ec_training_plans', JSON.stringify(plans));
    } catch (e) {
      console.warn('Error guardando planes:', e);
    }
    return plans;
  },

  // ==========================================================
  // 4.1 PLANES DE MEMBRESÍA (Presencial, Personalizado, A distancia)
  // ==========================================================
  async getMembershipPlans() {
    let list = [];
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('membership_plans')
          .select('*')
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      } else if (error) {
        console.error('[DataService] Error consultando membership_plans:', error);
      }
    } catch (e) {
      console.error('[DataService] Excepción consultando membership_plans:', e);
    }

    // Fallback a localStorage si Supabase no devolvió filas
    if (list.length === 0) {
      try {
        const local = localStorage.getItem('ec_membership_plans');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }
      } catch (e) {}
    }

    // Mapear y normalizar garantizando los 3 planes oficiales
    const tipos = ['Presencial', 'Personalizado', 'A distancia'];
    const complete = tipos.map(tipo => {
      const defaultPlan = DEFAULT_MEMBERSHIP_PLANS.find(p => p.tipo === tipo) || {
        tipo,
        nombre: `Plan ${tipo}`,
        precio: tipo === 'Personalizado' ? 45000 : tipo === 'Presencial' ? 38000 : 28000,
        dias_vigencia: 30,
        descripcion: ''
      };

      const found = list.find(p =>
        (p.id && p.id === MEMBERSHIP_PLAN_IDS[tipo]) ||
        (p.tipo || p.nombre || '').toLowerCase().includes(tipo.toLowerCase()) ||
        (tipo === 'A distancia' && (p.tipo || p.nombre || '').toLowerCase().includes('online'))
      );

      if (found) {
        const rawPrecio = Number(found.precio);
        const resolvedPrecio = (!isNaN(rawPrecio) && rawPrecio > 0) ? rawPrecio : defaultPlan.precio;
        return {
          id: found.id || MEMBERSHIP_PLAN_IDS[tipo],
          tipo,
          nombre: found.nombre || defaultPlan.nombre,
          precio: resolvedPrecio,
          duracion_dias: found.duracion_dias || 30,
          dias_vigencia: found.duracion_dias || found.dias_vigencia || 30,
          activo: found.activo !== false,
          descripcion: found.descripcion || defaultPlan.descripcion
        };
      }

      return {
        id: MEMBERSHIP_PLAN_IDS[tipo],
        ...defaultPlan
      };
    });

    try {
      localStorage.setItem('ec_membership_plans', JSON.stringify(complete));
    } catch (e) {}

    return complete;
  },

  async saveMembershipPlanPrices(plansToUpdate) {
    if (!Array.isArray(plansToUpdate)) return { success: false, errors: ['Formato inválido'] };

    const errors = [];

    for (const p of plansToUpdate) {
      try {
        const precioNum = Number(p.precio) >= 0 ? Number(p.precio) : 0;
        
        // 1. Resolver el ID real del plan
        let planId = p.id;
        if (!planId || planId.startsWith('mp-')) {
          const matchedTipo = Object.keys(MEMBERSHIP_PLAN_IDS).find(
            t => (p.tipo || p.nombre || '').toLowerCase().includes(t.toLowerCase())
          );
          if (matchedTipo) {
            planId = MEMBERSHIP_PLAN_IDS[matchedTipo];
          }
        }

        if (!planId) {
          console.error('[DataService] No se pudo identificar el ID para el plan:', p);
          errors.push(`No se pudo identificar el ID del plan ${p.tipo || p.nombre}`);
          continue;
        }

        // 2. Ejecutar UPDATE en membership_plans por ID
        const { data: updated, error: updateErr } = await withAuthRetry(() =>
          supabase
            .from('membership_plans')
            .update({ precio: precioNum })
            .eq('id', planId)
            .select('*')
            .maybeSingle()
        );

        if (updateErr) {
          console.error(`[DataService] Error actualizando plan ${planId}:`, updateErr);
          errors.push(updateErr.message);
        } else if (!updated) {
          // Si no existía la fila con ese ID, realizar upsert seguro
          const { error: upsertErr } = await withAuthRetry(() =>
            supabase
              .from('membership_plans')
              .upsert({
                id: planId,
                nombre: p.tipo || p.nombre,
                precio: precioNum,
                duracion_dias: p.duracion_dias || p.dias_vigencia || 30,
                activo: true
              })
              .select('*')
              .maybeSingle()
          );

          if (upsertErr) {
            console.error(`[DataService] Error en upsert de plan ${planId}:`, upsertErr);
            errors.push(upsertErr.message);
          }
        }
      } catch (err) {
        console.error(`[DataService] Excepción actualizando plan:`, err);
        errors.push(err.message);
      }
    }

    // 3. Volver a consultar desde Supabase para confirmar y refrescar el estado
    const confirmedPlans = await this.getMembershipPlans();

    try {
      localStorage.setItem('ec_membership_plans', JSON.stringify(confirmedPlans));
    } catch (e) {}

    return {
      success: errors.length === 0,
      plans: confirmedPlans,
      errors
    };
  },

  async getClientWithMembershipPlan(alumnoId) {
    if (!alumnoId) return null;

    let client = null;
    let plan = null;

    // 1. Intento de consulta solicitada: .from('clients').select('*, membership_plans(*)').eq('id', alumnoId).single()
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('clients')
          .select('*, membership_plans(*)')
          .eq('id', alumnoId)
          .single()
      );

      if (!error && data) {
        client = data;
        if (data.membership_plans) {
          plan = Array.isArray(data.membership_plans) ? data.membership_plans[0] : data.membership_plans;
        }
      }
    } catch (e) {
      console.warn('[DataService] Error en select con join membership_plans:', e);
    }

    // 2. Si no trajo el plan o falló el join, resolver client y plan por separado
    if (!client) {
      client = await this.getClientById(alumnoId);
    }

    if (client && !plan) {
      const allPlans = await this.getMembershipPlans();
      const planName = (client.plan_actual || '').toLowerCase();
      const modName = (client.modalidad || '').toLowerCase();

      plan = allPlans.find(p => p.id === client.membership_plan_id) ||
             allPlans.find(p => planName.includes(p.tipo.toLowerCase())) ||
             allPlans.find(p => modName.includes(p.tipo.toLowerCase())) ||
             allPlans.find(p => p.tipo === 'Personalizado') ||
             allPlans[0];
    }

    return {
      client: enrichClient(client),
      membershipPlan: plan
    };
  },

  // ==========================================================
  // 5. EJERCICIOS (SELECT, INSERT, UPDATE, DELETE EN SUPABASE)
  // ==========================================================
  async getExercises(filterGroup = 'Todos') {
    try {
      const { data, error } = await withAuthRetry(() => {
        let query = supabase.from('exercises').select('*').order('nombre', { ascending: true });
        if (filterGroup !== 'Todos') {
          query = query.eq('grupo_muscular', filterGroup);
        }
        return query;
      });

      if (!error && data) {
        return data;
      }
    } catch (err) {
      // Fallback silencioso
    }

    return [];
  },

  async getExercisesPaginated({ page = 0, limit = 25, filterGroup = 'Todos', search = '' } = {}) {
    try {
      const { data, error, count } = await withAuthRetry(async () => {
        let query = supabase
          .from('exercises')
          .select('*', { count: 'exact' })
          .order('nombre', { ascending: true });

        if (filterGroup && filterGroup !== 'Todos') {
          if (filterGroup === 'Core / Abdomen' || filterGroup === 'Core' || filterGroup === 'Abdomen / Core' || filterGroup === 'Abdomen') {
            query = query.in('grupo_muscular', ['Core', 'Core / Abdomen', 'Abdomen / Core', 'Abdomen']);
          } else {
            query = query.eq('grupo_muscular', filterGroup);
          }
        }

        const cleanSearch = (search || '').trim();
        if (cleanSearch) {
          const sanitized = cleanSearch.replace(/[%_,()]/g, ' ').trim();
          if (sanitized) {
            query = query.or(`nombre.ilike.%${sanitized}%,grupo_muscular.ilike.%${sanitized}%,equipamiento.ilike.%${sanitized}%`);
          }
        }

        const from = page * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        return query;
      });

      if (!error && data) {
        const total = count ?? data.length;
        const hasMore = (page + 1) * limit < total;
        return { data, total, hasMore };
      }
    } catch (err) {
      console.error('Error detallado en getExercisesPaginated:', err);
    }

    return { data: [], total: 0, hasMore: false };
  },

  async getDistinctMuscleGroups() {
    try {
      const { data, error } = await withAuthRetry(() => {
        return supabase.from('exercises').select('grupo_muscular');
      });
      if (!error && data) {
        const groups = new Set();
        data.forEach(item => {
          if (item.grupo_muscular) groups.add(item.grupo_muscular.trim());
        });
        return Array.from(groups);
      }
    } catch (err) {
      // Fallback silencioso
    }
    return [];
  },

  async seedInitialExercises() {
    try {
      const coachId = '00000000-0000-0000-0000-000000000001';
      const payload = INITIAL_EXERCISES.map(ex => ({
        coach_id: coachId,
        nombre: ex.nombre,
        grupo_muscular: ex.grupo_muscular,
        imagen_url: ex.imagen_url,
        video_url: ex.video_url || null,
        instrucciones: ex.instrucciones,
        errores_comunes: ex.errores_comunes || null
      }));

      const { data, error } = await supabase
        .from('exercises')
        .insert(payload)
        .select()
        .order('nombre', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('[DataService] Error en seedInitialExercises:', err);
    }
    return INITIAL_EXERCISES;
  },

  async addExercise(exerciseData) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const coachId = (exerciseData.coach_id && uuidRegex.test(exerciseData.coach_id))
      ? exerciseData.coach_id
      : '00000000-0000-0000-0000-000000000001';

    const payload = {
      coach_id: coachId,
      nombre: (exerciseData.nombre || '').trim(),
      grupo_muscular: (exerciseData.grupo_muscular || 'Pecho').trim(),
      equipamiento: exerciseData.equipamiento ? exerciseData.equipamiento.trim() : null,
      imagen_url: exerciseData.imagen_url ? exerciseData.imagen_url.trim() : null,
      video_url: exerciseData.video_url ? exerciseData.video_url.trim() : null,
      instrucciones: (exerciseData.instrucciones || '').trim(),
      errores_comunes: (exerciseData.errores_comunes || '').trim() || null
    };

    const { data, error } = await supabase
      .from('exercises')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error al guardar ejercicio en Supabase:", error);
      throw error;
    }

    return data;
  },

  async updateExercise(id, updates) {
    const payload = {};
    if (updates.nombre !== undefined) payload.nombre = updates.nombre.trim();
    if (updates.grupo_muscular !== undefined) payload.grupo_muscular = updates.grupo_muscular.trim();
    if (updates.equipamiento !== undefined) payload.equipamiento = updates.equipamiento ? updates.equipamiento.trim() : null;
    if (updates.imagen_url !== undefined) payload.imagen_url = updates.imagen_url ? updates.imagen_url.trim() : null;
    if (updates.video_url !== undefined) payload.video_url = updates.video_url ? updates.video_url.trim() : null;
    if (updates.instrucciones !== undefined) payload.instrucciones = (updates.instrucciones || '').trim();
    if (updates.errores_comunes !== undefined) payload.errores_comunes = (updates.errores_comunes || '').trim() || null;

    const { data, error } = await supabase
      .from('exercises')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar ejercicio en Supabase:", error);
      throw error;
    }

    return data;
  },

  async deleteExercise(id) {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error al eliminar ejercicio en Supabase:", error);
      throw error;
    }

    return { success: true, id };
  },

  // ==========================================================
  // 6. RUTINAS (PERSISTENCIA COMPLETA RELACIONAL EN SUPABASE)
  // ==========================================================
  async getAllRoutines() {
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('routines')
          .select('*')
          .order('creado_el', { ascending: false })
      );

      if (error) {
        console.error('Error detallado de Supabase en getAllRoutines:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(formatRoutineWithDays);
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
      return [];
    }
  },

  async getRoutines() {
    return this.getAllRoutines();
  },

  async seedInitialRoutines() {
    try {
      const templateClientId = null;
      const allEx = await this.getExercises('Todos');
      if (!allEx || allEx.length === 0) return [];

      const findEx = (namePart) => allEx.find(e => e.nombre.toLowerCase().includes(namePart.toLowerCase())) || allEx[0];

      // 1. Plantilla 4 Días
      const p1 = {
        client_id: templateClientId,
        nombre: 'Hipertrofia Torso - Pierna (4 Días)',
        descripcion: 'Frecuencia 2 óptima para hipertrofia y desarrollo muscular armónico.',
        activa: true,
        dias_por_semana: 4,
        es_plantilla: true
      };
      const daysP1 = [
        {
          dia_numero: 1,
          dia_nombre: 'Día 1 (Lunes): Torso & Empuje',
          dia: 'Día 1 (Lunes): Torso & Empuje',
          dia_semana: 'Lunes',
          ejercicios: [
            { exercise: findEx('Press de Banca Plano'), series: 4, repeticiones: '8-10', peso_sugerido: 75, descanso_seg: 120 },
            { exercise: findEx('Remo con Barra 45'), series: 4, repeticiones: '8-10', peso_sugerido: 70, descanso_seg: 90 },
            { exercise: findEx('Press Inclinado'), series: 3, repeticiones: '10-12', peso_sugerido: 26, descanso_seg: 90 },
            { exercise: findEx('Jalón al Pecho'), series: 3, repeticiones: '10-12', peso_sugerido: 65, descanso_seg: 75 },
            { exercise: findEx('Laterales en Polea'), series: 4, repeticiones: '15', peso_sugerido: 10, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 2,
          dia_nombre: 'Día 2 (Martes): Piernas & Core',
          dia: 'Día 2 (Martes): Piernas & Core',
          dia_semana: 'Martes',
          ejercicios: [
            { exercise: findEx('Sentadilla Trasera'), series: 4, repeticiones: '8', peso_sugerido: 90, descanso_seg: 150 },
            { exercise: findEx('Prensa 45'), series: 4, repeticiones: '12-15', peso_sugerido: 160, descanso_seg: 90 },
            { exercise: findEx('Peso Muerto Rumano'), series: 3, repeticiones: '10-12', peso_sugerido: 30, descanso_seg: 90 },
            { exercise: findEx('Plancha Abdominal'), series: 3, repeticiones: '45 seg', peso_sugerido: null, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 3,
          dia_nombre: 'Día 3 (Jueves): Tracción & Brazos',
          dia: 'Día 3 (Jueves): Tracción & Brazos',
          dia_semana: 'Jueves',
          ejercicios: [
            { exercise: findEx('Dominadas'), series: 4, repeticiones: '8', peso_sugerido: null, descanso_seg: 90 },
            { exercise: findEx('Press Militar'), series: 4, repeticiones: '10', peso_sugerido: 22, descanso_seg: 90 },
            { exercise: findEx('Cruces en Polea'), series: 3, repeticiones: '12', peso_sugerido: 15, descanso_seg: 60 },
            { exercise: findEx('Curl de Bíceps'), series: 3, repeticiones: '12', peso_sugerido: 30, descanso_seg: 60 },
            { exercise: findEx('Extensiones de Tríceps'), series: 3, repeticiones: '12', peso_sugerido: 35, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 4,
          dia_nombre: 'Día 4 (Viernes): Piernas & Glúteos',
          dia: 'Día 4 (Viernes): Piernas & Glúteos',
          dia_semana: 'Viernes',
          ejercicios: [
            { exercise: findEx('Hip Thrust'), series: 4, repeticiones: '10', peso_sugerido: 100, descanso_seg: 120 },
            { exercise: findEx('Prensa 45'), series: 3, repeticiones: '15', peso_sugerido: 140, descanso_seg: 90 },
            { exercise: findEx('Peso Muerto Rumano'), series: 3, repeticiones: '12', peso_sugerido: 28, descanso_seg: 90 },
            { exercise: findEx('Plancha Abdominal'), series: 3, repeticiones: '60 seg', peso_sugerido: null, descanso_seg: 60 }
          ]
        }
      ];

      // 2. Plantilla 3 Días
      const p2 = {
        client_id: templateClientId,
        nombre: 'Fuerza Funcional Full-Body (3 Días)',
        descripcion: 'Planificación de 3 días para fuerza submáxima y acondicionamiento integral.',
        activa: true,
        dias_por_semana: 3,
        es_plantilla: true
      };
      const daysP2 = [
        {
          dia_numero: 1,
          dia_nombre: 'Día 1 (Lunes): Full-Body A',
          dia: 'Día 1 (Lunes): Full-Body A',
          dia_semana: 'Lunes',
          ejercicios: [
            { exercise: findEx('Sentadilla Trasera'), series: 4, repeticiones: '6', peso_sugerido: 95, descanso_seg: 150 },
            { exercise: findEx('Press de Banca Plano'), series: 4, repeticiones: '6', peso_sugerido: 80, descanso_seg: 120 },
            { exercise: findEx('Remo con Barra 45'), series: 4, repeticiones: '8', peso_sugerido: 70, descanso_seg: 90 },
            { exercise: findEx('Plancha Abdominal'), series: 3, repeticiones: '45 seg', peso_sugerido: null, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 2,
          dia_nombre: 'Día 2 (Miércoles): Full-Body B',
          dia: 'Día 2 (Miércoles): Full-Body B',
          dia_semana: 'Miércoles',
          ejercicios: [
            { exercise: findEx('Peso Muerto Rumano'), series: 4, repeticiones: '8', peso_sugerido: 34, descanso_seg: 120 },
            { exercise: findEx('Press Militar'), series: 4, repeticiones: '8', peso_sugerido: 24, descanso_seg: 90 },
            { exercise: findEx('Dominadas'), series: 4, repeticiones: '8', peso_sugerido: null, descanso_seg: 90 },
            { exercise: findEx('Curl de Bíceps'), series: 3, repeticiones: '10', peso_sugerido: 32, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 3,
          dia_nombre: 'Día 3 (Viernes): Full-Body C',
          dia: 'Día 3 (Viernes): Full-Body C',
          dia_semana: 'Viernes',
          ejercicios: [
            { exercise: findEx('Hip Thrust'), series: 4, repeticiones: '8', peso_sugerido: 110, descanso_seg: 120 },
            { exercise: findEx('Press Inclinado'), series: 4, repeticiones: '10', peso_sugerido: 28, descanso_seg: 90 },
            { exercise: findEx('Jalón al Pecho'), series: 4, repeticiones: '10', peso_sugerido: 70, descanso_seg: 75 },
            { exercise: findEx('Extensiones de Tríceps'), series: 3, repeticiones: '12', peso_sugerido: 35, descanso_seg: 60 }
          ]
        }
      ];

      // 3. Plantilla 5 Días
      const p3 = {
        client_id: templateClientId,
        nombre: 'Definición & Tonificación (5 Días)',
        descripcion: 'Estructura dividida de alto volumen y densidad para máxima definición.',
        activa: true,
        dias_por_semana: 5,
        es_plantilla: true
      };
      const daysP3 = [
        {
          dia_numero: 1,
          dia_nombre: 'Día 1 (Lunes): Pecho & Core',
          dia: 'Día 1 (Lunes): Pecho & Core',
          dia_semana: 'Lunes',
          ejercicios: [
            { exercise: findEx('Press de Banca Plano'), series: 4, repeticiones: '10-12', peso_sugerido: 70, descanso_seg: 90 },
            { exercise: findEx('Press Inclinado'), series: 3, repeticiones: '12', peso_sugerido: 24, descanso_seg: 75 },
            { exercise: findEx('Cruces en Polea'), series: 3, repeticiones: '15', peso_sugerido: 12, descanso_seg: 60 },
            { exercise: findEx('Plancha Abdominal'), series: 3, repeticiones: '60 seg', peso_sugerido: null, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 2,
          dia_nombre: 'Día 2 (Martes): Espalda & Tracción',
          dia: 'Día 2 (Martes): Espalda & Tracción',
          dia_semana: 'Martes',
          ejercicios: [
            { exercise: findEx('Dominadas'), series: 4, repeticiones: '8-10', peso_sugerido: null, descanso_seg: 90 },
            { exercise: findEx('Remo con Barra 45'), series: 4, repeticiones: '10', peso_sugerido: 65, descanso_seg: 75 },
            { exercise: findEx('Jalón al Pecho'), series: 3, repeticiones: '12', peso_sugerido: 60, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 3,
          dia_numero: 3,
          dia_nombre: 'Día 3 (Miércoles): Piernas Enfoque Anterior',
          dia: 'Día 3 (Miércoles): Piernas Enfoque Anterior',
          dia_semana: 'Miércoles',
          ejercicios: [
            { exercise: findEx('Sentadilla Trasera'), series: 4, repeticiones: '8-10', peso_sugerido: 85, descanso_seg: 120 },
            { exercise: findEx('Prensa 45'), series: 4, repeticiones: '15', peso_sugerido: 150, descanso_seg: 90 }
          ]
        },
        {
          dia_numero: 4,
          dia_nombre: 'Día 4 (Jueves): Hombros & Brazos',
          dia: 'Día 4 (Jueves): Hombros & Brazos',
          dia_semana: 'Jueves',
          ejercicios: [
            { exercise: findEx('Press Militar'), series: 4, repeticiones: '10', peso_sugerido: 22, descanso_seg: 90 },
            { exercise: findEx('Laterales en Polea'), series: 4, repeticiones: '15', peso_sugerido: 10, descanso_seg: 60 },
            { exercise: findEx('Curl de Bíceps'), series: 3, repeticiones: '12', peso_sugerido: 30, descanso_seg: 60 },
            { exercise: findEx('Extensiones de Tríceps'), series: 3, repeticiones: '12', peso_sugerido: 35, descanso_seg: 60 }
          ]
        },
        {
          dia_numero: 5,
          dia_nombre: 'Día 5 (Viernes): Glúteos & Isquios',
          dia: 'Día 5 (Viernes): Glúteos & Isquios',
          dia_semana: 'Viernes',
          ejercicios: [
            { exercise: findEx('Hip Thrust'), series: 4, repeticiones: '10', peso_sugerido: 105, descanso_seg: 120 },
            { exercise: findEx('Peso Muerto Rumano'), series: 4, repeticiones: '12', peso_sugerido: 32, descanso_seg: 90 },
            { exercise: findEx('Plancha Abdominal'), series: 3, repeticiones: '45 seg', peso_sugerido: null, descanso_seg: 60 }
          ]
        }
      ];

      const r1 = await this.saveRoutine(p1, daysP1, null);
      const r2 = await this.saveRoutine(p2, daysP2, null);
      const r3 = await this.saveRoutine(p3, daysP3, null);

      return [r1, r2, r3].filter(Boolean);
    } catch (err) {
      console.warn('[DataService] Error en seedInitialRoutines:', err);
      return [];
    }
  },

  async saveRoutine(routineData, daysList, existingId = null) {
    try {
      // 1. EXTRAER coach_id DE LA SESIÓN ACTIVA (SUPABASE AUTH)
      let activeCoachId = null;
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (!authErr && authData?.user?.id) {
          activeCoachId = authData.user.id;
        }
      } catch (e) {
        console.warn('[DataService] Fallo al consultar usuario de supabase.auth:', e);
      }

      if (!activeCoachId) {
        try {
          const session = JSON.parse(localStorage.getItem('ec_trainer_auth_session') || '{}');
          if (session?.user?.id) activeCoachId = session.user.id;
        } catch (e) {}
      }

      if (!activeCoachId) {
        activeCoachId = '00000000-0000-0000-0000-000000000001';
      }

      // 2. VALIDAR client_id SI SE ASIGNA A UN ALUMNO (FORZAR NULL SI ES PLANTILLA O VACÍO)
      const rawClientId = routineData.client_id && typeof routineData.client_id === 'string'
        ? routineData.client_id.trim()
        : null;

      const isTemplate = Boolean(
        routineData.es_plantilla || 
        routineData.destinatarioTipo === 'plantilla' ||
        !rawClientId || 
        rawClientId === '00000000-0000-0000-0000-000000000000'
      );

      let targetClientId = null;
      if (!isTemplate) {
        if (!rawClientId || rawClientId === '00000000-0000-0000-0000-000000000000') {
          const clientError = new Error('Debes seleccionar un alumno válido para asignar la rutina.');
          console.error('Error detallado de Supabase:', clientError);
          throw clientError;
        }
        targetClientId = rawClientId;
      }

      // 3. ESTRUCTURAR DÍAS, SERIES, REPS Y EJERCICIOS EN FORMATO JSON VÁLIDO (jsonb)
      const daysCount = (daysList && daysList.length > 0)
        ? daysList.length
        : (parseInt(routineData.frecuenciaDias, 10) || 3);

      const cleanedDays = (daysList || []).map((d, dIdx) => {
        const dayNum = d.dia_numero || dIdx + 1;
        const dayTitle = d.dia || d.dia_nombre || `Día ${dayNum}`;
        const dayWeek = d.dia_semana || extractWeekday(dayTitle) || `Día ${dayNum}`;

        const cleanExercises = (d.ejercicios || []).map((item, exIdx) => {
          const exObj = item.exercise || {};
          const exId = exObj.id || item.exercise_id;
          return {
            id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? `ex-${crypto.randomUUID()}` : `ex-${Date.now()}-${exIdx}`),
            exercise_id: exId,
            exercise: {
              id: exId,
              nombre: exObj.nombre || 'Ejercicio',
              grupo_muscular: exObj.grupo_muscular || 'General',
              imagen_url: exObj.imagen_url || null,
              instrucciones: exObj.instrucciones || ''
            },
            series: parseInt(item.series, 10) || 4,
            repeticiones: String(item.repeticiones || '10-12'),
            peso_sugerido: parseWeight(item.peso_sugerido !== null && item.peso_sugerido !== undefined ? item.peso_sugerido : item.peso),
            peso_raw: item.peso_sugerido !== null && item.peso_sugerido !== undefined ? item.peso_sugerido : item.peso,
            descanso_seg: parseInt(item.descanso_seg || item.descanso_segundos || 90, 10),
            descanso_segundos: parseInt(item.descanso_seg || item.descanso_segundos || 90, 10),
            orden: item.orden || exIdx + 1
          };
        });

        return {
          id: d.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? `day-${crypto.randomUUID()}` : `day-${Date.now()}-${dIdx}`),
          dia_numero: dayNum,
          dia_nombre: dayTitle,
          dia: dayTitle,
          dia_semana: dayWeek,
          ejercicios: cleanExercises
        };
      });

      // 4. PREPARAR PAYLOAD SANEADO PARA SUPABASE (SOLO COLUMNAS REALES DE ROUTINES)
      // client_id DEBE ser null para plantillas para evitar error 23503 foreign key violation
      const payloadLimpio = {
        client_id: targetClientId, // null para plantillas generales o UUID real existente en clients
        nombre: (routineData.nombre || 'Rutina Personalizada').trim(),
        descripcion: (routineData.descripcion || routineData.objetivo || '').trim(),
        activa: routineData.activa ?? true,
        dias_por_semana: daysCount,
        es_plantilla: isTemplate,
        dia_semana: typeof cleanedDays === 'string' ? cleanedDays : JSON.stringify(cleanedDays) // Respaldo JSON seguro en columna de texto dia_semana
      };

      if (routineData.nivel) payloadLimpio.nivel = routineData.nivel;
      if (routineData.objetivo) payloadLimpio.objetivo = routineData.objetivo;

      if (existingId) {
        payloadLimpio.id = existingId;
      }

      // Si es para un alumno y es una nueva rutina/asignación, desactivar rutinas previas del alumno
      if (!isTemplate && targetClientId && !existingId) {
        try {
          await supabase
            .from('routines')
            .update({ activa: false })
            .eq('client_id', targetClientId);
        } catch (deactErr) {
          // Desactivación no crítica
        }
      }

      // 5. UPSERT DIRECTO CON RESOLUCIÓN DE CONFLICTO POR ID (EVITA ERROR 409)
      const { data: savedRecord, error: saveErr } = await supabase
        .from('routines')
        .upsert(payloadLimpio, { onConflict: 'id' })
        .select('*')
        .single();

      if (saveErr) {
        console.error('Error detallado de Supabase en saveRoutine:', saveErr);
        throw saveErr;
      }

      const routineId = savedRecord.id;

      // 5. PERSISTIR RESPALDO LOCAL
      try {
        localStorage.setItem(`ec_routine_days_${routineId}`, JSON.stringify(cleanedDays));
      } catch (e) {}

      // Si es asignada a alumno, actualizar metadata del alumno
      if (!isTemplate && targetClientId && targetClientId !== '00000000-0000-0000-0000-000000000000') {
        saveClientMeta(targetClientId, {
          rutina_activa: savedRecord?.nombre || routineData.nombre,
          dias_por_semana: daysCount
        });
      }

      return formatRoutineWithDays({
        ...savedRecord,
        dias: cleanedDays
      });
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
      throw err;
    }
  },

  async createRoutine(routineData, exercisesList) {
    const daysList = routineData.dias && routineData.dias.length > 0
      ? routineData.dias
      : [{
          dia_numero: 1,
          dia: routineData.dia || 'Sesión Asignada',
          dia_nombre: routineData.dia || 'Sesión Asignada',
          dia_semana: extractWeekday(routineData.dia) || 'Lunes',
          ejercicios: exercisesList || []
        }];

    return this.saveRoutine(routineData, daysList, null);
  },

  async assignRoutineToClient(routineId, clientId) {
    try {
      if (!clientId || clientId === '00000000-0000-0000-0000-000000000000') {
        const err = new Error('ID de alumno no válido para la asignación');
        console.error('Error detallado de Supabase:', err);
        throw err;
      }

      // Buscar la rutina origen
      const allRoutines = await this.getAllRoutines();
      let sourceRoutine = allRoutines.find(r => r.id === routineId);

      if (!sourceRoutine) {
        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .eq('id', routineId)
          .single();

        if (error || !data) {
          const fetchErr = error || new Error('No se encontró la rutina de origen');
          console.error('Error detallado de Supabase:', fetchErr);
          throw fetchErr;
        }
        sourceRoutine = formatRoutineWithDays(data);
      }

      const client = await this.getClientById(clientId);
      const clientName = client?.nombre_completo || 'Alumno';

      // Deep clone de días y ejercicios con nuevos identificadores únicos
      // Garantiza 100% de independencia: modificar series/peso del alumno no altera la plantilla base
      const clonedDays = (sourceRoutine.dias || []).map((d, dIdx) => ({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? `day-${crypto.randomUUID()}` : `day-${Date.now()}-${dIdx}`,
        dia_numero: d.dia_numero || dIdx + 1,
        dia_nombre: d.dia_nombre || d.dia || `Día ${dIdx + 1}`,
        dia: d.dia || d.dia_nombre || `Día ${dIdx + 1}`,
        dia_semana: d.dia_semana || `Día ${dIdx + 1}`,
        ejercicios: (d.ejercicios || []).map((item, exIdx) => ({
          ...item,
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? `ex-${crypto.randomUUID()}` : `ex-${Date.now()}-${dIdx}-${exIdx}`,
          exercise: item.exercise ? { ...item.exercise } : {}
        }))
      }));

      const payload = {
        nombre: sourceRoutine.es_plantilla 
          ? `${sourceRoutine.nombre.replace(/ \(Plantilla\)/i, '')} - ${clientName}`
          : `${sourceRoutine.nombre} (Asignada)`,
        descripcion: sourceRoutine.descripcion || `Rutina personalizada para ${clientName}`,
        client_id: clientId,
        es_plantilla: false,
        activa: true,
        dias_por_semana: sourceRoutine.dias_por_semana || (clonedDays.length || 3)
      };

      // Validación preventiva contra duplicados en Supabase
      const baseCleanName = sourceRoutine.nombre
        .replace(/\s*\(Plantilla\)/gi, '')
        .replace(/\s*\(Asignada\)/gi, '')
        .replace(/\s*-\s*[^-]+$/, '')
        .trim();

      const { data: existingRoutines } = await supabase
        .from('routines')
        .select('id, nombre, activa')
        .eq('client_id', clientId)
        .eq('activa', true);

      const isDuplicate = (existingRoutines || []).some(r => {
        if (r.activa === false) return false;
        const rClean = (r.nombre || '').replace(/\s*\(Plantilla\)/gi, '').replace(/\s*\(Asignada\)/gi, '').replace(/\s*-\s*[^-]+$/, '').trim().toLowerCase();
        return (
          r.nombre?.toLowerCase() === sourceRoutine.nombre?.toLowerCase() ||
          r.nombre?.toLowerCase() === payload.nombre?.toLowerCase() ||
          (baseCleanName && rClean && baseCleanName.toLowerCase() === rClean.toLowerCase())
        );
      });

      if (isDuplicate) {
        throw new Error(`Este alumno (${clientName}) ya tiene esta rutina asignada.`);
      }

      // 1. Apagar todas las rutinas anteriores del alumno para garantizar que solo tenga una activa
      const { error: archiveError } = await supabase
        .from('routines')
        .update({ activa: false })
        .eq('client_id', clientId);

      if (archiveError) {
        console.error("Error archivando rutinas viejas:", archiveError);
        throw new Error("No se pudieron limpiar las rutinas anteriores.");
      }

      // 2. existingId = null fuerza un INSERT completamente nuevo en Supabase routines
      return await this.saveRoutine(payload, clonedDays, null);
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
      throw err;
    }
  },

  async deleteRoutine(routineId) {
    if (!routineId) {
      const err = new Error('ID de rutina requerido para eliminar');
      console.error('Error detallado de Supabase al eliminar rutina:', err);
      throw err;
    }

    try {
      // 1. Obtener datos previos de la rutina para saber si estaba asignada a un alumno
      let clientId = null;
      try {
        const { data: routineRecord } = await supabase
          .from('routines')
          .select('client_id')
          .eq('id', routineId)
          .maybeSingle();

        if (routineRecord?.client_id && routineRecord.client_id !== '00000000-0000-0000-0000-000000000000') {
          clientId = routineRecord.client_id;
        }
      } catch (e) {}

      // 2. Ejecutar DELETE directamente sobre la tabla routines
      const { error: rErr } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId);

      if (rErr) {
        console.error('Error detallado de Supabase al eliminar rutina:', rErr);
        throw rErr;
      }

      // 3. Limpiar caché en localStorage de días de la rutina
      try {
        localStorage.removeItem(`ec_routine_days_${routineId}`);
      } catch (e) {}

      // 4. Si pertenecía a un alumno, limpiar su rutina activa en metadatos
      if (clientId) {
        try {
          saveClientMeta(clientId, {
            rutina_activa: null,
            tiene_rutina: false
          });
        } catch (e) {}
      }

      return { success: true, id: routineId };
    } catch (err) {
      console.error('Error detallado de Supabase al eliminar rutina:', err);
      throw err;
    }
  },

  async getRoutineForClient(clientId) {
    if (!clientId) return null;
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('routines')
          .select('*')
          .eq('client_id', clientId)
          .eq('activa', true)
          .order('creado_el', { ascending: false })
          .limit(1)
          .maybeSingle()
      );

      if (error) {
        console.error('Error detallado de Supabase en getRoutineForClient:', error);
        return null;
      }

      if (data) {
        return formatRoutineWithDays(data);
      }
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
    }

    return null;
  },

  async unassignRoutineFromClient(clientId) {
    if (!clientId) return false;
    try {
      const { error } = await supabase
        .from('routines')
        .update({ activa: false })
        .eq('client_id', clientId);

      if (error) {
        console.error('Error detallado de Supabase:', error);
        throw error;
      }

      saveClientMeta(clientId, {
        rutina_activa: null
      });

      return true;
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
      return false;
    }
  },

  // ==========================================================
  // 6. AGENDA Y TURNOS (EXCLUSIVAMENTE SUPABASE)
  // ==========================================================
  async getAppointments() {
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('appointments')
          .select(`
            *,
            client:clients(id, nombre_completo, foto_url, access_code, telefono, modalidad, estado)
          `)
          .order('fecha_hora_inicio', { ascending: true })
      );

      if (error) {
        console.error('[DataService] Error consultando appointments en Supabase:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const metaMap = getAppointmentsMetaMap();
      return data.map(apt => {
        const meta = metaMap[apt.id] || {};
        return {
          ...apt,
          client_name: apt.client?.nombre_completo || 'Alumno',
          notas: meta.notas || '',
          tipo_detalle: meta.tipo_detalle || apt.tipo,
          client: apt.client || null
        };
      });
    } catch (err) {
      console.error('[DataService] Excepción en getAppointments:', err);
      return [];
    }
  },

  async addAppointment(aptData) {
    let coachId = '00000000-0000-0000-0000-000000000001';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        coachId = session.user.id;
      }
    } catch (e) {}

    // Respetar CHECK constraint de Postgres (tipo IN ('Presencial', 'Online'))
    const dbTipo = (aptData.tipo === 'Online') ? 'Online' : 'Presencial';

    const payload = {
      coach_id: coachId,
      client_id: aptData.client_id,
      fecha_hora_inicio: aptData.fecha_hora_inicio,
      fecha_hora_fin: aptData.fecha_hora_fin,
      tipo: dbTipo,
      estado: aptData.estado || 'Confirmado'
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([payload])
      .select(`
        *,
        client:clients(id, nombre_completo, foto_url, access_code, telefono, modalidad, estado)
      `)
      .single();

    if (error) {
      console.error('[DataService] Error insertando appointment en Supabase:', error);
      throw error;
    }

    if (aptData.notas || aptData.tipo) {
      saveAppointmentMeta(data.id, {
        notas: aptData.notas || '',
        tipo_detalle: aptData.tipo || dbTipo
      });
    }

    return {
      ...data,
      client_name: data.client?.nombre_completo || aptData.client_name || 'Alumno',
      notas: aptData.notas || '',
      tipo_detalle: aptData.tipo || dbTipo
    };
  },

  async updateAppointment(id, updates) {
    const dbUpdates = {};
    if (updates.fecha_hora_inicio) dbUpdates.fecha_hora_inicio = updates.fecha_hora_inicio;
    if (updates.fecha_hora_fin) dbUpdates.fecha_hora_fin = updates.fecha_hora_fin;
    if (updates.tipo) {
      dbUpdates.tipo = updates.tipo === 'Online' ? 'Online' : 'Presencial';
    }
    if (updates.estado) {
      dbUpdates.estado = updates.estado;
    }
    if (updates.client_id) dbUpdates.client_id = updates.client_id;

    const { data, error } = await supabase
      .from('appointments')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        client:clients(id, nombre_completo, foto_url, access_code, telefono, modalidad, estado)
      `)
      .single();

    if (error) {
      console.error('[DataService] Error actualizando appointment en Supabase:', error);
      throw error;
    }

    if (updates.notas !== undefined || updates.tipo) {
      saveAppointmentMeta(id, {
        notas: updates.notas || '',
        tipo_detalle: updates.tipo || dbUpdates.tipo
      });
    }

    const metaMap = getAppointmentsMetaMap();
    const meta = metaMap[id] || {};
    return {
      ...data,
      client_name: data.client?.nombre_completo || 'Alumno',
      notas: meta.notas || '',
      tipo_detalle: meta.tipo_detalle || data.tipo
    };
  },

  async cancelAppointment(id) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ estado: 'Cancelado' })
      .eq('id', id)
      .select(`
        *,
        client:clients(id, nombre_completo, foto_url, access_code, telefono, modalidad, estado)
      `)
      .single();

    if (error) {
      console.error('[DataService] Error cancelando appointment en Supabase:', error);
      throw error;
    }

    const metaMap = getAppointmentsMetaMap();
    const meta = metaMap[id] || {};
    return {
      ...data,
      client_name: data.client?.nombre_completo || 'Alumno',
      notas: meta.notas || '',
      tipo_detalle: meta.tipo_detalle || data.tipo
    };
  },

  async deleteAppointment(id) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DataService] Error eliminando appointment en Supabase:', error);
      throw error;
    }
    removeAppointmentMeta(id);
    return true;
  },

  // ==========================================================
  // SEGUIMIENTO DE RUTINAS: FECHA DE INICIO & SESIONES DE ENTRENO
  // ==========================================================

  async getRoutineStartDate(clientId) {
    if (!clientId) return null;

    // 1. Consultar clients en Supabase (fecha_inicio o fecha_inicio_rutina)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('fecha_inicio, fecha_inicio_rutina')
        .eq('id', clientId)
        .maybeSingle();

      if (!error && data) {
        if (data.fecha_inicio) return String(data.fecha_inicio).split('T')[0];
        if (data.fecha_inicio_rutina) return String(data.fecha_inicio_rutina).split('T')[0];
      }
    } catch (e) {
      console.warn('[DataService] Error consultando fecha_inicio en clients:', e);
    }

    // 2. Fallback a metadatos locales persistentes
    try {
      const clientStored = localStorage.getItem(`ec_routine_start_${clientId}`);
      if (clientStored) return clientStored.split('T')[0];

      const raw = localStorage.getItem(`ec_client_meta_${clientId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const stored = parsed.fecha_inicio || parsed.fecha_inicio_rutina;
        if (stored) return String(stored).split('T')[0];
      }

      const alumnoRaw = localStorage.getItem('alumno_session');
      if (alumnoRaw) {
        const parsed = JSON.parse(alumnoRaw);
        if (parsed.id === clientId && (parsed.fecha_inicio || parsed.fecha_inicio_rutina)) {
          return String(parsed.fecha_inicio || parsed.fecha_inicio_rutina).split('T')[0];
        }
      }
    } catch {
      // ignore
    }

    return null;
  },

  async updateRoutineStartDate(clientId, startDate) {
    if (!clientId || !startDate) return false;

    // Normalizar estrictamente a formato ISO YYYY-MM-DD
    let isoDate;
    try {
      if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
        isoDate = startDate.trim();
      } else if (typeof startDate === 'string' && startDate.includes('T')) {
        isoDate = startDate.split('T')[0];
      } else {
        const d = new Date(startDate);
        isoDate = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      }
    } catch {
      isoDate = new Date().toISOString().split('T')[0];
    }

    // 1. Persistir inmediatamente en localStorage y sincronizar sesión
    try {
      localStorage.setItem(`ec_routine_start_${clientId}`, isoDate);
      const raw = localStorage.getItem(`ec_client_meta_${clientId}`);
      const current = raw ? JSON.parse(raw) : {};
      localStorage.setItem(`ec_client_meta_${clientId}`, JSON.stringify({
        ...current,
        fecha_inicio: isoDate,
        fecha_inicio_rutina: isoDate
      }));

      // Sincronizar también alumno_session si pertenece al alumno activo
      const alumnoRaw = localStorage.getItem('alumno_session');
      if (alumnoRaw) {
        const parsed = JSON.parse(alumnoRaw);
        if (parsed.id === clientId) {
          parsed.fecha_inicio = isoDate;
          parsed.fecha_inicio_rutina = isoDate;
          localStorage.setItem('alumno_session', JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('[DataService] Error guardando fecha en storage local:', e);
    }

    // 2. Actualizar tabla clients en Supabase: actualizar fecha_inicio y fecha_inicio_rutina
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ fecha_inicio: isoDate, fecha_inicio_rutina: isoDate })
        .eq('id', clientId)
        .select();

      if (!error && data) return true;

      // Si falla por columna no existente (PGRST204), intentar columna por columna
      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
        try {
          await supabase.from('clients').update({ fecha_inicio: isoDate }).eq('id', clientId);
        } catch {}
        try {
          await supabase.from('clients').update({ fecha_inicio_rutina: isoDate }).eq('id', clientId);
        } catch {}
      }
    } catch (err) {
      console.warn('[DataService] Excepción actualizando clients fecha_inicio:', err);
    }

    return true;
  },

  async recordTrainingSession({ clientId, nombreDia = 'Día 1', diaRutina = null, dayId = null, routineDayId = null, fecha = null, completada = true }) {
    if (!clientId) throw new Error('clientId es requerido');

    const dayName = nombreDia || diaRutina || 'Día 1';
    const rDayId = routineDayId || dayId || null;
    const sessionDate = fecha || new Date().toISOString().split('T')[0];
    const newSessionLocal = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ts-${Date.now()}`,
      client_id: clientId,
      nombre_dia: dayName,
      dia_rutina: dayName,
      routine_day_id: rDayId,
      fecha: sessionDate,
      completada: Boolean(completada),
      created_at: new Date().toISOString()
    };

    // 1. Guardar en Supabase (tabla training_sessions) ÚNICAMENTE con .insert()
    // NUNCA muta ni actualiza la rutina asignada ni sus días en la tabla 'routines'
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .insert([{
          client_id: clientId,
          nombre_dia: dayName,
          fecha: sessionDate,
          completada: Boolean(completada)
        }])
        .select()
        .single();

      if (!error && data) {
        const fullSaved = { ...newSessionLocal, ...data, nombre_dia: dayName, dia_rutina: dayName, routine_day_id: rDayId };
        this.saveLocalTrainingSession(clientId, fullSaved);
        return fullSaved;
      }

      // Si falla por PGRST204 o constraint, reintentar con columnas base
      if (error) {
        console.warn('[DataService] Falló insert con nombre_dia, intentando columnas base:', error);
        const { data: baseData, error: baseError } = await supabase
          .from('training_sessions')
          .insert([{
            client_id: clientId,
            fecha: sessionDate,
            completada: Boolean(completada)
          }])
          .select()
          .single();

        if (!baseError && baseData) {
          const fullSaved = { ...newSessionLocal, ...baseData, nombre_dia: dayName, dia_rutina: dayName, routine_day_id: rDayId };
          this.saveLocalTrainingSession(clientId, fullSaved);
          return fullSaved;
        }
      }
    } catch (err) {
      console.warn('[DataService] Excepción registrando sesión en Supabase:', err);
    }

    // 2. Respaldo en storage local
    this.saveLocalTrainingSession(clientId, newSessionLocal);
    return newSessionLocal;
  },

  saveLocalTrainingSession(clientId, sessionObj) {
    try {
      const key = `ec_sessions_${clientId}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const filtered = list.filter(s => s.id !== sessionObj.id);
      filtered.unshift(sessionObj);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[DataService] Error guardando sesión local:', e);
    }
  },

  async getTrainingSessionsForClient(clientId) {
    if (!clientId) return [];

    let supabaseSessions = [];
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('training_sessions')
          .select('*')
          .eq('client_id', clientId)
          .order('fecha', { ascending: false })
      );

      if (!error && data) {
        supabaseSessions = data;
      }
    } catch (err) {
      console.warn('[DataService] Error consultando training_sessions:', err);
    }

    // Cargar sesiones locales
    let localSessions = [];
    try {
      const raw = localStorage.getItem(`ec_sessions_${clientId}`);
      if (raw) localSessions = JSON.parse(raw);
    } catch {
      // ignore
    }

    // Combinar sesiones garantizando los campos dia_rutina
    const sessionMap = new Map();
    localSessions.forEach(s => sessionMap.set(`${s.fecha}_${s.dia_rutina || 'd'}`, s));
    supabaseSessions.forEach(s => {
      const key = `${s.fecha}_${s.dia_rutina || 'd'}`;
      if (sessionMap.has(key)) {
        sessionMap.set(key, { ...s, ...sessionMap.get(key) });
      } else {
        sessionMap.set(s.id || key, s);
      }
    });

    return Array.from(sessionMap.values()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  async getWeeklySessionsForClient(clientId, refDate = new Date()) {
    if (!clientId) return { sessions: [], count: 0, mondayStr: '', sundayStr: '' };

    const d = new Date(refDate);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    const allSessions = await this.getTrainingSessionsForClient(clientId);
    const weeklySessions = allSessions.filter(s => {
      if (!s.completada && s.completada !== undefined) return false;
      const sDate = (s.fecha || '').split('T')[0];
      return sDate >= mondayStr && sDate <= sundayStr;
    });

    const result = [...weeklySessions];
    result.sessions = weeklySessions;
    result.count = weeklySessions.length;
    result.mondayStr = mondayStr;
    result.sundayStr = sundayStr;
    return result;
  },

  // ==========================================================
  // REGISTRO DE ENTRENAMIENTO REAL (FEEDBACK DE CARGAS & SESIONES)
  // ==========================================================
  async saveWorkoutSession({ clientId, comentarios, exercises = [] }) {
    if (!clientId) {
      console.error('[DataService] saveWorkoutSession requiere clientId');
      return { data: null, error: new Error('clientId es requerido') };
    }

    try {
      const sessionPayload = {
        client_id: clientId,
        fecha: new Date().toISOString(),
        comentarios_alumno: comentarios ? String(comentarios).trim() : null
      };

      const { data: sessionData, error: sessionError } = await withAuthRetry(() =>
        supabase
          .from('session_logs')
          .insert([sessionPayload])
          .select()
          .single()
      );

      if (sessionError) {
        console.error('[DataService] Error insertando session_logs:', sessionError);
        throw sessionError;
      }

      const sessionLogId = sessionData.id;
      let savedExerciseLogs = [];

      if (exercises && exercises.length > 0) {
        const toInt = (val) => {
          if (val === undefined || val === null || val === '') return null;
          const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
          return isNaN(num) ? null : num;
        };

        const toFloat = (val) => {
          if (val === undefined || val === null || val === '') return null;
          const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
          return isNaN(num) ? null : num;
        };

        const exerciseRows = exercises.map(ex => ({
          session_log_id: sessionLogId,
          exercise_name: ex.exercise_name || ex.nombre || 'Ejercicio',
          prescribed_sets: toInt(ex.prescribed_sets ?? ex.series),
          prescribed_reps: toInt(ex.prescribed_reps ?? ex.repeticiones),
          prescribed_weight: toFloat(ex.prescribed_weight ?? ex.peso_sugerido ?? ex.peso),
          actual_sets: toInt(ex.actual_sets ?? ex.series_reales ?? ex.series),
          actual_reps: toInt(ex.actual_reps ?? ex.reps_reales ?? ex.repeticiones),
          actual_weight: toFloat(ex.actual_weight ?? ex.peso_real ?? ex.peso_sugerido)
        }));

        const { data: exData, error: exercisesError } = await withAuthRetry(() =>
          supabase
            .from('session_exercise_logs')
            .insert(exerciseRows)
            .select()
        );

        if (exercisesError) {
          console.error('[DataService] Error insertando session_exercise_logs:', exercisesError);
        } else if (exData) {
          savedExerciseLogs = exData;
        }
      }

      const fullResult = {
        ...sessionData,
        session_exercise_logs: savedExerciseLogs.length > 0 ? savedExerciseLogs : exercises
      };

      // Guardar también en caché local de respaldo
      try {
        const key = `ec_session_logs_${clientId}`;
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = [fullResult, ...prev.filter(p => p.id !== fullResult.id)];
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }

      return { data: fullResult, error: null };
    } catch (err) {
      console.error('[DataService] Exception in saveWorkoutSession:', err);
      // Fallback local en caso de error de red o tabla
      const mockSession = {
        id: `local-session-${Date.now()}`,
        client_id: clientId,
        fecha: new Date().toISOString(),
        comentarios_alumno: comentarios || null,
        session_exercise_logs: exercises.map((ex, idx) => ({
          id: `local-ex-${Date.now()}-${idx}`,
          exercise_name: ex.exercise_name || ex.nombre || 'Ejercicio',
          prescribed_sets: ex.prescribed_sets ?? ex.series,
          prescribed_reps: ex.prescribed_reps ?? ex.repeticiones,
          prescribed_weight: ex.prescribed_weight ?? ex.peso_sugerido,
          actual_sets: ex.actual_sets ?? ex.series_reales ?? ex.series,
          actual_reps: ex.actual_reps ?? ex.reps_reales ?? ex.repeticiones,
          actual_weight: ex.actual_weight ?? ex.peso_real ?? ex.peso_sugerido
        }))
      };

      try {
        const key = `ec_session_logs_${clientId}`;
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([mockSession, ...prev]));
      } catch (e) {}

      return { data: mockSession, error: err };
    }
  },

  async getClientSessionLogs(clientId) {
    if (!clientId) return [];

    let supabaseLogs = [];
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase
          .from('session_logs')
          .select('*, session_exercise_logs(*)')
          .eq('client_id', clientId)
          .order('fecha', { ascending: false })
      );

      if (!error && Array.isArray(data)) {
        supabaseLogs = data;
      }
    } catch (err) {
      console.warn('[DataService] Error consultando session_logs:', err);
    }

    // Combinar con almacenamiento local
    let localLogs = [];
    try {
      const raw = localStorage.getItem(`ec_session_logs_${clientId}`);
      if (raw) localLogs = JSON.parse(raw);
    } catch (e) {}

    const logsMap = new Map();
    localLogs.forEach(l => logsMap.set(l.id, l));
    supabaseLogs.forEach(l => logsMap.set(l.id, l));

    return Array.from(logsMap.values()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }
};

const APPOINTMENTS_META_KEY = 'ec_appointments_meta_v1';

function getAppointmentsMetaMap() {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAppointmentMeta(id, meta) {
  try {
    const current = getAppointmentsMetaMap();
    current[id] = { ...(current[id] || {}), ...meta };
    localStorage.setItem(APPOINTMENTS_META_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('[DataService] Error guardando meta local de turno:', e);
  }
}

function removeAppointmentMeta(id) {
  try {
    const current = getAppointmentsMetaMap();
    delete current[id];
    localStorage.setItem(APPOINTMENTS_META_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('[DataService] Error eliminando meta local de turno:', e);
  }
}

export default dataService;
