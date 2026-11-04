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
import ReportsView from './components/reports/ReportsView';
import SettingsView from './components/settings/SettingsView';
import StudentPortal from './components/student/StudentPortal';
import { authService, resolveCoachProfile } from './services/authService';
import { supabase } from './lib/supabase';
import { Menu } from 'lucide-react';
import BrandLogoOfficial from './components/common/BrandLogoOfficial';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('inicio');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [routineTargetClientId, setRoutineTargetClientId] = useState(null);

  // Mapeo de subrutas /admin/* a vistas internas
  const getViewFromPath = (path) => {
    if (!path || !path.startsWith('/admin')) return 'inicio';
    const sub = path.replace('/admin/', '').replace('/admin', '').trim();
    if (!sub || sub === 'dashboard') return 'inicio';
    const validViews = ['inicio', 'clientes', 'rutinas', 'ejercicios', 'evaluaciones', 'seguimiento', 'agenda', 'finanzas', 'reportes', 'configuracion'];
    return validViews.includes(sub) ? sub : 'inicio';
  };

  useEffect(() => {
    async function initAuth() {
      try {
        const path = window.location.pathname;

        // 1. Prioridad: Sesión de alumno en localStorage
        const alumnoRaw = localStorage.getItem('alumno_session');
        if (alumnoRaw) {
          const cliente = JSON.parse(alumnoRaw);
          const studentSession = {
            role: 'student',
            user: cliente,
            token: `student-session-${cliente.id}`
          };
          setSession(studentSession);

          // Si el alumno intenta acceder a /admin o /login, redirigir a su portal
          if (path.startsWith('/admin') || path === '/login' || path === '/') {
            window.history.replaceState({}, '', '/portal-alumno');
          }
          setLoading(false);
          return;
        }

        // 2. Sesión activa del Entrenador en Supabase Auth
        const { data: { session: sbSession } } = await supabase.auth.getSession();

        if (sbSession && sbSession.user) {
          const coachProfile = await resolveCoachProfile(sbSession.user);

          const coachSession = {
            role: 'coach',
            user: coachProfile,
            token: sbSession.access_token
          };

          authService.saveSession(coachSession);
          setSession(coachSession);

          // Si está en /login o /portal-alumno o raíz, redirigir a /admin
          if (path === '/portal-alumno' || path === '/login' || path === '/') {
            window.history.replaceState({}, '', '/admin');
            setCurrentView('inicio');
          } else if (path.startsWith('/admin')) {
            setCurrentView(getViewFromPath(path));
          }
        } else {
          // Si no hay sesión válida en Supabase Auth, forzar redirección a /login
          await authService.logout();
          setSession(null);
          if (path.startsWith('/admin') || path === '/portal-alumno') {
            window.history.replaceState({}, '', '/login');
          }
        }
      } catch (err) {
        console.error('Error inicializando autenticación:', err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Escuchar eventos de sesión de Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sbSession) => {
      if (event === 'TOKEN_REFRESHED' && sbSession?.access_token) {
        // Mantener sincronizado el token guardado localmente con el renovado por Supabase
        const local = authService.getCurrentSession();
        if (local?.role === 'coach') {
          const updated = { ...local, token: sbSession.access_token };
          authService.saveSession(updated);
          setSession(updated);
        }
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('ec_trainer_auth_session');
        setSession(prev => (prev?.role === 'coach' ? null : prev));
        if (window.location.pathname.startsWith('/admin')) {
          window.history.replaceState({}, '', '/login');
        }
      }
    });

    // Escuchar navegación del historial del navegador (Back / Forward)
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        const local = authService.getCurrentSession();
        if (!local || local.role !== 'coach') {
          window.history.replaceState({}, '', '/login');
          setSession(null);
          return;
        }
        setCurrentView(getViewFromPath(path));
      } else if (path === '/portal-alumno') {
        const local = authService.getCurrentSession();
        if (!local || local.role !== 'student') {
          window.history.replaceState({}, '', '/login');
          setSession(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleLoginSuccess = (userSession, redirectPath) => {
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
    await authService.logout();
    setSession(null);
    setCurrentView('inicio');
    setSelectedClientId(null);
    if (window.location.pathname !== '/login') {
      window.history.pushState({}, '', '/login');
    }
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

  // 1. REGLA DE PROTECCIÓN: Si no hay sesión, forzar /login y renderizar LoginView
  if (!session) {
    if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/portal-alumno') {
      window.history.replaceState({}, '', '/login');
    }
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Si el rol es Alumno, mostrar el Portal Móvil del Cliente
  if (session.role === 'student') {
    if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/login' || window.location.pathname === '/') {
      window.history.replaceState({}, '', '/portal-alumno');
    }
    return <StudentPortal student={session.user} onLogout={handleLogout} />;
  }

  // 3. Si el rol es Entrenador (Admin), mostrar el Panel del Coach con navegación /admin/*
  if (window.location.pathname === '/portal-alumno' || window.location.pathname === '/login' || window.location.pathname === '/') {
    window.history.replaceState({}, '', '/admin');
  }

  return (
    <div className="min-h-screen bg-[#0b0a0c] text-gray-100 flex flex-col md:flex-row antialiased">
      
      {/* Sidebar de Navegación Refinado con Cerrar Sesión Supabase */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
        user={session.user}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Área de Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#0b0a0c] relative overflow-x-hidden">
        
        {/* Header móvil superior para celulares (< 768px) */}
        <header className="md:hidden sticky top-0 z-40 bg-[#0b0a0c]/95 backdrop-blur-md border-b border-[#1f1e24] px-4 py-2.5 flex items-center justify-between shadow-md">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-300 hover:text-white bg-[#18171d] border border-[#1f1e24] active:scale-95 transition-all"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="scale-90 origin-center">
            <BrandLogoOfficial size="sm" />
          </div>

          <button
            onClick={() => handleViewChange('configuracion')}
            className="w-9 h-9 rounded-xl overflow-hidden border border-[#1f1e24] active:scale-95 transition-all"
            title="Ir a Configuración / Perfil"
          >
            <img
              src={session.user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt={session.user?.nombre || 'Esteban Correa'}
              className="w-full h-full object-cover"
            />
          </button>
        </header>

        {/* Vistas según el ítem seleccionado */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          
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

          {/* 6. Seguimiento */}
          {currentView === 'seguimiento' && <ProgressView defaultTab="seguimiento" />}

          {/* 7. Agenda */}
          {currentView === 'agenda' && <CalendarView />}

          {/* 8. Planes y Pagos (Finanzas) */}
          {currentView === 'finanzas' && <FinanceView />}

          {/* 9. Reportes */}
          {currentView === 'reportes' && <ReportsView />}

          {/* 10. Configuración */}
          {currentView === 'configuracion' && (
            <SettingsView user={session.user} onUpdateProfile={(updated) => setSession(prev => ({ ...prev, user: { ...prev.user, ...updated } }))} />
          )}

        </main>
      </div>
    </div>
  );
}
