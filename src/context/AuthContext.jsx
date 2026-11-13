import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, refreshSessionSafely, handleSessionExpired } from '../lib/supabaseClient';
import { authService, resolveCoachProfile, checkStudentOnboardingStatus } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); // 'coach' | 'student' | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // 1. Verificación de Inicio: Comprobar si existe active_student_id en localStorage
        const activeStudentId = localStorage.getItem('active_student_id');
        if (activeStudentId) {
          try {
            // Validar rápidamente en Supabase que el alumno exista y siga activo
            const { data: student, error } = await supabase
              .from('clients')
              .select('*')
              .eq('id', activeStudentId)
              .maybeSingle();

            if (!error && student && (student.estado || '').toLowerCase() !== 'inactivo') {
              // Validar si completó el onboarding
              const status = await checkStudentOnboardingStatus(student.id, student);
              const isCompleted = !status.needsOnboarding;

              // Guardar en caché local
              localStorage.setItem('alumno_session', JSON.stringify(student));

              const studentSession = {
                role: 'student',
                user: student,
                token: `student-session-${student.id}`,
                onboardingVerified: isCompleted
              };

              if (isMounted) {
                setUser(student);
                setSession(studentSession);
                setRole('student');
                setLoading(false);
              }
              return;
            } else {
              // Si el alumno no existe o ya no está activo en Supabase, limpiar sesión
              console.warn('[AuthContext] Alumno inactivo o no encontrado en Supabase:', activeStudentId);
              localStorage.removeItem('active_student_id');
              localStorage.removeItem('alumno_session');
            }
          } catch (studentErr) {
            console.warn('[AuthContext] Error consultando Supabase para active_student_id:', studentErr);
            // Fallback de contingencia offline si hay caché válida
            const alumnoRaw = localStorage.getItem('alumno_session');
            if (alumnoRaw) {
              try {
                const cliente = JSON.parse(alumnoRaw);
                if (cliente?.id === activeStudentId) {
                  const studentSession = {
                    role: 'student',
                    user: cliente,
                    token: `student-session-${cliente.id}`,
                    onboardingVerified: true
                  };
                  if (isMounted) {
                    setUser(cliente);
                    setSession(studentSession);
                    setRole('student');
                    setLoading(false);
                  }
                  return;
                }
              } catch { /* ignore */ }
            }
            localStorage.removeItem('active_student_id');
            localStorage.removeItem('alumno_session');
          }
        } else {
          // No existe active_student_id: limpiar cualquier residuo de alumno
          localStorage.removeItem('alumno_session');
        }

        // 2. Si no hay alumno activo, verificar sesión de Supabase Auth (para Entrenador)
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error || !initialSession) {
          if (isMounted) {
            setUser(null);
            setSession(null);
            setRole(null);
            setLoading(false);
          }
        } else {
          // Sesión activa encontrada: resolver el perfil completo del entrenador
          const coachProfile = await resolveCoachProfile(initialSession.user);
          if (isMounted) {
            const coachSession = {
              role: 'coach',
              user: coachProfile,
              token: initialSession.access_token
            };
            authService.saveSession(coachSession);
            setUser(coachProfile);
            setSession(coachSession);
            setRole('coach');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error inicializando autenticación:', err);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setRole(null);
          setLoading(false);
        }
      }
    }

    initAuth();

    // 2. Suscribirse activamente a los cambios de estado con onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // Si hay un alumno logueado con active_student_id, no interferir con eventos de Supabase Auth
      const activeStudent = localStorage.getItem('active_student_id');
      if (activeStudent && !currentSession) {
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (currentSession?.user) {
          const coachProfile = await resolveCoachProfile(currentSession.user);
          const updatedSession = {
            role: 'coach',
            user: coachProfile,
            token: currentSession.access_token
          };
          authService.saveSession(updatedSession);
          if (isMounted) {
            setUser(coachProfile);
            setSession(updatedSession);
            setRole('coach');
          }
        }
      } else if (event === 'SIGNED_OUT' || (!currentSession && !alumnoRaw)) {
        if (isMounted) {
          setUser(null);
          setSession(null);
          setRole(null);
        }
        localStorage.removeItem('ec_trainer_auth_session');
        // Redirigir al login si estábamos en área protegida de entrenador
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
          window.location.href = '/login';
        }
      } else if (event === 'SIGNED_IN' && currentSession?.user) {
        const coachProfile = await resolveCoachProfile(currentSession.user);
        const coachSession = {
          role: 'coach',
          user: coachProfile,
          token: currentSession.access_token
        };
        authService.saveSession(coachSession);
        if (isMounted) {
          setUser(coachProfile);
          setSession(coachSession);
          setRole('coach');
        }
      } else if (currentSession?.user) {
        if (isMounted) {
          setUser(currentSession.user);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const loginCoach = async (email, password) => {
    const session = await authService.loginEntrenador({ email, password });
    setUser(session.user);
    setSession(session);
    setRole('coach');
    return session;
  };

  const loginStudent = async (nombre, codigo) => {
    const session = await authService.loginAlumno({ nombre, codigo });
    setUser(session.user);
    setSession(session);
    setRole('student');
    return session;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('active_student_id');
      localStorage.removeItem('alumno_session');
      setUser(null);
      setSession(null);
      setRole(null);
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.history.pushState({}, '', '/login');
      }
    }
  };

  const updateUser = (patch) => {
    setUser(prev => (prev ? { ...prev, ...patch } : prev));
    setSession(prev => (prev ? { ...prev, user: { ...prev.user, ...patch } } : prev));
  };

  const value = {
    user,
    session,
    role,
    loading,
    setUser,
    setSession,
    updateUser,
    loginCoach,
    loginStudent,
    logout,
    refreshSession: refreshSessionSafely
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export default AuthContext;

