import React, { useState, useEffect } from 'react';
import ClientsListView from './ClientsListView';
import ClientDetailView from './ClientDetailView';
import NewClientModal from './NewClientModal';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/dataService';

export default function ClientsView({ isModalOpen, onCloseModal, selectedClientId, onClearSelectedClient, onCreateRoutine }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  useEffect(() => {
    loadClients();
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
      <div className="min-h-[400px] flex items-center justify-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
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
        />
      )}
    </>
  );
}
