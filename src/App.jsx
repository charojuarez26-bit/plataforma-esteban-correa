import React, { useState, useEffect } from 'react';
import LoginView from './components/auth/LoginView';
import Sidebar from './components/layout/Sidebar';
import DashboardView from './components/dashboard/DashboardView';
import ClientsView from './components/clients/ClientsView';
import ExercisesLibraryView from './components/exercises/ExercisesLibraryView';
import RoutinesManagerView from './components/routines/RoutinesManagerView';
import ProgressView from './components/progress/ProgressView';
import CalendarView from './components/calendar/CalendarView';
import FinanceView from './components/finance/FinanceView';
import FinancesView from './components/finance/FinancesView';
import MedicalRecordsView from './views/MedicalRecordsView';
import SettingsView from './components/settings/SettingsView';
import StudentPortal from './components/student/StudentPortal';
import StudentOnboardingView from './components/student/StudentOnboardingView';
import { checkStudentOnboardingStatus } from './services/authService';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Menu } from 'lucide-react';
import BrandLogoOfficial from './components/common/BrandLogoOfficial';

function AppContent() {
  const { session, loading, logout, setSession, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState('inicio');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [routineTargetClientId, setRoutineTargetClientId] = useState(null);

  // Estados para Onboarding Obligatorio de Alumnos
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [onboardingStudent, setOnboardingStudent] = useState(null);
  const [onboardingInitialCode, setOnboardingInitialCode] = useState('');
  const [showDirectOnboarding, setShowDirectOnboarding] = useState(
    typeof window !== 'undefined' && window.location.pathname === '/onboarding'
  );

  // Mapeo de subrutas /admin/* a vistas internas
  const getViewFromPath = (path) => {
    if (!path || !path.startsWith('/admin')) return 'inicio';
    const sub = path.replace('/admin/', '').replace('/admin', '').trim();
    if (!sub || sub === 'dashboard') return 'inicio';
    const validViews = ['inicio', 'clientes', 'rutinas', 'ejercicios', 'evaluaciones', 'fichas-medicas', 'seguimiento', 'agenda', 'pagos', 'finanzas', 'reportes', 'configuracion'];
    if (sub === 'informes') return 'finanzas';
    if (sub === 'medica' || sub === 'salud' || sub === 'fichas') return 'fichas-medicas';
    return validViews.includes(sub) ? sub : 'inicio';
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (session?.role === 'coach') {
      if (path === '/portal-alumno' || path === '/login' || path === '/') {
        window.history.replaceState({}, '', '/admin');
        setCurrentView('inicio');
      } else if (path.startsWith('/admin')) {
        setCurrentView(getViewFromPath(path));
      }
    } else if (session?.role === 'student') {
      if (!onboardingRequired && !checkingOnboarding) {
        if (path.startsWith('/admin') || path === '/login' || path === '/') {
          window.history.replaceState({}, '', '/portal-alumno');
        }
      }
    }
  }, [session?.role, onboardingRequired, checkingOnboarding]);

  // Verificación de Perfil Obligatoria para Alumnos (Paso 1 y 2)
  useEffect(() => {
    let isMounted = true;
    if (session?.role === 'student' && session.user?.id) {
      if (session.onboardingVerified) {
        setOnboardingRequired(false);
        setCheckingOnboarding(false);
        setOnboardingStudent(session.user);
        return;
      }
      setCheckingOnboarding(true);
      checkStudentOnboardingStatus(session.user.id, session.user)
        .then((res) => {
          if (isMounted) {
            setOnboardingRequired(res.needsOnboarding);
            setOnboardingStudent(res.client || session.user);
            setCheckingOnboarding(false);
          }
        })
        .catch((err) => {
          console.warn('[App] Error verificando onboarding:', err);
          if (isMounted) setCheckingOnboarding(false);
        });
    } else {
      setOnboardingRequired(false);
      setCheckingOnboarding(false);
    }
    return () => {
      isMounted = false;
    };
  }, [session?.role, session?.user?.id, session?.onboardingVerified]);

  // Guard de ruta: Si el alumno requiere onboarding, bloquear navegación hacia cualquier otra ruta
  useEffect(() => {
    if (session?.role === 'student') {
      if (onboardingRequired) {
        if (window.location.pathname !== '/onboarding') {
          window.history.replaceState({}, '', '/onboarding');
        }
      } else if (!checkingOnboarding) {
        if (window.location.pathname === '/onboarding') {
          window.history.replaceState({}, '', '/portal-alumno');
        }
      }
    }
  }, [session?.role, onboardingRequired, checkingOnboarding]);

  useEffect(() => {
    // Escuchar navegación del historial del navegador (Back / Forward)
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        if (!session || session.role !== 'coach') {
          window.history.replaceState({}, '', '/login');
          return;
        }
        setCurrentView(getViewFromPath(path));
      } else if (path === '/portal-alumno') {
        if (!session || session.role !== 'student') {
          window.history.replaceState({}, '', '/login');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [session]);

  const handleLoginSuccess = (userSession, redirectPath) => {
    if (userSession?.role === 'student' && userSession?.user?.id) {
      localStorage.setItem('active_student_id', userSession.user.id);
      localStorage.setItem('alumno_session', JSON.stringify(userSession.user));
    }
    setSession(userSession);
    if (userSession.role === 'coach') {
      const dest = redirectPath || '/admin';
      window.history.pushState({}, '', dest);
      setCurrentView('inicio');
    } else if (userSession.role === 'student') {
      const dest = redirectPath || '/portal-alumno';
      window.history.pushState({}, '', dest);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('active_student_id');
    localStorage.removeItem('alumno_session');
    await logout();
    setCurrentView('inicio');
    setSelectedClientId(null);
  };

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    setIsMobileSidebarOpen(false);
    const targetPath = viewId === 'inicio' ? '/admin' : `/admin/${viewId}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const handleNavigateToClient = (clientId) => {
    setSelectedClientId(clientId);
    setCurrentView('clientes');
    window.history.pushState({}, '', `/admin/clientes`);
  };

  const handleCreateRoutineForClient = (clientId) => {
    setRoutineTargetClientId(clientId);
    setCurrentView('rutinas');
    window.history.pushState({}, '', '/admin/rutinas');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  // 1. REGLA DE PROTECCIÓN: Si no hay sesión, permitir Onboarding Directo o renderizar LoginView
  if (!session) {
    if (showDirectOnboarding || window.location.pathname === '/onboarding') {
      return (
        <StudentOnboardingView
          initialCode={onboardingInitialCode}
          onComplete={(newStudent) => {
            localStorage.setItem('active_student_id', newStudent.id);
            localStorage.setItem('alumno_session', JSON.stringify(newStudent));
            const studentSession = {
              role: 'student',
              user: newStudent,
              token: `student-session-${newStudent.id}`,
              onboardingVerified: true
            };
            handleLoginSuccess(studentSession, '/portal-alumno');
            setShowDirectOnboarding(false);
          }}
          onBackToLogin={() => {
            setShowDirectOnboarding(false);
            window.history.replaceState({}, '', '/login');
          }}
        />
      );
    }

    if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/portal-alumno') {
      window.history.replaceState({}, '', '/login');
    }
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onStartOnboarding={(code) => {
          setOnboardingInitialCode(code || '');
          setShowDirectOnboarding(true);
          window.history.pushState({}, '', '/onboarding');
        }}
      />
    );
  }

  // 2. Si el rol es Alumno: Verificar Onboarding Obligatorio antes de ingresar al Portal
  if (session.role === 'student') {
    if (checkingOnboarding) {
      return (
        <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-white p-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand mb-3"></div>
          <p className="text-xs text-gray-400 font-medium tracking-wide">Verificando estado de tu ficha técnica...</p>
        </div>
      );
    }

    if (onboardingRequired) {
      return (
        <StudentOnboardingView
          student={onboardingStudent || session.user}
          onComplete={(updatedStudent) => {
            localStorage.setItem('active_student_id', updatedStudent.id);
            localStorage.setItem('alumno_session', JSON.stringify(updatedStudent));
            if (updateUser) updateUser(updatedStudent);
            setOnboardingStudent(updatedStudent);
            setOnboardingRequired(false);
            window.history.replaceState({}, '', '/portal-alumno');
          }}
          onLogout={handleLogout}
        />
      );
    }

    if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/login' || window.location.pathname === '/' || window.location.pathname === '/onboarding') {
      window.history.replaceState({}, '', '/portal-alumno');
    }
    return <StudentPortal student={session.user} onLogout={handleLogout} />;
  }

  // 3. Si el rol es Entrenador (Admin), mostrar el Panel del Coach con navegación /admin/*
  if (window.location.pathname === '/portal-alumno' || window.location.pathname === '/login' || window.location.pathname === '/') {
    window.history.replaceState({}, '', '/admin');
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-950 text-gray-100 antialiased">
      
      {/* Sidebar de Navegación Refinado con Cerrar Sesión Supabase */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
        user={session.user}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Área de Contenido Principal (Panel Derecho) */}
      <div className="flex-1 h-full min-w-0 flex flex-col bg-gray-950 relative overflow-hidden">
        
        {/* Header móvil superior para celulares (< 768px) */}
        <header className="md:hidden shrink-0 z-40 bg-gray-950/95 backdrop-blur-md border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shadow-md">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-300 hover:text-white bg-[#18171d] border border-gray-800 active:scale-95 transition-all"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="scale-90 origin-center">
            <BrandLogoOfficial size="sm" />
          </div>

          <button
            onClick={() => handleViewChange('configuracion')}
            className="w-9 h-9 rounded-xl overflow-hidden border border-gray-800 active:scale-95 transition-all"
            title="Ir a Configuración / Perfil"
          >
            <img
              src={session.user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt={session.user?.nombre || 'Esteban Correa'}
              className="w-full h-full object-cover"
            />
          </button>
        </header>

        {/* Panel derecho con scroll independiente */}
        <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
          <div className="p-3.5 sm:p-6 lg:p-8 pb-24 max-w-7xl w-full mx-auto">
            
            {/* 1. Inicio (Dashboard) */}
            {(currentView === 'inicio' || currentView === 'dashboard') && (
              <DashboardView
                onNavigate={handleViewChange}
                onNavigateToClient={handleNavigateToClient}
                onOpenNewClientModal={() => {
                  handleViewChange('clientes');
                  setIsNewClientModalOpen(true);
                }}
              />
            )}

            {/* 2. Clientes */}
            {currentView === 'clientes' && (
              <ClientsView
                isModalOpen={isNewClientModalOpen}
                onCloseModal={() => setIsNewClientModalOpen(false)}
                selectedClientId={selectedClientId}
                onClearSelectedClient={() => {
                  setSelectedClientId(null);
                  window.history.pushState({}, '', '/admin/clientes');
                }}
                onCreateRoutine={handleCreateRoutineForClient}
              />
            )}

            {/* 3. Rutinas (Gestor y Asignador de Sesiones) */}
            {currentView === 'rutinas' && (
              <RoutinesManagerView 
                onNavigateToClient={handleNavigateToClient} 
                initialClientId={routineTargetClientId}
                onClearInitialClientId={() => setRoutineTargetClientId(null)}
              />
            )}

            {/* 4. Ejercicios (Biblioteca Oficial con Filtros por Grupo Muscular) */}
            {currentView === 'ejercicios' && (
              <ExercisesLibraryView />
            )}

            {/* 5. Evaluaciones */}
            {currentView === 'evaluaciones' && <ProgressView defaultTab="evaluaciones" />}

            {/* 6. Fichas Médicas (Control Central de Salud de Alumnos) */}
            {(currentView === 'fichas-medicas' || currentView === 'salud') && (
              <MedicalRecordsView />
            )}

            {/* 7. Seguimiento */}
            {currentView === 'seguimiento' && <ProgressView defaultTab="seguimiento" />}

            {/* 8. Agenda */}
            {currentView === 'agenda' && <CalendarView />}

            {/* 8. Planes y Pagos */}
            {(currentView === 'pagos' || currentView === 'planes') && <FinanceView />}

            {/* 9. Módulo Integral de Finanzas (Ex-Informes) */}
            {(currentView === 'finanzas' || currentView === 'informes' || currentView === 'reportes') && <FinancesView />}

            {/* 10. Configuración */}
            {currentView === 'configuracion' && (
              <SettingsView user={session.user} onUpdateProfile={(updated) => setSession(prev => ({ ...prev, user: { ...prev.user, ...updated } }))} />
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
