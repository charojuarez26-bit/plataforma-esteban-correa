import { supabase, withAuthRetry, isAuthError } from '../lib/supabase';

const SESSION_KEY = 'ec_trainer_auth_session';

/**
 * Construye el perfil del entrenador. Parte de los datos de Supabase Auth
 * (nombre, email, metadatos) y los enriquece con la tabla `coaches` de manera proactiva.
 */
export async function resolveCoachProfile(authUser) {
  let user = authUser;
  if (!user) {
    try {
      const { data, error } = await withAuthRetry(() => supabase.auth.getUser());
      if (error) {
        console.warn('[Auth] Error obteniendo usuario:', error.message);
        return null;
      }
      user = data?.user;
    } catch {
      user = null;
    }
  }
  if (!user) return null;

  const meta = user.user_metadata || {};
  let profile = {
    id: user.id,
    nombre: meta.nombre || meta.full_name || meta.name || user.email?.split('@')[0] || 'Esteban Correa',
    email: user.email,
    avatar_url: meta.avatar_url || null,
    ...(meta.telefono ? { telefono: meta.telefono } : {}),
    ...(meta.slogan ? { slogan: meta.slogan } : {}),
    ...(meta.biografia ? { biografia: meta.biografia } : {}),
    ...(Array.isArray(meta.estudios) ? { estudios: meta.estudios } : {})
  };

  // Foto guardada solo localmente (cuando Storage no está disponible)
  if (!profile.avatar_url) {
    try {
      const local = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (local?.user?.avatar_url?.startsWith('data:') && local.user.id === profile.id) {
        profile.avatar_url = local.user.avatar_url;
      }
    } catch { /* ignorar */ }
  }

  // Consulta a la tabla coaches con reintento automático si el JWT expiró
  try {
    const { data, error } = await withAuthRetry(() =>
      supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
    );

    if (error) {
      console.warn('[Auth] Error consultando tabla coaches:', error.message);
    } else if (data) {
      profile = {
        ...profile,
        ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined)),
        ...(data.bio ? { biografia: data.bio } : {}),
        ...(!data.avatar_url && profile.avatar_url ? { avatar_url: profile.avatar_url } : {})
      };
    }
  } catch (e) {
    console.warn('[Auth] Excepción consultando tabla coaches:', e?.message);
  }

  return profile;
}

export const authService = {
  // Obtener sesión activa de localStorage
  getCurrentSession() {
    try {
      // 1. Prioridad: Sesión de alumno persistida
      const alumnoRaw = localStorage.getItem('alumno_session');
      if (alumnoRaw) {
        const cliente = JSON.parse(alumnoRaw);
        return {
          role: 'student',
          user: cliente,
          token: `student-session-${cliente.id}`
        };
      }

      // 2. Sesión de entrenador
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  // Guardar sesión activa en LocalStorage
  saveSession(sessionData) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  },

  // Cerrar sesión
  async logout() {
    try {
      if (supabase && supabase.auth) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[Auth] Error al cerrar sesión en Supabase:', err);
    }
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('alumno_session');
    localStorage.removeItem('active_student_id');
    return { success: true };
  },

  getActiveStudentId() {
    return typeof window !== 'undefined' ? localStorage.getItem('active_student_id') : null;
  },

  setActiveStudentId(studentId) {
    if (typeof window !== 'undefined') {
      if (studentId) {
        localStorage.setItem('active_student_id', String(studentId));
      } else {
        localStorage.removeItem('active_student_id');
      }
    }
  },

  // 1. AUTENTICACIÓN FORMAL DEL ENTRENADOR CON SUPABASE AUTH
  async loginEntrenador({ email, password }) {
    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '');

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Correo o contraseña incorrectos');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });

    if (error || !data?.user) {
      console.warn('[Supabase Auth] Fallo al autenticar:', error?.message);
      throw new Error('Correo o contraseña incorrectos');
    }

    const coachProfile = await resolveCoachProfile(data.user);

    const session = {
      role: 'coach',
      user: coachProfile,
      token: data.session?.access_token || 'supabase-auth-token'
    };

    this.saveSession(session);
    return session;
  },

  async loginCoach(email, password) {
    return this.loginEntrenador({ email, password });
  },

  // 2. ACCESO EXCLUSIVO DEL ALUMNO (PASSWORDLESS REAL - FLUJO DUAL)
  async loginAlumno({ nombre, codigo }) {
    const cleanName = (nombre || '').trim();
    const cleanCode = (codigo || '').trim();

    if (!cleanName) {
      throw new Error('Por favor ingresa tu nombre y apellido.');
    }
    if (!cleanCode) {
      throw new Error('Por favor ingresa tu código o identificador asignado.');
    }

    let client = null;

    try {
      // 1. Consulta directa con .eq('access_code', cleanCode) e .ilike sobre nombre_completo
      let { data: matches, error } = await supabase
        .from('clients')
        .select('*')
        .eq('access_code', cleanCode)
        .ilike('nombre_completo', `%${cleanName}%`);

      if (error && (error.message?.includes('nombre_completo') || error.code === '42703')) {
        const retry = await supabase
          .from('clients')
          .select('*')
          .eq('access_code', cleanCode)
          .ilike('nombre', `%${cleanName}%`);
        matches = retry.data;
        error = retry.error;
      }

      if (!error && matches && matches.length > 0) {
        client = matches[0];
      }
    } catch (e) {
      console.warn('[authService] Error buscando en clients por nombre y código:', e?.message);
    }

    // 2. Si no se encontró por ilike (ej. acentos o tildes), buscar por access_code directo y comparar nombre con normalización
    if (!client) {
      try {
        const { data: codeMatches } = await supabase
          .from('clients')
          .select('*')
          .eq('access_code', cleanCode);

        if (codeMatches && codeMatches.length > 0) {
          const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const searchNorm = normalize(cleanName);
          const firstWord = searchNorm.split(' ')[0];
          const matched = codeMatches.find(c => {
            const dbNorm = normalize(c.nombre_completo || c.nombre || '');
            return dbNorm.includes(searchNorm) || searchNorm.includes(dbNorm) || dbNorm.includes(firstWord) || searchNorm.includes(dbNorm.split(' ')[0]);
          });
          if (matched) client = matched;
        }
      } catch { /* fallback */ }
    }

    if (!client) {
      throw new Error('No se encontró un alumno con ese nombre y código asignado. Consulta con tu entrenador Esteban Correa.');
    }

    if ((client.estado || '').toLowerCase() === 'inactivo') {
      throw new Error('Tu cuenta se encuentra pausada o inactiva. Comunícate con Esteban Correa.');
    }

    // Persistir el ID activo del alumno en el dispositivo
    localStorage.setItem('active_student_id', client.id);
    localStorage.setItem('alumno_session', JSON.stringify(client));

    const status = await checkStudentOnboardingStatus(client.id, client);

    const session = {
      role: 'student',
      user: client,
      token: `student-session-${client.id}`,
      onboardingVerified: !status.needsOnboarding,
      loggedAt: new Date().toISOString()
    };

    this.saveSession(session);
    return { session, client, isComplete: !status.needsOnboarding, role: 'student', user: client };
  },

  // VERIFICACIÓN DEL CÓDIGO DE 4 DÍGITOS DEL ENTRENADOR (Opción "Es mi primera vez")
  async verifyCoachInvitationCode(code) {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      throw new Error('Por favor introduce el código de 4 dígitos de tu entrenador.');
    }

    // 1. Consultar en la tabla coaches por codigo_acceso
    try {
      const { data: coachData, error } = await supabase
        .from('coaches')
        .select('id, nombre, codigo_acceso')
        .eq('codigo_acceso', cleanCode)
        .maybeSingle();

      if (!error && coachData?.id) {
        return {
          valid: true,
          coachId: coachData.id,
          coachName: coachData.nombre || 'Esteban Correa',
          code: cleanCode
        };
      }
    } catch (e) {
      console.warn('[authService] Error consultando coaches:', e?.message);
    }

    // 2. Verificar en localStorage (si el coach guardó un código en Configuración)
    const storedCoachCode = typeof window !== 'undefined' ? localStorage.getItem('coach_access_code') : null;
    if (storedCoachCode && storedCoachCode === cleanCode) {
      return {
        valid: true,
        coachId: '7e2d4c88-8e3e-4ef6-bcbb-7fc46e582d86',
        coachName: 'Esteban Correa',
        code: cleanCode
      };
    }

    // 3. Códigos predeterminados de fallback
    if (cleanCode === '7429' || cleanCode === '2025' || cleanCode === '0000') {
      return {
        valid: true,
        coachId: '7e2d4c88-8e3e-4ef6-bcbb-7fc46e582d86',
        coachName: 'Esteban Correa',
        code: cleanCode
      };
    }

    throw new Error('Código de 4 dígitos incorrecto. Solicítaselo a tu entrenador Esteban Correa.');
  },

  async loginStudent(param1, param2) {
    if (typeof param1 === 'object' && param1 !== null) {
      return this.loginAlumno({
        nombre: param1.nombre || param1.nombreCompleto || param1.studentName,
        codigo: param1.codigo || param1.accessCode || param1.studentCode
      });
    }
    return this.loginAlumno({ nombre: param1, codigo: param2 });
  },

  checkStudentOnboardingStatus(studentId, studentData) {
    return checkStudentOnboardingStatus(studentId, studentData);
  },

  // ACCESO Y LOGIN EXCLUSIVO POR CÓDIGO DE 4 DÍGITOS
  async loginStudentBy4DigitCode(code) {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      throw new Error('Por favor ingresa un código de 4 dígitos.');
    }

    // 1. Verificar si coincide con un alumno existente (ej. '9505' o 'EC-9505')
    const { data: existingClient } = await supabase
      .from('clients')
      .select('*')
      .or(`access_code.eq.${cleanCode},access_code.ilike.%-${cleanCode},access_code.ilike.%${cleanCode}`)
      .maybeSingle();

    if (existingClient) {
      const status = await checkStudentOnboardingStatus(existingClient.id, existingClient);
      if (!status.needsOnboarding) {
        localStorage.setItem('active_student_id', existingClient.id);
        localStorage.setItem('alumno_session', JSON.stringify(existingClient));
        const session = {
          role: 'student',
          user: existingClient,
          token: `student-session-${existingClient.id}`,
          loggedAt: new Date().toISOString()
        };
        this.saveSession(session);
        return { isComplete: true, session, client: existingClient };
      }
      return { isComplete: false, client: existingClient, coachId: existingClient.coach_id || '7e2d4c88-8e3e-4ef6-bcbb-7fc46e582d86' };
    }

    // 2. Consultar en la tabla coaches por codigo_acceso
    let coachId = '7e2d4c88-8e3e-4ef6-bcbb-7fc46e582d86';
    let coachName = 'Esteban Correa';

    // Chequeo en localStorage si coincide con el código guardado del entrenador
    const localCode = typeof window !== 'undefined' ? localStorage.getItem('coach_access_code') : null;
    if (localCode && localCode === cleanCode) {
      return { isComplete: false, isNew: true, coachId, coachName, code: cleanCode };
    }

    try {
      const { data: coachData, error } = await supabase
        .from('coaches')
        .select('id, nombre, codigo_acceso')
        .eq('codigo_acceso', cleanCode)
        .maybeSingle();

      if (!error && coachData?.id) {
        coachId = coachData.id;
        coachName = coachData.nombre || coachName;
        return { isComplete: false, isNew: true, coachId, coachName, code: cleanCode };
      }
    } catch {
      // Graceful fallback si la columna no existe en coaches
    }

    // 3. Asignación al coach principal por defecto
    return { isComplete: false, isNew: true, coachId, coachName, code: cleanCode };
  }
};

/**
 * Verifica si el alumno necesita completar su flujo de Onboarding obligatorio.
 * Comprueba datos en tabla clients y ficha en medical_records.
 */
export async function checkStudentOnboardingStatus(studentId, studentData = null) {
  if (!studentId) return { needsOnboarding: true, client: null, medicalRecord: null };

  try {
    let client = studentData;
    if (!client || !client.telefono || !client.objetivo) {
      const { data: dbClient } = await supabase
        .from('clients')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();
      if (dbClient) client = dbClient;
    }

    if (!client) {
      return { needsOnboarding: true, client: null, medicalRecord: null };
    }

    // 1. Datos personales obligatorios
    const hasPersonalData = Boolean(
      client.nombre_completo &&
      client.nombre_completo.trim().length >= 3 &&
      client.telefono &&
      client.telefono.trim().length >= 6 &&
      client.objetivo &&
      client.objetivo.trim().length >= 3
    );

    if (!hasPersonalData) {
      return { needsOnboarding: true, client, medicalRecord: null };
    }

    // Si ya completó el onboarding explícitamente
    if (client.onboarding_completado === true) {
      return { needsOnboarding: false, client, medicalRecord: null };
    }

    // Verificar si en metadatos locales ya quedó completado
    try {
      const meta = JSON.parse(localStorage.getItem(`ec_client_meta_${studentId}`) || '{}');
      if (meta.onboarding_completado) {
        return { needsOnboarding: false, client, medicalRecord: null };
      }
    } catch { /* ignore */ }

    // 2. Ficha médica en medical_records
    const { data: medicalRecord, error: medError } = await supabase
      .from('medical_records')
      .select('id, completada, declaracion_jurada')
      .eq('client_id', studentId)
      .maybeSingle();

    if (medError) {
      console.warn('[authService] Error consultando medical_records:', medError.message);
    }

    const hasMedicalRecord = Boolean(
      medicalRecord && (medicalRecord.completada === true || medicalRecord.declaracion_jurada === true)
    );

    return {
      needsOnboarding: !hasMedicalRecord,
      client,
      medicalRecord
    };
  } catch (err) {
    console.warn('[authService] Excepción al verificar estado de onboarding:', err);
    return { needsOnboarding: false, client: studentData, medicalRecord: null };
  }
}

export default authService;

/**
 * Reduce una imagen a un JPEG cuadrado (máx. `max` px) para subirla o guardarla liviana.
 */
export function resizeImageToBlob(file, max = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const out = Math.min(max, side);
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      canvas.getContext('2d').drawImage(
        img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out
      );
      URL.revokeObjectURL(url);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Archivo de imagen inválido')); };
    img.src = url;
  });
}

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

/**
 * Sube la foto de perfil al bucket público `avatars` de Supabase Storage.
 * Si el bucket no existe o falla, devuelve la imagen como data URL (guardada localmente).
 */
export async function uploadCoachAvatar(file, userId) {
  const blob = await resizeImageToBlob(file);
  try {
    const path = `${userId}/avatar.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      upsert: true, contentType: 'image/jpeg', cacheControl: '3600'
    });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: `${data.publicUrl}?v=${Date.now()}`, remote: true };
  } catch (e) {
    console.info('[Perfil] Storage no disponible, la foto se guarda localmente:', e?.message);
    return { url: await blobToDataUrl(blob), remote: false };
  }
}

/**
 * Guarda el perfil del entrenador: sesión local (siempre), metadatos de Auth y tabla `coaches`
 * (estos dos últimos en modo "mejor esfuerzo"). Devuelve el perfil actualizado y avisos.
 */
export async function saveCoachProfile(current, form) {
  const warnings = [];
  const updated = { ...current, ...form };

  // Metadatos de Auth (sin la foto en base64: viajaría dentro del JWT)
  const meta = {
    nombre: form.nombre, telefono: form.telefono, slogan: form.slogan,
    biografia: form.biografia, estudios: form.estudios
  };
  if (form.avatar_url && !form.avatar_url.startsWith('data:')) meta.avatar_url = form.avatar_url;

  try {
    const authPayload = { data: meta };
    if (form.email && form.email !== current.email) authPayload.email = form.email;
    const { error } = await supabase.auth.updateUser(authPayload);
    if (error) warnings.push(error.message);
  } catch (e) { warnings.push(e?.message); }

  try {
    const { data: auth } = await withAuthRetry(() => supabase.auth.getUser());
    const uid = auth?.user?.id;
    if (uid) {
      const row = {
        nombre: form.nombre, email: form.email, telefono: form.telefono,
        avatar_url: form.avatar_url?.startsWith('data:') ? null : form.avatar_url,
        bio: form.biografia, slogan: form.slogan, estudios: form.estudios
      };
      // Quitar valores undefined/null para no sobrescribir datos existentes con vacíos
      Object.keys(row).forEach(k => (row[k] === undefined || row[k] === null) && delete row[k]);

      // 1. Resolver el ID real del coach: por user_id o id = uid; si no, el primer registro
      let coachId = null;
      const { data: byUid } = await withAuthRetry(() =>
        supabase.from('coaches').select('id').or(`user_id.eq.${uid},id.eq.${uid}`).limit(1).maybeSingle()
      );
      coachId = byUid?.id || null;
      if (!coachId) {
        const { data: first } = await withAuthRetry(() =>
          supabase.from('coaches').select('id').limit(1).maybeSingle()
        );
        coachId = first?.id || null;
      }

      // 2. UPDATE si existe; si no hay ningún coach, INSERT con id explícito (nunca nulo)
      const newId = uid || (globalThis.crypto?.randomUUID?.());
      const persist = (payload) => coachId
        ? withAuthRetry(() => supabase.from('coaches').update(payload).eq('id', coachId))
        : withAuthRetry(() => supabase.from('coaches').insert({ id: newId, user_id: uid, ...payload }));

      // Guardado seguro: si una columna no existe (PGRST204 = schema cache, 42703 = columna
      // inexistente en Postgres), se elimina del payload y se reintenta sin romper la interfaz.
      let payload = { ...row };
      const skipped = [];
      let { error } = await persist(payload);
      for (let attempt = 0; error && attempt < Object.keys(row).length; attempt++) {
        const isMissingColumn = error.code === 'PGRST204' || error.code === '42703';
        const match = (error.message || '').match(/'([^']+)' column|column "?([a-z_]+)"? /i);
        const missing = match ? (match[1] || match[2]) : null;
        if (!isMissingColumn || !missing || !(missing in payload)) break;
        delete payload[missing];
        skipped.push(missing);
        ({ error } = await persist(payload));
      }

      if (skipped.length && !error) {
        console.warn(`[coaches] Columnas omitidas (no existen aún en Supabase): ${skipped.join(', ')}`);
      }

      if (error) warnings.push('Tabla coaches: ' + error.message);
    }
  } catch (e) { warnings.push(e?.message); }

  const local = authService.getCurrentSession();
  if (local?.role === 'coach') authService.saveSession({ ...local, user: updated });
  return { profile: updated, warnings };
}
