import React, { useState, useEffect } from 'react';
import ClientsListView from './ClientsListView';
import ClientDetailView from './ClientDetailView';
import NewClientModal from './NewClientModal';
import ClientEditModal from './ClientEditModal';
import ClientDeleteModal from './ClientDeleteModal';
import RegisterPaymentModal from '../finance/RegisterPaymentModal';
import ClientAvatar from '../common/ClientAvatar';
import { CheckCircle2, AlertTriangle, RefreshCw, Sparkles, DollarSign } from 'lucide-react';
import { supabase, withAuthRetry, isAuthError } from '../../lib/supabaseClient';
import { dataService } from '../../services/dataService';

export default function ClientsView({ isModalOpen, onCloseModal, selectedClientId, onClearSelectedClient, onCreateRoutine }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [transitionClient, setTransitionClient] = useState(null);
  const [paymentModalClient, setPaymentModalClient] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const paymentClient = paymentModalClient;
  const setPaymentClient = setPaymentModalClient;
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleClientEdited = (updated, { routineChanged } = {}) => {
    // Actualización inmediata del estado local, sin recargar la página
    setClients(prev => prev.map(c => (c.id === updated.id ? { ...c, ...updated } : c)));
    setSelectedClient(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    setEditingClient(null);
    showToast('Alumno actualizado con éxito');
    if (routineChanged) loadClients(); // re-sincroniza las rutinas del alumno
  };

  const handleClientDeleted = (clienteId) => {
    setClients(prev => prev.filter(c => c.id !== clienteId));
    setSelectedClient(prev => (prev && prev.id === clienteId ? null : prev));
    setDeletingClient(null);
    showToast('Alumno eliminado correctamente');
  };

  useEffect(() => {
    let isMounted = true;

    // Cargar clientes inmediatamente asegurando que el cliente auth esté listo
    const initClients = async () => {
      // 1. Si no hay sesión lista, esperar al evento de sesión de Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      await loadClients();
    };

    initClients();

    // 2. Suscribirse a cambios de autenticación para recargar si la sesión se refresca o inicia
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        loadClients();
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedClientId && clients.length > 0) {
      const found = clients.find(c => c.id === selectedClientId);
      if (found) setSelectedClient(found);
    }
  }, [selectedClientId, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setAuthError(null);

      // Consulta protegida con reintento automático y verificación de JWT
      const { data, error, isAuthError: hadAuthError } = await withAuthRetry(() =>
        supabase
          .from('clients')
          .select('*, routines(id, nombre, activa)')
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .order('creado_el', { ascending: false })
      );

      if (error || hadAuthError) {
        console.error("Error consultando clients en Supabase:", error);
        setAuthError(error?.message || 'Error de sincronización con la base de datos');
        // NUNCA vaciar clients ni asumir que tiene 0 alumnos si hubo un error de auth/red
        return;
      }

      setAuthError(null);

      const list = (data || []).map(c => {
        let meta = {};
        try {
          const raw = localStorage.getItem(`ec_client_meta_${c.id}`);
          if (raw) meta = JSON.parse(raw);
        } catch (e) {
          // ignore
        }
        const photo = c.foto_url || meta.foto_url || meta.avatar_url || c.avatar_url || null;
        const activeRoutine = (c.routines || []).find(r => r.activa);
        const routineName = activeRoutine ? activeRoutine.nombre : null;
        const fechaVenc = c.fecha_vencimiento || meta.fecha_vencimiento || null;
        const estadoPago = c.estado_pago || meta.estado_pago || (fechaVenc ? 'al_dia' : 'sin_plan');

        return {
          ...c,
          foto_url: photo,
          avatar_url: photo,
          rutina_activa: routineName,
          tiene_rutina: Boolean(routineName),
          notas: meta.notas || c.notas || '',
          plan_actual: meta.plan_actual || c.plan_actual || 'Plan Personalizado',
          fecha_vencimiento: fechaVenc,
          estado_pago: estadoPago,
          dias_por_semana: meta.dias_por_semana || c.dias_por_semana || 3,
          dias_asignados: meta.dias_asignados || c.dias_asignados || ['Lunes', 'Miércoles', 'Viernes'],
          tipo_planificacion: meta.tipo_planificacion || c.tipo_planificacion || 'Semanal',
          duracion_sesion_min: meta.duracion_sesion_min || c.duracion_sesion_min || 60
        };
      });

      setClients(list);
      if (selectedClientId) {
        const found = list.find(c => c.id === selectedClientId);
        if (found) setSelectedClient(found);
      }
    } catch (err) {
      console.error('Error cargando clientes de Supabase:', err);
      setAuthError(err?.message || 'Error inesperado al conectar con Supabase');
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = async (created) => {
    // 1. Refrescar lista real directamente desde Supabase
    await loadClients();
    // 2. Abrir diálogo de transición post-creación
    setTransitionClient(created);
  };

  const handleStartPaymentFromTransition = () => {
    const target = transitionClient;
    setTransitionClient(null);
    setPaymentModalClient(target);
    setIsPaymentModalOpen(true);
  };

  const handleDismissTransition = () => {
    setTransitionClient(null);
    showToast('Alumno guardado correctamente');
  };

  const handleRegisterPayment = (client) => {
    setPaymentModalClient(client);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (result) => {
    const targetId = result?.client?.id || result?.payment?.client_id;
    const nuevaFecha = result?.nuevaFechaVencimiento;
    const nuevoPlan = result?.payment?.notas || result?.payment?.plan_nombre;

    // Actualización inmediata del estado local sin recargar la página completa
    setClients(prev => prev.map(c => {
      if (c.id === targetId) {
        return {
          ...c,
          fecha_vencimiento: nuevaFecha,
          plan_actual: nuevoPlan || c.plan_actual,
          estado_pago: 'al_dia',
          estado: 'Activo'
        };
      }
      return c;
    }));

    setSelectedClient(prev => {
      if (prev && prev.id === targetId) {
        return {
          ...prev,
          fecha_vencimiento: nuevaFecha,
          plan_actual: nuevoPlan || prev.plan_actual,
          estado_pago: 'al_dia',
          estado: 'Activo'
        };
      }
      return prev;
    });

    setIsPaymentModalOpen(false);
    setPaymentModalClient(null);

    // Toast de confirmación solicitado
    showToast('Primer cobro registrado con éxito. Alumno activado.');

    // Sincronizar clientes con la base de datos para badges y estados actualizados
    loadClients();
  };

  const handleOpenCreatedProfile = (client) => {
    setSelectedClient(client);
    setInternalModalOpen(false);
    if (onCloseModal) onCloseModal();
  };

  const handleUpdateClient = (updated) => {
    setSelectedClient(updated);
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const isModalActive = Boolean(isModalOpen || internalModalOpen);

  if (loading && clients.length === 0 && !authError) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
        <p className="text-xs font-semibold text-zinc-400 animate-pulse">Sincronizando alumnos con Supabase...</p>
      </div>
    );
  }

  // NUNCA renderizar la vista de "Aún no tienes alumnos registrados" si el origen fue un error de autenticación/red
  if (authError && clients.length === 0) {
    return (
      <div className="card-dark rounded-2xl p-8 sm:p-14 text-center space-y-4 border border-rose-500/30 max-w-lg mx-auto my-12 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Error al sincronizar directorio
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            {authError}
          </p>
        </div>
        <div className="pt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => loadClients()}
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar Conexión</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal unificado de Nuevo Cliente con pantalla de confirmación y WhatsApp */}
      <NewClientModal
        isOpen={isModalActive}
        onClose={() => {
          setInternalModalOpen(false);
          if (onCloseModal) onCloseModal();
        }}
        onClientCreated={handleClientCreated}
        onOpenProfile={handleOpenCreatedProfile}
      />

      {/* Si hay un cliente seleccionado, mostrar la Vista de Perfil Detallado */}
      {selectedClient ? (
        <ClientDetailView
          client={selectedClient}
          onBack={() => {
            setSelectedClient(null);
            if (onClearSelectedClient) onClearSelectedClient();
          }}
          onUpdateClient={handleUpdateClient}
          onCreateRoutine={onCreateRoutine}
        />
      ) : (
        /* Si no hay cliente seleccionado, mostrar la Vista de Listado */
        <ClientsListView
          clients={clients}
          onSelectClient={(client) => setSelectedClient(client)}
          onOpenModal={() => setInternalModalOpen(true)}
          onEditClient={(client) => setEditingClient(client)}
          onDeleteClient={(client) => setDeletingClient(client)}
          onRegisterPayment={handleRegisterPayment}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL DE TRANSICIÓN POST-CREACIÓN DE ALUMNO               */}
      {/* ======================================================== */}
      {transitionClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col text-center space-y-4 animate-in zoom-in-95">
            
            <button
              type="button"
              onClick={handleDismissTransition}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-xs transition-colors"
              title="Cerrar"
            >
              ✕
            </button>

            {/* Avatar circular del alumno */}
            <div className="flex justify-center pt-1">
              <ClientAvatar
                client={transitionClient}
                size="2xl"
                showStatus={true}
                status="Activo"
                className="border-2 border-emerald-500/80 shadow-xl shadow-emerald-950/40"
              />
            </div>

            {/* Textos y pregunta de transición */}
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> ¡Alumno registrado con éxito!
              </span>
              <h3 className="text-lg sm:text-xl font-display font-black text-white">
                {transitionClient.nombre_completo}
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 font-medium pt-1">
                ¿Deseas asentar su primer cobro ahora para habilitarle el acceso?
              </p>
            </div>

            {/* Resumen del alta */}
            <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 text-left space-y-1.5 text-xs text-gray-400">
              <div className="flex items-center justify-between">
                <span>Plan asignado:</span>
                <span className="font-semibold text-white">{transitionClient.plan_actual || 'Plan 4x Semanal Personalizado'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Código móvil:</span>
                <span className="font-mono font-bold text-brand-light">{transitionClient.access_code}</span>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleStartPaymentFromTransition}
                className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wide shadow-glow-red transition-all flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>Registrar Primer Cobro</span>
              </button>

              <button
                type="button"
                onClick={handleDismissTransition}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-all"
              >
                Hacerlo más tarde
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL ULTRA-COMPACTO DE COBRO (PRIMER COBRO O RENOVACIÓN) */}
      {/* ======================================================== */}
      {(isPaymentModalOpen || Boolean(paymentModalClient)) && (
        <RegisterPaymentModal
          isOpen={isPaymentModalOpen || Boolean(paymentModalClient)}
          client={paymentModalClient}
          initialClient={paymentModalClient}
          initialClientId={paymentModalClient?.id}
          initialPlanId={paymentModalClient?.membership_plan_id || paymentModalClient?.plan_id || paymentModalClient?.plan_actual}
          clients={clients}
          onClose={() => {
            setPaymentModalClient(null);
            setIsPaymentModalOpen(false);
          }}
          onPaymentSuccess={(result) => {
            handlePaymentSuccess(result);
            loadClients();
          }}
        />
      )}

      {editingClient && (
        <ClientEditModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={handleClientEdited}
        />
      )}

      {deletingClient && (
        <ClientDeleteModal
          client={deletingClient}
          onClose={() => setDeletingClient(null)}
          onDeleted={handleClientDeleted}
        />
      )}

      {toast && (
        <div role="status"
             className={`fixed bottom-24 md:bottom-6 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 border ${
               toast.type === 'error'
                 ? 'bg-red-950/90 border-red-500/40 text-red-200'
                 : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
             }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </>
  );
}
