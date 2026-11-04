import { supabase } from '../lib/supabase';

const SESSION_KEY = 'ec_trainer_auth_session';

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

    let coachProfile = {
      id: data.user.id,
      nombre: data.user.user_metadata?.nombre || data.user.user_metadata?.full_name || 'Esteban Correa',
      email: data.user.email,
      avatar_url: data.user.user_metadata?.avatar_url || null
    };

    try {
      const { data: coachData } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (coachData) coachProfile = { ...coachProfile, ...coachData };
    } catch (e) {
      console.warn('[Auth] Perfil en tabla coaches no encontrado, usando metadata:', e);
    }

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
