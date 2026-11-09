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
    return { success: true };
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

  // 2. ACCESO EXCLUSIVO DEL ALUMNO (PASSWORDLESS REAL)
  async loginAlumno({ nombre, codigo }) {
    const cleanName = (nombre || '').trim();
    const cleanCode = (codigo || '').trim().toUpperCase();

    if (!cleanName || !cleanCode) {
      throw new Error('No se encontró un alumno con ese nombre y código. Consulta con Esteban');
    }

    const { data: cliente, error } = await supabase
      .from('clients')
      .select('*')
      .ilike('nombre_completo', `%${cleanName}%`)
      .eq('access_code', cleanCode)
      .single();

    if (error || !cliente) {
      console.warn('[Supabase] Alumno no encontrado con esos datos:', error?.message);
      throw new Error('No se encontró un alumno con ese nombre y código. Consulta con Esteban');
    }

    // Guardar el identificador del alumno en la sesión
    localStorage.setItem('alumno_session', JSON.stringify(cliente));

    const session = {
      role: 'student',
      user: cliente,
      token: `student-session-${cliente.id}`,
      loggedAt: new Date().toISOString()
    };

    this.saveSession(session);
    return session;
  },

  async loginStudent(param1, param2) {
    if (typeof param1 === 'object' && param1 !== null) {
      return this.loginAlumno({
        nombre: param1.nombre || param1.nombreCompleto || param1.studentName,
        codigo: param1.codigo || param1.accessCode || param1.studentCode
      });
    }
    return this.loginAlumno({ nombre: param1, codigo: param2 });
  }
};

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
      const { data: existing } = await withAuthRetry(() =>
        supabase.from('coaches').select('id').eq('user_id', uid).maybeSingle()
      );
      const { error } = existing
        ? await withAuthRetry(() => supabase.from('coaches').update(row).eq('id', existing.id))
        : await withAuthRetry(() => supabase.from('coaches').insert({ ...row, user_id: uid }));
      if (error) warnings.push('Tabla coaches: ' + error.message);
    }
  } catch (e) { warnings.push(e?.message); }

  const local = authService.getCurrentSession();
  if (local?.role === 'coach') authService.saveSession({ ...local, user: updated });
  return { profile: updated, warnings };
}
