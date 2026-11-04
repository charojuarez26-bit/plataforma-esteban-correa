import React, { useState, useEffect } from 'react';
import ClientsListView from './ClientsListView';
import ClientDetailView from './ClientDetailView';
import NewClientModal from './NewClientModal';
import ClientEditModal from './ClientEditModal';
import ClientDeleteModal from './ClientDeleteModal';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/dataService';

export default function ClientsView({ isModalOpen, onCloseModal, selectedClientId, onClearSelectedClient, onCreateRoutine }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
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
      // Consulta EXCLUSIVAMENTE a la tabla 'clients' de Supabase con sus rutinas
      const { data, error } = await supabase
        .from('clients')
        .select('*, routines(id, nombre, activa)')
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .order('creado_el', { ascending: false });

      if (error) {
        console.error("Error consultando clients en Supabase:", error);
        setClients([]);
        return;
      }

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
      });

      setClients(list);
      if (selectedClientId) {
        const found = list.find(c => c.id === selectedClientId);
        if (found) setSelectedClient(found);
      }
    } catch (err) {
      console.error('Error cargando clientes de Supabase:', err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = async (created) => {
    // Refrescar lista real directamente desde Supabase
    await loadClients();
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

  if (loading && clients.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
        <p className="text-xs font-semibold text-zinc-400 animate-pulse">Sincronizando alumnos con Supabase...</p>
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
