import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  Plus, 
  User, 
  CheckCircle, 
  AlertCircle, 
  X,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Check,
  Activity,
  MessageCircle,
  Search,
  ChevronDown,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { supabase } from '../../lib/supabase';
import ClientAvatar from '../common/ClientAvatar';

export default function CalendarView() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Filtros de fecha y modo de vista
  const [viewMode, setViewMode] = useState('todos'); // 'todos' | 'dia' | 'semana' | 'mes'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal para crear / editar turno
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingAptId, setEditingAptId] = useState(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    client_id: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fin: '10:00',
    tipo: 'Presencial', // 'Presencial' | 'Online' | 'Evaluación'
    notas: '',
    estado: 'Confirmado'
  });

  // Carga inicial y suscripción Realtime a Supabase
  useEffect(() => {
    loadData();

    // Sincronización Realtime con Supabase
    const channel = supabase
      .channel('realtime_appointments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          loadData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [aptList, cliList] = await Promise.all([
        dataService.getAppointments(),
        dataService.getClients()
      ]);

      setAppointments(aptList || []);
      setClients(cliList || []);

      // Mantener o seleccionar turno
      if (aptList && aptList.length > 0) {
        setSelectedAppointment(prev => {
          if (!prev) return aptList[0];
          const found = aptList.find(a => a.id === prev.id);
          return found || aptList[0];
        });
      } else {
        setSelectedAppointment(null);
      }
    } catch (err) {
      console.error('[CalendarView] Error cargando datos de agenda:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  // Cálculo de rango de semana (Lunes a Domingo)
  const getWeekRange = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // lunes
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  // Filtrado de turnos según el modo de vista y la fecha seleccionada
  const filteredAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];

    if (viewMode === 'todos') {
      return appointments;
    }

    if (viewMode === 'dia') {
      return appointments.filter(apt => {
        const aptDate = (apt.fecha_hora_inicio || '').slice(0, 10);
        return aptDate === selectedDate;
      });
    }

    if (viewMode === 'semana') {
      const { start, end } = getWeekRange(selectedDate);
      return appointments.filter(apt => {
        const aptDate = (apt.fecha_hora_inicio || '').slice(0, 10);
        return aptDate >= start && aptDate <= end;
      });
    }

    if (viewMode === 'mes') {
      const monthPrefix = selectedDate.slice(0, 7); // YYYY-MM
      return appointments.filter(apt => {
        const aptDate = (apt.fecha_hora_inicio || '').slice(0, 10);
        return aptDate.startsWith(monthPrefix);
      });
    }

    return appointments;
  }, [appointments, viewMode, selectedDate]);

  // Navegación de fecha
  const handleDateShift = (direction) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    if (viewMode === 'dia' || viewMode === 'todos') {
      date.setDate(date.getDate() + (direction * 1));
    } else if (viewMode === 'semana') {
      date.setDate(date.getDate() + (direction * 7));
    } else if (viewMode === 'mes') {
      date.setMonth(date.getMonth() + direction);
    }

    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleJumpToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Apertura del modal en modo Crear
  const handleOpenCreateModal = (defaultDate = null) => {
    const targetDate = defaultDate || selectedDate || new Date().toISOString().split('T')[0];
    const firstClient = clients[0]?.id || '';
    setFormData({
      client_id: firstClient,
      fecha: targetDate,
      hora_inicio: '09:00',
      hora_fin: '10:00',
      tipo: 'Presencial',
      notas: '',
      estado: 'Confirmado'
    });
    setEditingAptId(null);
    setModalMode('create');
    setClientSearchQuery('');
    setIsClientPickerOpen(false);
    setIsModalOpen(true);
  };

  // Apertura del modal en modo Editar
  const handleOpenEditModal = (apt) => {
    const inicioParts = (apt.fecha_hora_inicio || '').split('T');
    const finParts = (apt.fecha_hora_fin || '').split('T');
    const fecha = inicioParts[0] || selectedDate;
    const hora_inicio = (inicioParts[1] || '09:00').slice(0, 5);
    const hora_fin = (finParts[1] || '10:00').slice(0, 5);

    setFormData({
      client_id: apt.client_id || '',
      fecha,
      hora_inicio,
      hora_fin,
      tipo: apt.tipo_detalle || apt.tipo || 'Presencial',
      notas: apt.notas || '',
      estado: apt.estado || 'Confirmado'
    });
    setEditingAptId(apt.id);
    setModalMode('edit');
    setClientSearchQuery('');
    setIsClientPickerOpen(false);
    setIsModalOpen(true);
  };

  // Envío del formulario (Crear o Editar con Supabase en tiempo real)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      alert('Por favor selecciona un alumno para agendar el turno.');
      return;
    }

    setActionLoading(true);
    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const clientName = selectedClient?.nombre_completo || 'Alumno';

      const fechaHoraInicio = `${formData.fecha}T${formData.hora_inicio}:00`;
      const fechaHoraFin = `${formData.fecha}T${formData.hora_fin}:00`;

      if (modalMode === 'create') {
        const newApt = await dataService.addAppointment({
          client_id: formData.client_id,
          client_name: clientName,
          fecha_hora_inicio: fechaHoraInicio,
          fecha_hora_fin: fechaHoraFin,
          tipo: formData.tipo,
          notas: formData.notas,
          estado: formData.estado || 'Confirmado'
        });

        await loadData(false);
        if (newApt) setSelectedAppointment(newApt);
      } else {
        const updated = await dataService.updateAppointment(editingAptId, {
          client_id: formData.client_id,
          fecha_hora_inicio: fechaHoraInicio,
          fecha_hora_fin: fechaHoraFin,
          tipo: formData.tipo,
          notas: formData.notas,
          estado: formData.estado
        });

        await loadData(false);
        if (updated) setSelectedAppointment(updated);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('[CalendarView] Error guardando turno:', err);
      alert('No se pudo guardar el turno. Verifica la conexión con Supabase.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancelar turno
  const handleCancelAppointment = async (aptId) => {
    if (!window.confirm('¿Seguro que deseas cancelar este turno?')) return;
    setActionLoading(true);
    try {
      const updated = await dataService.cancelAppointment(aptId);
      await loadData(false);
      if (updated) setSelectedAppointment(updated);
    } catch (err) {
      console.error('[CalendarView] Error cancelando turno:', err);
      alert('No se pudo cancelar el turno.');
    } finally {
      setActionLoading(false);
    }
  };

  // Marcar como completado
  const handleCompleteAppointment = async (aptId) => {
    setActionLoading(true);
    try {
      const updated = await dataService.updateAppointment(aptId, { estado: 'Completado' });
      await loadData(false);
      if (updated) setSelectedAppointment(updated);
    } catch (err) {
      console.error('[CalendarView] Error completando turno:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar turno
  const handleDeleteAppointment = async (aptId) => {
    if (!window.confirm('¿Seguro que deseas eliminar definitivamente este turno de la base de datos?')) return;
    setActionLoading(true);
    try {
      await dataService.deleteAppointment(aptId);
      setSelectedAppointment(null);
      await loadData(false);
    } catch (err) {
      console.error('[CalendarView] Error eliminando turno:', err);
      alert('No se pudo eliminar el turno.');
    } finally {
      setActionLoading(false);
    }
  };

  // Formateador de fecha en español
  const formatHeaderDate = () => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);

      if (viewMode === 'dia') {
        return date.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }

      if (viewMode === 'semana') {
        const { start, end } = getWeekRange(selectedDate);
        const [sy, sm, sd] = start.split('-').map(Number);
        const [ey, em, ed] = end.split('-').map(Number);
        const sDate = new Date(sy, sm - 1, sd);
        const eDate = new Date(ey, em - 1, ed);
        return `${sDate.getDate()} de ${sDate.toLocaleDateString('es-ES', { month: 'short' })} - ${eDate.getDate()} de ${eDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
      }

      if (viewMode === 'mes') {
        return date.toLocaleDateString('es-ES', {
          month: 'long',
          year: 'numeric'
        });
      }

      return 'Todos los turnos programados';
    } catch {
      return selectedDate;
    }
  };

  // Filtro de clientes en el selector
  const filteredClientsForPicker = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c => 
      c.nombre_completo.toLowerCase().includes(q) ||
      (c.access_code && c.access_code.toLowerCase().includes(q))
    );
  }, [clients, clientSearchQuery]);

  const currentFormClient = clients.find(c => c.id === formData.client_id);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* ========================================================= */}
      {/* HEADER PRINCIPAL Y ACCIONES                               */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-brand" />
            Agenda & Calendario de Turnos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Gestión en tiempo real de sesiones presenciales, asesorías online y evaluaciones físicas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Selector de Modo de Vista */}
          <div className="flex p-1 bg-dark-850 border border-dark-700/80 rounded-xl text-xs font-semibold">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'dia', label: 'Día' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setViewMode(m.id)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all min-h-[36px] ${
                  viewMode === m.id
                    ? 'bg-brand text-white shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Botón "+ Agendar Turno" */}
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agendar Turno</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BARRA DE NAVEGACIÓN DE FECHAS                             */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-dark-850 border border-dark-700/80 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDateShift(-1)}
            title="Anterior"
            className="p-2 rounded-xl bg-dark-900 border border-dark-700 text-gray-300 hover:text-white hover:border-brand/40 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleJumpToToday}
            className="px-3 py-2 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-bold text-gray-200 hover:text-white transition-all min-h-[40px]"
          >
            Hoy
          </button>

          <button
            onClick={() => handleDateShift(1)}
            title="Siguiente"
            className="p-2 rounded-xl bg-dark-900 border border-dark-700 text-gray-300 hover:text-white hover:border-brand/40 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="ml-1 sm:ml-2">
            <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">
              {viewMode === 'todos' ? 'Vista General' : `Filtrando por ${viewMode}`}
            </span>
            <span className="text-sm sm:text-base font-bold text-white capitalize">
              {formatHeaderDate()}
            </span>
          </div>
        </div>

        {/* Selector directo de fecha y badges informativos */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand min-h-[40px]"
          />

          <span className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-dark-900 text-gray-300 border border-dark-700">
            {filteredAppointments.length} {filteredAppointments.length === 1 ? 'turno' : 'turnos'}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* GRID PRINCIPAL: LISTA DE TURNOS + DETALLE LATERAL         */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (8 COLUMNAS): LISTADO O EMPTY STATE */}
        <div className="lg:col-span-8 card-dark rounded-2xl p-4 sm:p-6 space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-dark-700/80">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand" />
              Sesiones Programadas
            </h2>

            {/* Leyenda de modalidades */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-brand"></span> Presencial
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Online
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Evaluación
              </span>
            </div>
          </div>

          {/* SPINNER DE CARGA */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
              <p className="text-xs text-gray-400">Cargando turnos de Supabase...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            
            /* ========================================================= */
            /* 2. ESTADO VACÍO (EMPTY STATE) ELEGANTE SOLICITADO          */
            /* ========================================================= */
            <div className="py-14 sm:py-16 px-4 sm:px-6 text-center rounded-2xl bg-dark-900/60 border border-dashed border-dark-700/80 flex flex-col items-center justify-center my-2">
              <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4 text-brand shadow-inner">
                <CalendarIcon className="w-8 h-8 opacity-75" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">
                Sin turnos programados
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
                No tienes citas agendadas para esta fecha. Usa el botón superior para agendar una nueva sesión.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agendar Turno</span>
              </button>
            </div>

          ) : (

            /* LISTADO DE TURNOS REALES */
            <div className="space-y-3">
              {filteredAppointments.map((apt) => {
                const isSelected = selectedAppointment?.id === apt.id;
                const client = apt.client || clients.find(c => c.id === apt.client_id);
                const displayType = apt.tipo_detalle || apt.tipo || 'Presencial';
                const isOnline = displayType === 'Online';
                const isEvaluacion = displayType === 'Evaluación' || (apt.notas && apt.notas.toLowerCase().includes('evaluación'));

                const typeColor = isEvaluacion ? 'bg-amber-500' : isOnline ? 'bg-blue-500' : 'bg-brand';
                const typeBadgeColor = isEvaluacion 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : isOnline
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-brand/10 text-brand-light border-brand/20';

                const fechaStr = (apt.fecha_hora_inicio || '').slice(0, 10);
                const horaInicio = (apt.fecha_hora_inicio || '').split('T')[1]?.slice(0, 5) || '09:00';
                const horaFin = (apt.fecha_hora_fin || '').split('T')[1]?.slice(0, 5) || '10:00';

                const isCancelado = apt.estado === 'Cancelado';
                const isCompletado = apt.estado === 'Completado';

                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                      isSelected
                        ? 'bg-dark-800 border-brand shadow-glow-red/20'
                        : 'bg-dark-900 border-dark-700/80 hover:border-dark-600'
                    } ${isCancelado ? 'opacity-60 bg-dark-950/60' : ''}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-1.5 self-stretch rounded-full shrink-0 ${typeColor}`} />
                      
                      <ClientAvatar
                        client={client}
                        name={apt.client_name}
                        size="md"
                        rounded="rounded-xl"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white truncate max-w-[200px]">
                            {apt.client_name}
                          </h3>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeBadgeColor}`}>
                            {displayType}
                          </span>

                          {client?.access_code && (
                            <span className="font-mono text-[10px] text-gray-400 font-semibold">
                              {client.access_code}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>{fechaStr} • {horaInicio} a {horaFin} hs</span>
                          {apt.notas && (
                            <span className="text-[11px] text-gray-400 truncate max-w-[200px] hidden sm:inline">
                              — {apt.notas}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                        isCompletado
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : isCancelado
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {apt.estado || 'Confirmado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA (4 COLUMNAS): DETALLE Y ACCIONES          */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 card-dark rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-700/80">
            <h3 className="text-base font-bold text-white">
              Detalle de la Sesión
            </h3>
            {selectedAppointment && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedAppointment)}
                  title="Editar Turno"
                  className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-700 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                  title="Eliminar Turno"
                  className="p-1.5 rounded-lg bg-dark-800 hover:bg-red-950 text-gray-400 hover:text-red-400 border border-dark-700 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {!selectedAppointment ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <CalendarIcon className="w-8 h-8 mx-auto opacity-30 text-gray-500" />
              <p className="text-xs">
                Selecciona un turno de la lista para ver los detalles, registrar asistencia o reprogramar.
              </p>
            </div>
          ) : (
            (() => {
              const apt = selectedAppointment;
              const client = apt.client || clients.find(c => c.id === apt.client_id);
              const displayType = apt.tipo_detalle || apt.tipo || 'Presencial';
              const isOnline = displayType === 'Online';
              const isEvaluacion = displayType === 'Evaluación';

              const fechaStr = (apt.fecha_hora_inicio || '').slice(0, 10);
              const horaInicio = (apt.fecha_hora_inicio || '').split('T')[1]?.slice(0, 5) || '09:00';
              const horaFin = (apt.fecha_hora_fin || '').split('T')[1]?.slice(0, 5) || '10:00';

              return (
                <div className="space-y-4">
                  
                  {/* Ficha Alumno */}
                  <div className="flex items-center gap-3.5 p-3 rounded-xl bg-dark-900 border border-dark-700/80">
                    <ClientAvatar
                      client={client}
                      name={apt.client_name}
                      size="lg"
                      showStatus={true}
                      status={client?.estado || 'Activo'}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                        Alumno Asignado
                      </span>
                      <p className="text-sm font-bold text-white truncate">
                        {apt.client_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {client?.access_code && (
                          <span className="font-mono text-[10px] text-brand-light font-bold bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">
                            {client.access_code}
                          </span>
                        )}
                        {client?.telefono && (
                          <a
                            href={`https://wa.me/${client.telefono.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Datos del Turno */}
                  <div className="space-y-3 text-xs bg-dark-900/60 p-4 rounded-xl border border-dark-700/60">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Modalidad</span>
                      <p className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5">
                        {isEvaluacion ? (
                          <Activity className="w-4 h-4 text-amber-400" />
                        ) : isOnline ? (
                          <Video className="w-4 h-4 text-blue-400" />
                        ) : (
                          <MapPin className="w-4 h-4 text-brand" />
                        )}
                        <span>{displayType}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Horario Programado</span>
                      <p className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{fechaStr} • {horaInicio} a {horaFin} hs</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Estado</span>
                      <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                        apt.estado === 'Completado'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : apt.estado === 'Cancelado'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {apt.estado || 'Confirmado'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Notas / Objetivos</span>
                      <div className="text-xs text-gray-300 mt-1 bg-dark-900 p-2.5 rounded-lg border border-dark-700">
                        {apt.notas || 'Sin notas especiales para esta sesión.'}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="pt-2 flex flex-col gap-2">
                    {apt.estado !== 'Completado' && (
                      <button
                        onClick={() => handleCompleteAppointment(apt.id)}
                        disabled={actionLoading}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <Check className="w-4 h-4" />
                        <span>Marcar como Completado</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(apt)}
                      disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-200 font-bold text-xs border border-dark-700 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Edit3 className="w-4 h-4 text-brand-light" />
                      <span>Editar Turno</span>
                    </button>

                    {apt.estado !== 'Cancelado' && (
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        disabled={actionLoading}
                        className="w-full py-2 rounded-xl bg-dark-900 hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-dark-700 text-xs font-semibold transition-all min-h-[40px]"
                      >
                        Cancelar Turno
                      </button>
                    )}
                  </div>

                </div>
              );
            })()
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR / EDITAR TURNO                           */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative">
            
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-brand" />
                <span>{modalMode === 'create' ? 'Agendar Nuevo Turno' : 'Editar Turno Programado'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario Scrolleable */}
            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-4 pb-2">
                
                {/* SELECTOR DE ALUMNO (CON FOTO Y NOMBRE DE TABLA CLIENTS) */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                    Alumno Asignado *
                  </label>

                  {/* Selector visual desplegable */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsClientPickerOpen(!isClientPickerOpen)}
                      className="w-full bg-dark-900 border border-dark-700 hover:border-brand/40 rounded-xl p-2.5 text-left flex items-center justify-between min-h-[48px] transition-all"
                    >
                      {currentFormClient ? (
                        <div className="flex items-center gap-3 min-w-0">
                          <ClientAvatar
                            client={currentFormClient}
                            name={currentFormClient.nombre_completo}
                            size="sm"
                            rounded="rounded-lg"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {currentFormClient.nombre_completo}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              {currentFormClient.access_code} • {currentFormClient.modalidad || 'Presencial'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Seleccionar Alumno de Supabase...</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>

                    {/* Menú desplegable con buscador de alumnos */}
                    {isClientPickerOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-2 z-30 max-h-60 flex flex-col">
                        <div className="relative mb-2 shrink-0">
                          <input
                            type="text"
                            placeholder="Buscar alumno por nombre o código..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand"
                            autoFocus
                          />
                          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                        </div>

                        <div className="overflow-y-auto no-scrollbar space-y-1 flex-1">
                          {filteredClientsForPicker.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">
                              No se encontraron alumnos.
                            </p>
                          ) : (
                            filteredClientsForPicker.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, client_id: c.id });
                                  setIsClientPickerOpen(false);
                                }}
                                className={`w-full p-2 rounded-lg flex items-center gap-2.5 text-left transition-all ${
                                  formData.client_id === c.id
                                    ? 'bg-brand/20 border border-brand/40 text-white'
                                    : 'hover:bg-dark-800 text-gray-300'
                                }`}
                              >
                                <ClientAvatar client={c} name={c.nombre_completo} size="xs" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate text-white">{c.nombre_completo}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{c.access_code}</p>
                                </div>
                                {formData.client_id === c.id && (
                                  <Check className="w-4 h-4 text-brand shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FECHA Y TIPO DE SESIÓN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                      Fecha del Turno *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                      Tipo de Sesión *
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand min-h-[44px]"
                    >
                      <option value="Presencial">Presencial (Entrenamiento)</option>
                      <option value="Online">Online (Asesoría / Chequeo)</option>
                      <option value="Evaluación">Evaluación Física / Medidas</option>
                    </select>
                  </div>
                </div>

                {/* HORA INICIO Y FIN */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                      Hora Inicio *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                      Hora Fin *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                  </div>
                </div>

                {/* ESTADO DEL TURNO (SI ES EDICIÓN) */}
                {modalMode === 'edit' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                      Estado del Turno
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Confirmado', 'Completado', 'Cancelado'].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFormData({ ...formData, estado: st })}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                            formData.estado === st
                              ? st === 'Confirmado'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                                : st === 'Completado'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                                  : 'bg-red-500/20 text-red-300 border-red-500'
                              : 'bg-dark-900 text-gray-400 border-dark-700'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* NOTAS Y OBJETIVOS */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                    Notas y Objetivos de la Sesión
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Medición de pliegues y peso, corregir técnica de sentadilla profunda, subir carga en press plano..."
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand resize-none"
                  />
                </div>

              </div>

              {/* Botones de Acción Fijos */}
              <div className="sticky bottom-0 bg-dark-850 pt-3 pb-1 border-t border-dark-700/80 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-dark-800 hover:text-white border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red transition-all flex items-center gap-2 min-h-[44px]"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Guardar Turno' : 'Actualizar Turno'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}