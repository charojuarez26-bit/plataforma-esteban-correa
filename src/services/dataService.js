import { supabase } from '../lib/supabase';
import {
  INITIAL_EXERCISES,
  INITIAL_EVALUATIONS,
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
        .select('*')
        .order('creado_el', { ascending: false });

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

      // 2. VALIDAR client_id SI SE ASIGNA A UN ALUMNO
      const isTemplate = Boolean(
        routineData.es_plantilla || 
        routineData.destinatarioTipo === 'plantilla' ||
        !routineData.client_id || 
        routineData.client_id === '00000000-0000-0000-0000-000000000000'
      );

      let targetClientId = '00000000-0000-0000-0000-000000000000';
      if (!isTemplate) {
        if (!routineData.client_id || typeof routineData.client_id !== 'string' || routineData.client_id.trim() === '') {
          const clientError = new Error('Debes seleccionar un alumno válido para asignar la rutina.');
          console.error('Error detallado de Supabase:', clientError);
          throw clientError;
        }
        targetClientId = routineData.client_id.trim();
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

      // 4. PREPARAR PAYLOADS PARA SUPABASE
      // basePayload funciona con las columnas existentes en routines
      const basePayload = {
        client_id: targetClientId,
        nombre: (routineData.nombre || 'Rutina Personalizada').trim(),
        descripcion: (routineData.descripcion || routineData.objetivo || '').trim(),
        activa: routineData.activa ?? true,
        dias_por_semana: daysCount,
        es_plantilla: isTemplate,
        dia_semana: JSON.stringify(cleanedDays) // Respaldo JSON seguro en columna de texto
      };

      // fullPayload incluye coach_id y dias (jsonb) si las columnas están disponibles en Supabase
      const fullPayload = {
        ...basePayload,
        coach_id: activeCoachId,
        dias: cleanedDays
      };

      let routineId = existingId;
      let savedRecord = null;

      if (existingId) {
        // ACTUALIZACIÓN DE RUTINA EXISTENTE
        let { data: updated, error: uErr } = await supabase
          .from('routines')
          .update(fullPayload)
          .eq('id', existingId)
          .select('*')
          .single();

        // Si falla por columna inexistente en el schema cache (PGRST204), reintentar con basePayload
        if (uErr && (uErr.code === 'PGRST204' || uErr.message?.includes('schema cache') || uErr.message?.includes('coach_id') || uErr.message?.includes('dias'))) {
          console.warn('[DataService] Columnas coach_id/dias ausentes en routines, reintentando con basePayload...');
          const { data: retryUpdated, error: retryErr } = await supabase
            .from('routines')
            .update(basePayload)
            .eq('id', existingId)
            .select('*')
            .single();

          if (retryErr) {
            console.error('Error detallado de Supabase:', retryErr);
            throw retryErr;
          }
          savedRecord = retryUpdated;
        } else if (uErr) {
          console.error('Error detallado de Supabase:', uErr);
          throw uErr;
        } else {
          savedRecord = updated;
        }
      } else {
        // CREACIÓN DE NUEVA RUTINA
        // Si es para un alumno, desactivar rutinas anteriores de ese alumno
        if (!isTemplate && targetClientId && targetClientId !== '00000000-0000-0000-0000-000000000000') {
          try {
            await supabase
              .from('routines')
              .update({ activa: false })
              .eq('client_id', targetClientId);
          } catch (deactErr) {
            console.warn('[DataService] Error desactivando rutinas previas del alumno:', deactErr);
          }
        }

        let { data: inserted, error: iErr } = await supabase
          .from('routines')
          .insert([fullPayload])
          .select('*')
          .single();

        // Si falla por columna inexistente en schema, reintentar con basePayload
        if (iErr && (iErr.code === 'PGRST204' || iErr.message?.includes('schema cache') || iErr.message?.includes('coach_id') || iErr.message?.includes('dias'))) {
          console.warn('[DataService] Columnas coach_id/dias ausentes en routines, reintentando con basePayload...');
          const { data: retryInserted, error: retryErr } = await supabase
            .from('routines')
            .insert([basePayload])
            .select('*')
            .single();

          if (retryErr) {
            console.error('Error detallado de Supabase:', retryErr);
            throw retryErr;
          }
          savedRecord = retryInserted;
          routineId = retryInserted.id;
        } else if (iErr) {
          console.error('Error detallado de Supabase:', iErr);
          throw iErr;
        } else {
          savedRecord = inserted;
          routineId = inserted.id;
        }
      }

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

      const payload = {
        nombre: sourceRoutine.es_plantilla 
          ? `${sourceRoutine.nombre.replace(/ \(Plantilla\)/i, '')} - ${clientName}`
          : `${sourceRoutine.nombre} (Asignada)`,
        descripcion: sourceRoutine.descripcion || `Rutina personalizada para ${clientName}`,
        client_id: clientId,
        es_plantilla: false,
        activa: true,
        dias_por_semana: sourceRoutine.dias_por_semana || (sourceRoutine.dias?.length || 3)
      };

      return await this.saveRoutine(payload, sourceRoutine.dias || [], null);
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
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('client_id', clientId)
        .eq('activa', true)
        .order('creado_el', { ascending: false })
        .limit(1)
        .maybeSingle();

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
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(id, nombre_completo, foto_url, access_code, telefono, modalidad, estado)
        `)
        .order('fecha_hora_inicio', { ascending: true });

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
