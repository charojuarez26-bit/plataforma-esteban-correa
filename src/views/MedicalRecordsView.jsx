import React, { useState, useEffect, useMemo } from 'react';
import { 
  HeartPulse, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MessageCircle, 
  Eye, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Users, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  ExternalLink,
  Filter
} from 'lucide-react';
import { supabase, withAuthRetry } from '../lib/supabaseClient';
import { dataService } from '../services/dataService';
import ClientAvatar from '../components/common/ClientAvatar';

export default function MedicalRecordsView() {
  const [clientsWithRecords, setClientsWithRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'completadas' | 'pendientes'
  
  // Modal de Detalle
  const [selectedRecordClient, setSelectedRecordClient] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Estados de acción (toggle permiso)
  const [togglingId, setTogglingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);

      // 1. Traer todos los clientes reales
      const { data: clientesData, error: errClientes } = await withAuthRetry(() =>
        supabase
          .from('clients')
          .select('*')
          .order('nombre_completo', { ascending: true })
      );

      if (errClientes) throw errClientes;

      // 2. Traer todas las fichas médicas cargadas
      const { data: fichasData, error: errFichas } = await withAuthRetry(() =>
        supabase
          .from('medical_records')
          .select('*')
      );

      if (errFichas) throw errFichas;

      console.log('Fichas cargadas en entrenador:', fichasData);

      // 3. Crear mapa indexado estrictamente por client_id real (insensible a espacios en blanco y descartando ceros)
      const fichasMap = {};
      (fichasData || []).forEach(f => {
        const cId = f.client_id ? String(f.client_id).trim() : '';
        if (cId && !cId.includes('00000000')) {
          fichasMap[cId] = f;
        }
      });

      // 4. Cruzar clientes con sus fichas mediante String(cliente.id).trim() === String(ficha.client_id).trim()
      const alumnosProcesados = (clientesData || [])
        .filter(c => {
          const nombreCompleto = (c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`).toLowerCase();
          const cleanId = c.id ? String(c.id).trim() : '';
          return cleanId && !cleanId.includes('00000000') && !nombreCompleto.includes('plantilla') && !c.es_plantilla && !c.is_template;
        })
        .map(cliente => {
          const cleanId = String(cliente.id).trim();
          // Búsqueda directa en fichasData para máxima precisión
          const ficha = (fichasData || []).find(f => String(f.client_id).trim() === cleanId) || fichasMap[cleanId] || null;

          const completada = Boolean(
            ficha && (ficha.completada === true || ficha.declaracion_jurada === true)
          );

          return {
            ...cliente,
            fichaMedica: ficha,
            estaCompleta: completada
          };
        });

      setClientsWithRecords(alumnosProcesados);
    } catch (error) {
      console.error('Error cargando fichas médicas:', error);
      showToast('Error al conectar con la base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle para autorizar o revocar la edición al alumno
  const handleToggleEditPermission = async (client) => {
    const currentPermiso = Boolean(client.fichaMedica?.permitir_edicion);
    const nuevoPermiso = !currentPermiso;
    
    try {
      setTogglingId(client.id);
      const updated = await dataService.setMedicalRecordEditPermission(client.id, nuevoPermiso);
      
      setClientsWithRecords(prev =>
        prev.map(c => {
          if (c.id === client.id) {
            return {
              ...c,
              fichaMedica: {
                ...(c.fichaMedica || updated),
                permitir_edicion: nuevoPermiso
              }
            };
          }
          return c;
        })
      );

      if (selectedRecordClient?.id === client.id) {
        setSelectedRecordClient(prev => ({
          ...prev,
          fichaMedica: {
            ...(prev.fichaMedica || {}),
            permitir_edicion: nuevoPermiso
          }
        }));
      }

      showToast(
        nuevoPermiso 
          ? `Edición autorizada para ${client.nombre_completo}` 
          : `Permiso de edición revocado para ${client.nombre_completo}`,
        'success'
      );
    } catch (err) {
      console.error('Error modificando permiso de edición:', err);
      showToast('No se pudo actualizar el permiso', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // 2. Métricas de tarjetas superiores recalculadas con estaCompleta
  const totalAlumnos = clientsWithRecords.length;
  const completadasCount = clientsWithRecords.filter(c => c.estaCompleta).length;
  const pendientesCount = clientsWithRecords.filter(c => !c.estaCompleta).length;

  // Filtrado y búsqueda
  const filteredClients = useMemo(() => {
    return clientsWithRecords.filter(c => {
      const matchSearch = (c.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.plan_actual || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'completadas') return matchSearch && c.estaCompleta;
      if (statusFilter === 'pendientes') return matchSearch && !c.estaCompleta;
      return matchSearch;
    });
  }, [clientsWithRecords, searchTerm, statusFilter]);

  // Generador de enlace WhatsApp para reclamo de ficha médica
  const buildWhatsAppReminderUrl = (client) => {
    const phone = (client.telefono || '').replace(/[^0-9]/g, '');
    let cleanPhone = phone;
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('54')) {
      cleanPhone = `549${cleanPhone}`;
    }
    const nombre = (client.nombre_completo || 'atleta').split(' ')[0];
    const mensaje = `Hola ${nombre}, completá tu ficha médica en la app para poder habilitar tu rutina de entrenamiento 💪🏼`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 relative animate-in fade-in">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === 'error'
            ? 'bg-red-950/90 border-red-700 text-red-200'
            : 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
        }`}>
          <span>{toastMessage.text}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-brand-light shrink-0">
              <HeartPulse className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Control de Fichas Médicas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Supervisión integral de lesiones, patologías previas y autorizaciones de edición para los alumnos.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMedicalRecords}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white text-xs font-bold border border-dark-700 transition-all flex items-center gap-2 self-start sm:self-auto active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* 2. TARJETAS DE RESUMEN METRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Total Alumnos */}
        <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700/80 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Total Alumnos
            </span>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {totalAlumnos}
            </p>
            <span className="text-[11px] text-gray-400 font-medium">Directorio activo</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Fichas Completadas */}
        <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700/80 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              Fichas Completadas
            </span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {completadasCount}
            </p>
            <span className="text-[11px] text-emerald-400/80 font-medium">
              {totalAlumnos > 0 ? `${Math.round((completadasCount / totalAlumnos) * 100)}% de cobertura` : '0%'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Fichas Pendientes */}
        <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700/80 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
              Fichas Pendientes
            </span>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {pendientesCount}
            </p>
            <span className="text-[11px] text-amber-400/80 font-medium">Requieren onboarding</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 3. BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTRO */}
      <div className="card-dark rounded-2xl p-4 border border-dark-700/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o plan de entrenamiento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-all"
          />
        </div>

        {/* Selector de Estado */}
        <div className="flex items-center gap-1.5 bg-dark-900 p-1 rounded-xl border border-dark-700 shrink-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'completadas', label: 'Completas' },
            { id: 'pendientes', label: 'Pendientes' }
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand text-white shadow-glow-red'
                    : 'text-gray-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* 4. TABLA / LISTADO DE ALUMNOS Y FICHAS */}
      <div className="card-dark rounded-2xl border border-dark-700/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand animate-spin mx-auto" />
            <p className="text-xs text-gray-400 font-medium">Cargando fichas médicas de los alumnos...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <HeartPulse className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="text-sm font-bold text-gray-300">No se encontraron alumnos</p>
            <p className="text-xs text-gray-500">Prueba ajustando los filtros o el término de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-900/60 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4 sm:px-5">Alumno</th>
                  <th className="py-3.5 px-4">Estado Ficha</th>
                  <th className="py-3.5 px-4">Lesiones / Molestias</th>
                  <th className="py-3.5 px-4 text-center">Permiso Edición</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-750 text-xs text-gray-200">
                {filteredClients.map((client) => {
                  const record = client.fichaMedica;
                  const isCompletada = Boolean(client.estaCompleta);
                  const permitirEdicion = Boolean(record?.permitir_edicion);
                  const isToggling = togglingId === client.id;

                  // Filtrar lesiones válidas (excluir 'Ninguna' si vino mezclado)
                  const lesionesValidas = Array.isArray(record?.lesiones)
                    ? record.lesiones.filter(z => z && z !== 'Ninguna')
                    : [];

                  return (
                    <tr 
                      key={client.id}
                      className="hover:bg-dark-850/60 transition-colors"
                    >
                      {/* 1. Alumno: Avatar + Nombre + Plan */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <ClientAvatar
                            client={client}
                            size="md"
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-dark-700 shadow-sm"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">
                              {client.nombre_completo}
                            </p>
                            <span className="text-[11px] text-gray-400 block truncate">
                              {client.plan_actual || 'Plan Personalizado'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Estado de la Ficha */}
                      <td className="py-3.5 px-4">
                        {isCompletada ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Completa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* 3. Lesiones reportadas o Sin lesiones */}
                      <td className="py-3.5 px-4">
                        {!isCompletada ? (
                          <span className="text-[11px] text-gray-500 italic">
                            Pendiente de completar
                          </span>
                        ) : lesionesValidas.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {lesionesValidas.map((zona, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-950/70 text-red-300 border border-red-500/40 shrink-0"
                              >
                                ⚠️ {zona}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                            ✅ Sin lesiones
                          </span>
                        )}
                      </td>

                      {/* 4. Toggle Permiso de Edición */}
                      <td className="py-3.5 px-4 text-center">
                        {isCompletada ? (
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleEditPermission(client)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              permitirEdicion
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
                            } disabled:opacity-50`}
                            title={permitirEdicion ? 'Haz clic para revocar permiso' : 'Haz clic para autorizar al alumno a editar'}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : permitirEdicion ? (
                              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{permitirEdicion ? 'Autorizada' : 'Bloqueada'}</span>
                          </button>
                        ) : (
                          <span className="text-gray-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* 5. Acciones */}
                      <td className="py-3.5 px-4 sm:px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isCompletada ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecordClient(client);
                                setIsDetailModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-200 hover:text-white text-xs font-bold border border-dark-700 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5 text-brand-light" />
                              <span>Ver Ficha</span>
                            </button>
                          ) : (
                            <a
                              href={buildWhatsAppReminderUrl(client)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                              title="Enviar recordatorio por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Reclamar Ficha</span>
                            </a>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 5. MODAL DE DETALLE COMPLETO DE FICHA MÉDICA               */}
      {/* ========================================================== */}
      {isDetailModalOpen && selectedRecordClient && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl p-5 sm:p-6 my-auto text-left space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <ClientAvatar
                  client={selectedRecordClient}
                  size="lg"
                  className="w-12 h-12 rounded-full object-cover border-2 border-brand/50"
                />
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {selectedRecordClient.nombre_completo}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Ficha de Salud y Antecedentes • {selectedRecordClient.plan_actual || 'Plan Personalizado'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white bg-gray-800 border border-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido de la Ficha */}
            <div className="space-y-4 text-xs">
              
              {/* Zonas de Molestias o Lesiones */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  1. Zonas con Molestias o Lesiones
                </span>
                {(() => {
                  const record = selectedRecordClient.fichaMedica;
                  const lesionesValidas = Array.isArray(record?.lesiones)
                    ? record.lesiones.filter(z => z && z !== 'Ninguna')
                    : [];

                  if (lesionesValidas.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-2">
                        {lesionesValidas.map((zona, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1 rounded-xl font-bold bg-red-950/70 text-red-300 border border-red-500/40 flex items-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>⚠️ {zona}</span>
                          </span>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>El alumno declaró no tener lesiones ni molestias articulares.</span>
                    </div>
                  );
                })()}
              </div>

              {/* Detalle descriptivo */}
              <div className="space-y-1.5 bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  2. Detalle de Lesiones o Dolores al Moverse
                </span>
                <p className="text-gray-200 leading-relaxed font-medium">
                  {selectedRecordClient.fichaMedica?.detalle_lesiones || 'Sin detalles adicionales especificados.'}
                </p>
              </div>

              {/* Condiciones de Salud Crónicas */}
              <div className="space-y-1.5 bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  3. Condiciones de Salud (Asma, Hipertensión, Diabetes, etc.)
                </span>
                <p className="text-white font-medium">
                  {selectedRecordClient.fichaMedica?.condiciones_cronicas || 'Ninguna condición crónica reportada.'}
                </p>
              </div>

              {/* Alergias y Medicación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    4. Alergias
                  </span>
                  <p className="text-white font-medium">
                    {selectedRecordClient.fichaMedica?.alergias || 'Ninguna alergia registrada.'}
                  </p>
                </div>

                <div className="space-y-1.5 bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    5. Medicamentos Diarios
                  </span>
                  <p className="text-white font-medium">
                    {selectedRecordClient.fichaMedica?.medicamentos || 'No consume medicación diaria.'}
                  </p>
                </div>
              </div>

              {/* Declaración Jurada y Fecha */}
              <div className="pt-2 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Declaración jurada de aptitud firmada digitalmente
                </span>
                {selectedRecordClient.fichaMedica?.actualizado_el && (
                  <span>
                    Actualizada: {selectedRecordClient.fichaMedica.actualizado_el.split('T')[0]}
                  </span>
                )}
              </div>

            </div>

            {/* Acciones del Modal */}
            <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleToggleEditPermission(selectedRecordClient)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedRecordClient.fichaMedica?.permitir_edicion
                    ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:text-white'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                {selectedRecordClient.fichaMedica?.permitir_edicion ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Revocar permiso de edición</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Autorizar al alumno a editar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase transition-all shadow-glow-red"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
