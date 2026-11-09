import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xqpheqvqqozthgpqatds.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eK01mzMcD988vnPC5A_OGQ_C7xManra';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http')
);

// ==========================================================
// 1. INSTANCIA ÚNICA (SINGLETON) DE SUPABASE CLIENT
// ==========================================================
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

// ==========================================================
// 2. DETECTOR DE ERRORES DE AUTENTICACIÓN / JWT EXPIRADO
// ==========================================================
export function isAuthError(error) {
  if (!error) return false;
  const msg = (error.message || error.error_description || error.msg || String(error)).toLowerCase();
  const code = String(error.code || error.status || error.statusCode || '');
  return (
    code === '401' ||
    code === 'PGRST301' ||
    msg.includes('jwt expired') ||
    msg.includes('token is expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid claim') ||
    msg.includes('jwt not found') ||
    msg.includes('session from cookies has expired') ||
    msg.includes('not authenticated') ||
    msg.includes('unauthorized')
  );
}

// ==========================================================
// 3. CONTROL DE REDIRECCIÓN POR SESIÓN EXPIRADA
// ==========================================================
export function handleSessionExpired(customMessage = 'Tu sesión ha expirado. Por favor, ingresa nuevamente.') {
  console.warn('[AuthInterceptor] Sesión expirada irreversiblemente. Redirigiendo a /login...');
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('auth_expired_notice', customMessage);
      window.localStorage.removeItem('ec_trainer_auth_session');
      // Si no es un alumno con sesión passwordless en localStorage
      const alumnoSession = window.localStorage.getItem('alumno_session');
      if (!alumnoSession) {
        window.localStorage.clear();
        window.sessionStorage.setItem('auth_expired_notice', customMessage);
      }
    }
  } catch (e) {
    console.warn('Error limpiando almacenamiento:', e);
  }

  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login?expired=true';
  }
}

// ==========================================================
// 4. INTERCEPTOR PROACTIVO CON REINTENTO AUTOMÁTICO
// ==========================================================
let isRefreshingPromise = null;

export async function refreshSessionSafely() {
  if (isRefreshingPromise) return isRefreshingPromise;

  isRefreshingPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data?.session) {
        return { success: false, error };
      }
      return { success: true, session: data.session };
    } catch (err) {
      return { success: false, error: err };
    } finally {
      isRefreshingPromise = null;
    }
  })();

  return isRefreshingPromise;
}

/**
 * Ejecuta una consulta o función contra Supabase con interceptor de auth.
 * Si detecta 401 o 'JWT expired':
 * 1. Intenta forzar la renovación con supabase.auth.refreshSession().
 * 2. Si es exitosa, reintenta la consulta una vez.
 * 3. Si falla, limpia la sesión y redirige inmediatamente al /login con aviso.
 */
export async function withAuthRetry(queryFn) {
  try {
    let result = await queryFn();

    // Comprobar si la respuesta contiene un error de autenticación
    if (result && result.error && isAuthError(result.error)) {
      console.warn('[withAuthRetry] 401 / JWT expired detectado en resultado:', result.error.message);
      const refresh = await refreshSessionSafely();

      if (refresh.success) {
        console.log('[withAuthRetry] Sesión renovada con éxito. Reintentando consulta...');
        result = await queryFn();

        if (result && result.error && isAuthError(result.error)) {
          handleSessionExpired();
          return { data: null, error: result.error, isAuthError: true };
        }
        return result;
      } else {
        handleSessionExpired();
        return { data: null, error: result.error, isAuthError: true };
      }
    }

    return result;
  } catch (err) {
    if (isAuthError(err)) {
      console.warn('[withAuthRetry] 401 / JWT expired detectado en excepción:', err.message);
      const refresh = await refreshSessionSafely();

      if (refresh.success) {
        console.log('[withAuthRetry] Sesión renovada con éxito. Reintentando tras excepción...');
        const retried = await queryFn();
        return retried;
      } else {
        handleSessionExpired();
        return { data: null, error: err, isAuthError: true };
      }
    }
    throw err;
  }
}

export default supabase;

