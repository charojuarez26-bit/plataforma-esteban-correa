import { supabase } from '../lib/supabase';
import {
  INITIAL_EXERCISES,
  INITIAL_ROUTINE,
  INITIAL_EVALUATIONS,
  INITIAL_APPOINTMENTS,
  INITIAL_PAYMENTS,
  WEEKLY_CHART_DATA,
  MONTHLY_INCOME_DATA
} from '../data/mockData';

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
  'foto_url'
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

  return {
    ...c,
    foto_url: photo,
    avatar_url: photo,
    rutina_activa: routineName,
    tiene_rutina: Boolean(routineName),
    notas: meta.notas || c.notas || '',
    plan_actual: meta.plan_actual || c.plan_actual || 'Plan Personalizado',
    dias_por_semana: meta.dias_por_semana || c.dias_por_semana || 3,
    dias_asignados: meta.dias_asignados || c.dias_asignados || ['Lunes', 'Miércoles', 'Viernes'],
    tipo_planificacion: meta.tipo_planificacion || c.tipo_planificacion || 'Semanal',
    duracion_sesion_min: meta.duracion_sesion_min || c.duracion_sesion_min || 60
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

  const rawExercises = (rawRoutine.routine_exercises || []).slice().sort((a, b) => {
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

  let dias = dayKeysInOrder.map(k => daysMap[k]);

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

  return {
    ...rawRoutine,
    objetivo: rawRoutine.descripcion || 'Sobrecarga progresiva e hipertrofia',
    nivel: 'Intermedio',
    activa: rawRoutine.activa ?? true,
    activo: rawRoutine.activa ?? true,
    es_plantilla: isTemplate,
    dias,
    total_ejercicios: rawExercises.length,
    client: isTemplate ? null : rawRoutine.client
  };
}

export const dataService = {
  // ==========================================================
  // 1. MÉTRICAS CON SELECT A CLIENTS, EVALUATIONS Y PAYMENTS
  // ==========================================================
  async getDashboardMetrics() {
    try {
      // SELECT directo a la tabla 'clients' ordenado por creado_el DESC
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('creado_el', { ascending: false });

      if (clientsError) {
        console.error('[DataService] Error consultando clients en Supabase:', clientsError);
      }

      // SELECT directo a la tabla 'evaluations'
      const { data: evaluationsData, error: evalError } = await supabase
        .from('evaluations')
        .select('*');

      // SELECT directo a la tabla 'payments'
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*');

      // SELECT a la tabla 'appointments'
      const { data: aptsData } = await supabase
        .from('appointments')
        .select('*');

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

      // Planes por vencer o pendientes en pagos
      const expiringPlansCount = payments.filter(p => {
        const estado = (p.estado || '').toLowerCase();
        return estado === 'pendiente' || estado === 'vencido';
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

  // ==========================================================
  // 2. CLIENTES (SELECT, INSERT Y UPDATE EXCLUSIVAMENTE EN SUPABASE)
  // ==========================================================
  async getClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*, routines(id, nombre, activa)')
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .order('creado_el', { ascending: false });

      if (error) {
        console.error('[DataService] Error consultando clients en Supabase:', error);
        return [];
      }
      return (data || []).map(enrichClient);
    } catch (err) {
      console.error('[DataService] Error en getClients:', err);
      return [];
    }
  },

  async getClientById(id) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*, routines(id, nombre, activa)')
        .eq('id', id)
        .single();

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
          upsert: false
        });

      if (uploadError) {
        console.error('[DataService] Error subiendo foto a Supabase Storage:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
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

      Object.keys(updates).forEach((key) => {
        if (CLIENT_DB_COLUMNS.includes(key)) {
          if (key === 'edad') {
            dbPayload[key] = updates[key] ? parseInt(updates[key], 10) : null;
          } else if (key === 'altura') {
            dbPayload[key] = updates[key] ? parseFloat(updates[key]) : null;
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

      saveClientMeta(id, metaPayload);

      if (Object.keys(dbPayload).length > 0) {
        const { data, error } = await supabase
          .from('clients')
          .update(dbPayload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('[DataService] Error actualizando cliente en Supabase:', error);
          throw error;
        }
        return enrichClient(data);
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
  async getEvaluations(clientId = null) {
    try {
      let query = supabase
        .from('evaluations')
        .select('*')
        .order('fecha', { ascending: true });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
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
      const { data, error } = await supabase
        .from('evaluations')
        .insert([payload])
        .select()
        .single();

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
  // 4. PAGOS (SELECT E INSERT EN SUPABASE)
  // ==========================================================
  async getPayments() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('fecha_vencimiento', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('[DataService] Error en getPayments Supabase:', err);
    }
    return INITIAL_PAYMENTS;
  },

  async addPayment(payData) {
    const payload = {
      client_id: payData.client_id,
      plan_nombre: payData.plan_nombre,
      monto: parseFloat(payData.monto),
      fecha_pago: payData.fecha_pago || new Date().toISOString().split('T')[0],
      fecha_vencimiento: payData.fecha_vencimiento,
      metodo: payData.metodo || 'Transferencia',
      estado: payData.estado || 'Pagado'
    };

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('[DataService] Error insertando pago en Supabase:', err);
    }

    return {
      id: `pay-${Date.now()}`,
      ...payload,
      client_name: payData.client_name || 'Alumno'
    };
  },

  // ==========================================================
  // 5. EJERCICIOS (SELECT, INSERT, UPDATE, DELETE EN SUPABASE)
  // ==========================================================
  async getExercises(filterGroup = 'Todos') {
    try {
      let query = supabase.from('exercises').select('*').order('nombre', { ascending: true });
      if (filterGroup !== 'Todos') {
        query = query.eq('grupo_muscular', filterGroup);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }

      // Si la tabla exercises está vacía, sembrar catálogo oficial inicial en Supabase
      if (!error && (!data || data.length === 0) && filterGroup === 'Todos') {
        const seeded = await this.seedInitialExercises();
        if (seeded && seeded.length > 0) {
          return seeded;
        }
      }
    } catch (err) {
      console.warn('[DataService] Error en getExercises Supabase:', err);
    }

    if (filterGroup === 'Todos') return INITIAL_EXERCISES;
    return INITIAL_EXERCISES.filter(e => (e.grupo_muscular || '').toLowerCase() === filterGroup.toLowerCase());
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
      const { data, error } = await supabase
        .from('routines')
        .select(`
          *,
          client:clients(*),
          routine_exercises (
            *,
            exercise:exercises(*)
          )
        `)
        .order('creado_el', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(formatRoutineWithDays);
      }

      // Si no hay rutinas en Supabase, sembrar plantillas oficiales
      if (!error && (!data || data.length === 0)) {
        const seeded = await this.seedInitialRoutines();
        if (seeded && seeded.length > 0) {
          return seeded.map(formatRoutineWithDays);
        }
      }
    } catch (err) {
      console.warn('[DataService] Error consultando rutinas en Supabase:', err);
    }

    return [];
  },

  async seedInitialRoutines() {
    try {
      const templateClientId = '00000000-0000-0000-0000-000000000000';
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
      const { data: r1 } = await supabase.from('routines').insert([p1]).select().single();

      if (r1) {
        const exP1 = [
          // Día 1: Torso Empuje
          { routine_id: r1.id, exercise_id: findEx('Press de Banca Plano').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Torso & Empuje', series: 4, repeticiones: '8-10', peso_sugerido: 75, descanso_segundos: 120, orden: 1 },
          { routine_id: r1.id, exercise_id: findEx('Remo con Barra 45').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Torso & Empuje', series: 4, repeticiones: '8-10', peso_sugerido: 70, descanso_segundos: 90, orden: 2 },
          { routine_id: r1.id, exercise_id: findEx('Press Inclinado').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Torso & Empuje', series: 3, repeticiones: '10-12', peso_sugerido: 26, descanso_segundos: 90, orden: 3 },
          { routine_id: r1.id, exercise_id: findEx('Jalón al Pecho').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Torso & Empuje', series: 3, repeticiones: '10-12', peso_sugerido: 65, descanso_segundos: 75, orden: 4 },
          { routine_id: r1.id, exercise_id: findEx('Laterales en Polea').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Torso & Empuje', series: 4, repeticiones: '15', peso_sugerido: 10, descanso_segundos: 60, orden: 5 },
          
          // Día 2: Piernas & Core
          { routine_id: r1.id, exercise_id: findEx('Sentadilla Trasera').id, dia_numero: 2, dia_nombre: 'Día 2 (Martes): Piernas & Core', series: 4, repeticiones: '8', peso_sugerido: 90, descanso_segundos: 150, orden: 1 },
          { routine_id: r1.id, exercise_id: findEx('Prensa 45').id, dia_numero: 2, dia_nombre: 'Día 2 (Martes): Piernas & Core', series: 4, repeticiones: '12-15', peso_sugerido: 160, descanso_segundos: 90, orden: 2 },
          { routine_id: r1.id, exercise_id: findEx('Peso Muerto Rumano').id, dia_numero: 2, dia_nombre: 'Día 2 (Martes): Piernas & Core', series: 3, repeticiones: '10-12', peso_sugerido: 30, descanso_segundos: 90, orden: 3 },
          { routine_id: r1.id, exercise_id: findEx('Plancha Abdominal').id, dia_numero: 2, dia_nombre: 'Día 2 (Martes): Piernas & Core', series: 3, repeticiones: '45 seg', peso_sugerido: null, descanso_segundos: 60, orden: 4 },
          
          // Día 3: Torso Tracción & Brazos
          { routine_id: r1.id, exercise_id: findEx('Dominadas').id, dia_numero: 3, dia_nombre: 'Día 3 (Jueves): Tracción & Brazos', series: 4, repeticiones: '8', peso_sugerido: null, descanso_segundos: 90, orden: 1 },
          { routine_id: r1.id, exercise_id: findEx('Press Militar').id, dia_numero: 3, dia_nombre: 'Día 3 (Jueves): Tracción & Brazos', series: 4, repeticiones: '10', peso_sugerido: 22, descanso_segundos: 90, orden: 2 },
          { routine_id: r1.id, exercise_id: findEx('Cruces en Polea').id, dia_numero: 3, dia_nombre: 'Día 3 (Jueves): Tracción & Brazos', series: 3, repeticiones: '12', peso_sugerido: 15, descanso_segundos: 60, orden: 3 },
          { routine_id: r1.id, exercise_id: findEx('Curl de Bíceps').id, dia_numero: 3, dia_nombre: 'Día 3 (Jueves): Tracción & Brazos', series: 3, repeticiones: '12', peso_sugerido: 30, descanso_segundos: 60, orden: 4 },
          { routine_id: r1.id, exercise_id: findEx('Extensiones de Tríceps').id, dia_numero: 3, dia_nombre: 'Día 3 (Jueves): Tracción & Brazos', series: 3, repeticiones: '12', peso_sugerido: 35, descanso_segundos: 60, orden: 5 },

          // Día 4: Piernas & Glúteos
          { routine_id: r1.id, exercise_id: findEx('Hip Thrust').id, dia_numero: 4, dia_nombre: 'Día 4 (Viernes): Piernas & Glúteos', series: 4, repeticiones: '10', peso_sugerido: 100, descanso_segundos: 120, orden: 1 },
          { routine_id: r1.id, exercise_id: findEx('Prensa 45').id, dia_numero: 4, dia_nombre: 'Día 4 (Viernes): Piernas & Glúteos', series: 3, repeticiones: '15', peso_sugerido: 140, descanso_segundos: 90, orden: 2 },
          { routine_id: r1.id, exercise_id: findEx('Peso Muerto Rumano').id, dia_numero: 4, dia_nombre: 'Día 4 (Viernes): Piernas & Glúteos', series: 3, repeticiones: '12', peso_sugerido: 28, descanso_segundos: 90, orden: 3 },
          { routine_id: r1.id, exercise_id: findEx('Plancha Abdominal').id, dia_numero: 4, dia_nombre: 'Día 4 (Viernes): Piernas & Glúteos', series: 3, repeticiones: '60 seg', peso_sugerido: null, descanso_segundos: 60, orden: 4 }
        ];
        await supabase.from('routine_exercises').insert(exP1);
      }

      // 2. Plantilla 3 Días
      const p2 = {
        client_id: templateClientId,
        nombre: 'Fuerza Funcional Full-Body (3 Días)',
        descripcion: 'Planificación de 3 días para fuerza submáxima y acondicionamiento integral.',
        activa: true,
        dias_por_semana: 3,
        es_plantilla: true
      };
      const { data: r2 } = await supabase.from('routines').insert([p2]).select().single();

      if (r2) {
        const exP2 = [
          // Día 1
          { routine_id: r2.id, exercise_id: findEx('Sentadilla Trasera').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Full-Body A', series: 4, repeticiones: '6', peso_sugerido: 95, descanso_segundos: 150, orden: 1 },
          { routine_id: r2.id, exercise_id: findEx('Press de Banca Plano').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Full-Body A', series: 4, repeticiones: '6', peso_sugerido: 80, descanso_segundos: 120, orden: 2 },
          { routine_id: r2.id, exercise_id: findEx('Remo con Barra 45').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Full-Body A', series: 4, repeticiones: '8', peso_sugerido: 70, descanso_segundos: 90, orden: 3 },
          { routine_id: r2.id, exercise_id: findEx('Plancha Abdominal').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Full-Body A', series: 3, repeticiones: '45 seg', peso_sugerido: null, descanso_segundos: 60, orden: 4 },

          // Día 2
          { routine_id: r2.id, exercise_id: findEx('Peso Muerto Rumano').id, dia_numero: 2, dia_nombre: 'Día 2 (Miércoles): Full-Body B', series: 4, repeticiones: '8', peso_sugerido: 34, descanso_segundos: 120, orden: 1 },
          { routine_id: r2.id, exercise_id: findEx('Press Militar').id, dia_numero: 2, dia_nombre: 'Día 2 (Miércoles): Full-Body B', series: 4, repeticiones: '8', peso_sugerido: 24, descanso_segundos: 90, orden: 2 },
          { routine_id: r2.id, exercise_id: findEx('Dominadas').id, dia_numero: 2, dia_nombre: 'Día 2 (Miércoles): Full-Body B', series: 4, repeticiones: '8', peso_sugerido: null, descanso_segundos: 90, orden: 3 },
          { routine_id: r2.id, exercise_id: findEx('Curl de Bíceps').id, dia_numero: 2, dia_nombre: 'Día 2 (Miércoles): Full-Body B', series: 3, repeticiones: '10', peso_sugerido: 32, descanso_segundos: 60, orden: 4 },

          // Día 3
          { routine_id: r2.id, exercise_id: findEx('Hip Thrust').id, dia_numero: 3, dia_nombre: 'Día 3 (Viernes): Full-Body C', series: 4, repeticiones: '8', peso_sugerido: 110, descanso_segundos: 120, orden: 1 },
          { routine_id: r2.id, exercise_id: findEx('Press Inclinado').id, dia_numero: 3, dia_nombre: 'Día 3 (Viernes): Full-Body C', series: 4, repeticiones: '10', peso_sugerido: 28, descanso_segundos: 90, orden: 2 },
          { routine_id: r2.id, exercise_id: findEx('Jalón al Pecho').id, dia_numero: 3, dia_nombre: 'Día 3 (Viernes): Full-Body C', series: 4, repeticiones: '10', peso_sugerido: 70, descanso_segundos: 75, orden: 3 },
          { routine_id: r2.id, exercise_id: findEx('Extensiones de Tríceps').id, dia_numero: 3, dia_nombre: 'Día 3 (Viernes): Full-Body C', series: 3, repeticiones: '12', peso_sugerido: 35, descanso_segundos: 60, orden: 4 }
        ];
        await supabase.from('routine_exercises').insert(exP2);
      }

      // 3. Plantilla 5 Días
      const p3 = {
        client_id: templateClientId,
        nombre: 'Definición & Tonificación (5 Días)',
        descripcion: 'Estructura dividida de alto volumen y densidad para máxima definición.',
        activa: true,
        dias_por_semana: 5,
        es_plantilla: true
      };
      const { data: r3 } = await supabase.from('routines').insert([p3]).select().single();

      if (r3) {
        const exP3 = [
          // Día 1
          { routine_id: r3.id, exercise_id: findEx('Press de Banca Plano').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Pecho & Core', series: 4, repeticiones: '10-12', peso_sugerido: 70, descanso_segundos: 90, orden: 1 },
          { routine_id: r3.id, exercise_id: findEx('Press Inclinado').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Pecho & Core', series: 3, repeticiones: '12', peso_sugerido: 24, descanso_segundos: 75, orden: 2 },
          { routine_id: r3.id, exercise_id: findEx('Cruces en Polea').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Pecho & Core', series: 3, repeticiones: '15', peso_sugerido: 12, descanso_segundos: 60, orden: 3 },
          { routine_id: r3.id, exercise_id: findEx('Plancha Abdominal').id, dia_numero: 1, dia_nombre: 'Día 1 (Lunes): Pecho & Core', series: 3, repeticiones: '60 seg', peso_sugerido: null, descanso_segundos: 60, orden: 4 },

          // Día 2
          { routine_id: r3.id, exercise_id: findEx('Dominadas').id, dia_numero: 2, dia_nombre: 'Día 2 (Martes): Espalda & Tracción', series: 4, repeticiones: '8-10', peso_sugerido: null, descanso_segundos: 90, orden: 1 },
          { routine_id: r3.id, exercise_id: findEx('Remo con Barra 45').id, dia_numero: 2, dia_nombre: 'Día 2 (Martes): Espalda & Tracción', series: 4, repeticiones: '10', peso_sugerido: 65, descanso_segundos: 75, orden: 2 },
          { routine_id: r3.id, exercise_id: findEx('Jalón al Pecho').id, dia_numero: 2, dia_nombre: 'Día 2 (Martes): Espalda & Tracción', series: 3, repeticiones: '12', peso_sugerido: 60, descanso_segundos: 60, orden: 3 },

          // Día 3
          { routine_id: r3.id, exercise_id: findEx('Sentadilla Trasera').id, dia_numero: 3, dia_nombre: 'Día 3 (Miércoles): Piernas Enfoque Anterior', series: 4, repeticiones: '8-10', peso_sugerido: 85, descanso_segundos: 120, orden: 1 },
          { routine_id: r3.id, exercise_id: findEx('Prensa 45').id, dia_numero: 3, dia_nombre: 'Día 3 (Miércoles): Piernas Enfoque Anterior', series: 4, repeticiones: '15', peso_sugerido: 150, descanso_segundos: 90, orden: 2 },

          // Día 4
          { routine_id: r3.id, exercise_id: findEx('Press Militar').id, dia_numero: 4, dia_nombre: 'Día 4 (Jueves): Hombros & Brazos', series: 4, repeticiones: '10', peso_sugerido: 22, descanso_segundos: 90, orden: 1 },
          { routine_id: r3.id, exercise_id: findEx('Laterales en Polea').id, dia_numero: 4, dia_nombre: 'Día 4 (Jueves): Hombros & Brazos', series: 4, repeticiones: '15', peso_sugerido: 10, descanso_segundos: 60, orden: 2 },
          { routine_id: r3.id, exercise_id: findEx('Curl de Bíceps').id, dia_numero: 4, dia_nombre: 'Día 4 (Jueves): Hombros & Brazos', series: 3, repeticiones: '12', peso_sugerido: 30, descanso_segundos: 60, orden: 3 },
          { routine_id: r3.id, exercise_id: findEx('Extensiones de Tríceps').id, dia_numero: 4, dia_nombre: 'Día 4 (Jueves): Hombros & Brazos', series: 3, repeticiones: '12', peso_sugerido: 35, descanso_segundos: 60, orden: 4 },

          // Día 5
          { routine_id: r3.id, exercise_id: findEx('Hip Thrust').id, dia_numero: 5, dia_nombre: 'Día 5 (Viernes): Glúteos & Isquios', series: 4, repeticiones: '10', peso_sugerido: 105, descanso_segundos: 120, orden: 1 },
          { routine_id: r3.id, exercise_id: findEx('Peso Muerto Rumano').id, dia_numero: 5, dia_nombre: 'Día 5 (Viernes): Glúteos & Isquios', series: 4, repeticiones: '12', peso_sugerido: 32, descanso_segundos: 90, orden: 2 },
          { routine_id: r3.id, exercise_id: findEx('Plancha Abdominal').id, dia_numero: 5, dia_nombre: 'Día 5 (Viernes): Glúteos & Isquios', series: 3, repeticiones: '45 seg', peso_sugerido: null, descanso_segundos: 60, orden: 3 }
        ];
        await supabase.from('routine_exercises').insert(exP3);
      }

      // Devolver rutinas sembradas
      const { data: finalRoutines } = await supabase
        .from('routines')
        .select(`
          *,
          client:clients(*),
          routine_exercises (
            *,
            exercise:exercises(*)
          )
        `)
        .order('creado_el', { ascending: false });

      return finalRoutines || [];
    } catch (err) {
      console.warn('[DataService] Error en seedInitialRoutines:', err);
      return [];
    }
  },

  async saveRoutine(routineData, daysList, existingId = null) {
    try {
      const isTemplate = Boolean(
        routineData.es_plantilla || 
        routineData.is_template || 
        !routineData.client_id || 
        routineData.client_id === '00000000-0000-0000-0000-000000000000'
      );

      const targetClientId = isTemplate 
        ? '00000000-0000-0000-0000-000000000000' 
        : routineData.client_id;

      const daysCount = daysList && daysList.length > 0 ? daysList.length : 3;

      let routineId = existingId;

      if (existingId) {
        // ACTUALIZAR RUTINA EXISTENTE
        const updatePayload = {
          client_id: targetClientId,
          nombre: (routineData.nombre || 'Rutina Personalizada').trim(),
          descripcion: (routineData.descripcion || routineData.objetivo || '').trim(),
          activa: routineData.activa ?? true,
          dias_por_semana: daysCount,
          es_plantilla: isTemplate
        };

        const { error: uErr } = await supabase
          .from('routines')
          .update(updatePayload)
          .eq('id', existingId);

        if (uErr) throw uErr;

        // Borrar ejercicios anteriores para reemplazarlos con la nueva configuración
        await supabase
          .from('routine_exercises')
          .delete()
          .eq('routine_id', existingId);

      } else {
        // CREAR NUEVA RUTINA
        if (!isTemplate && targetClientId) {
          // Desactivar rutinas previas del alumno si se le asigna una nueva
          await supabase
            .from('routines')
            .update({ activa: false })
            .eq('client_id', targetClientId);
        }

        const insertPayload = {
          client_id: targetClientId,
          nombre: (routineData.nombre || 'Rutina Personalizada').trim(),
          descripcion: (routineData.descripcion || routineData.objetivo || '').trim(),
          activa: true,
          dias_por_semana: daysCount,
          es_plantilla: isTemplate
        };

        const { data: inserted, error: iErr } = await supabase
          .from('routines')
          .insert([insertPayload])
          .select()
          .single();

        if (iErr) throw iErr;
        routineId = inserted.id;
      }

      // Insertar ejercicios de todos los días
      const exercisesToInsert = [];
      (daysList || []).forEach((d, dayIndex) => {
        const dayNum = dayIndex + 1;
        const dayTitle = d.dia || d.dia_nombre || `Día ${dayNum}`;
        (d.ejercicios || []).forEach((item, exIndex) => {
          exercisesToInsert.push({
            routine_id: routineId,
            exercise_id: item.exercise?.id || item.exercise_id,
            dia_numero: dayNum,
            dia_nombre: dayTitle,
            series: parseInt(item.series, 10) || 4,
            repeticiones: String(item.repeticiones || item.reps || '10-12'),
            peso_sugerido: parseWeight(item.peso_sugerido || item.peso),
            descanso_segundos: parseInt(item.descanso_seg || item.descanso_segundos || item.descanso || 90, 10),
            orden: exIndex + 1
          });
        });
      });

      if (exercisesToInsert.length > 0) {
        const { error: insExErr } = await supabase
          .from('routine_exercises')
          .insert(exercisesToInsert);
        if (insExErr) {
          console.error("[DataService] Error insertando routine_exercises:", insExErr);
          throw insExErr;
        }
      }

      // Consultar y retornar la rutina guardada completa con sus ejercicios
      const { data: completeRoutine, error: fetchErr } = await supabase
        .from('routines')
        .select(`
          *,
          client:clients(*),
          routine_exercises (
            *,
            exercise:exercises(*)
          )
        `)
        .eq('id', routineId)
        .single();

      if (!fetchErr && completeRoutine) {
        return formatRoutineWithDays(completeRoutine);
      }

      return { id: routineId, ...routineData, dias: daysList };
    } catch (err) {
      console.error("[DataService] Error en saveRoutine:", err);
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
          ejercicios: exercisesList || []
        }];

    return this.saveRoutine(routineData, daysList, null);
  },

  async assignRoutineToClient(routineId, clientId) {
    try {
      const { data: sourceRoutine, error: fetchErr } = await supabase
        .from('routines')
        .select(`
          *,
          routine_exercises (
            *
          )
        `)
        .eq('id', routineId)
        .single();

      if (fetchErr || !sourceRoutine) {
        throw new Error("No se encontró la rutina de origen");
      }

      const client = await this.getClientById(clientId);
      const clientName = client?.nombre_completo || 'Alumno';

      // Desactivar rutinas previas del alumno
      await supabase
        .from('routines')
        .update({ activa: false })
        .eq('client_id', clientId);

      // Crear copia personalizada para el alumno
      const newRoutinePayload = {
        client_id: clientId,
        nombre: sourceRoutine.es_plantilla 
          ? `${sourceRoutine.nombre.replace(/ \(Plantilla\)/i, '')} - ${clientName}`
          : `${sourceRoutine.nombre} (Copia)`,
        descripcion: sourceRoutine.descripcion || `Rutina personalizada para ${clientName}`,
        activa: true,
        dias_por_semana: sourceRoutine.dias_por_semana || 3,
        es_plantilla: false
      };

      const { data: createdRoutine, error: rErr } = await supabase
        .from('routines')
        .insert([newRoutinePayload])
        .select()
        .single();

      if (rErr || !createdRoutine) {
        throw rErr;
      }

      // Clonar ejercicios
      const exercisesToInsert = (sourceRoutine.routine_exercises || []).map(re => ({
        routine_id: createdRoutine.id,
        exercise_id: re.exercise_id,
        dia_numero: re.dia_numero || 1,
        dia_nombre: re.dia_nombre || `Día ${re.dia_numero || 1}`,
        series: re.series || 4,
        repeticiones: re.repeticiones || '10-12',
        peso_sugerido: re.peso_sugerido,
        descanso_segundos: re.descanso_segundos || 90,
        orden: re.orden || 1
      }));

      if (exercisesToInsert.length > 0) {
        await supabase.from('routine_exercises').insert(exercisesToInsert);
      }

      const { data: completeRoutine } = await supabase
        .from('routines')
        .select(`
          *,
          client:clients(*),
          routine_exercises (
            *,
            exercise:exercises(*)
          )
        `)
        .eq('id', createdRoutine.id)
        .single();

      return formatRoutineWithDays(completeRoutine || createdRoutine);
    } catch (err) {
      console.error("[DataService] Error asignando rutina al alumno:", err);
      throw err;
    }
  },

  async deleteRoutine(routineId) {
    try {
      await supabase
        .from('routine_exercises')
        .delete()
        .eq('routine_id', routineId);

      const { error: rErr } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId);

      if (rErr) throw rErr;

      return { success: true, id: routineId };
    } catch (err) {
      console.error("[DataService] Error eliminando rutina en Supabase:", err);
      throw err;
    }
  },

  async getRoutineForClient(clientId) {
    if (!clientId) return null;
    try {
      const { data, error } = await supabase
        .from('routines')
        .select(`
          *,
          client:clients(*),
          routine_exercises (
            *,
            exercise:exercises(*)
          )
        `)
        .eq('client_id', clientId)
        .eq('activa', true)
        .order('creado_el', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return formatRoutineWithDays(data);
      }
    } catch (err) {
      console.warn('[DataService] Error consultando rutina para cliente en Supabase:', err);
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
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[DataService] Error desasignando rutina de cliente:', err);
      return false;
    }
  },

  // ==========================================================
  // 6. AGENDA Y TURNOS
  // ==========================================================
  async getAppointments() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('fecha_hora_inicio', { ascending: true });

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      console.warn('[DataService] Error en getAppointments Supabase:', err);
    }
    return INITIAL_APPOINTMENTS;
  },

  async addAppointment(aptData) {
    const payload = {
      client_id: aptData.client_id,
      fecha_hora_inicio: aptData.fecha_hora_inicio,
      fecha_hora_fin: aptData.fecha_hora_fin,
      tipo: aptData.tipo || 'Presencial',
      estado: aptData.estado || 'Confirmado',
      notas: aptData.notas || ''
    };

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([payload])
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('[DataService] Error insertando appointment en Supabase:', err);
    }

    return {
      id: `apt-${Date.now()}`,
      ...payload,
      client_name: aptData.client_name || 'Alumno'
    };
  }
};

export default dataService;
