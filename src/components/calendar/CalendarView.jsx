import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import ClientAvatar from '../common/ClientAvatar';

export default function CalendarView() {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [viewMode, setViewMode] = useState('semana'); // 'mes' | 'semana' | 'dia'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState([]);

  // Formulario nuevo turno
  const [formData, setFormData] = useState({
    client_id: '',
    fecha: '2026-11-04',
    hora_inicio: '09:00',
    hora_fin: '10:00',
    tipo: 'Presencial',
    notas: ''
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const list = await dataService.getAppointments();
    const cliList = await dataService.getClients();
    setAppointments(list);
    setClients(cliList);
    if (list.length > 0 && !selectedAppointment) {
      setSelectedAppointment(list[0]);
    }
    if (cliList.length > 0 && !formData.client_id) {
      setFormData(prev => ({ ...prev, client_id: cliList[0].id }));
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formData.client_id);
    const newApt = await dataService.addAppointment({
      client_id: formData.client_id,
      client_name: client?.nombre_completo || 'Alumno',
      fecha_hora_inicio: `${formData.fecha}T${formData.hora_inicio}:00`,
      fecha_hora_fin: `${formData.fecha}T${formData.hora_fin}:00`,
      tipo: formData.tipo,
      notas: formData.notas
    });

    setAppointments([newApt, ...appointments]);
    setSelectedAppointment(newApt);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* HEADER & SELECTOR DE VISTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-brand" />
            Agenda & Calendario de Turnos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Diferenciación entre sesiones presenciales en gimnasio y asesorías online.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Mes, Semana, Día */}
          <div className="flex p-1 bg-dark-850 border border-dark-700 rounded-xl text-xs font-semibold">
            {['mes', 'semana', 'dia'].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  viewMode === m
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Turno</span>
          </button>
        </div>
      </div>

      {/* GRID DE CALENDARIO + PANEL LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LISTA / GRILLA DE TURNOS (8 COLUMNAS) */}
        <div className="lg:col-span-8 card-dark rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">Noviembre 2026</span>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded bg-dark-900 border border-dark-700 text-gray-400 hover:text-white">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-1 rounded bg-dark-900 border border-dark-700 text-gray-400 hover:text-white">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-brand"></span> Presencial
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Online
              </span>
            </div>
          </div>

          {/* Turnos Programados */}
          <div className="space-y-3">
            {appointments.map((apt) => {
              const isSelected = selectedAppointment?.id === apt.id;
              const isPresencial = apt.tipo === 'Presencial';
              const aptClient = clients.find(c => c.id === apt.client_id || c.nombre_completo === apt.client_name);

              return (
                <div
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-dark-800 border-brand shadow-glow-red/20'
                      : 'bg-dark-900 border-dark-700/80 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-1.5 self-stretch rounded-full shrink-0 ${isPresencial ? 'bg-brand' : 'bg-blue-500'}`} />
                    <ClientAvatar
                      client={aptClient}
                      name={apt.client_name}
                      size="sm"
                      rounded="rounded-xl"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{apt.client_name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isPresencial
                            ? 'bg-brand/10 text-brand-light border border-brand/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {apt.tipo}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {apt.fecha_hora_inicio.replace('T', ' • ').slice(0, 18)} hs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {apt.estado}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL LATERAL DE DETALLES DEL TURNO (4 COLUMNAS) */}
        {selectedAppointment && (
          <div className="lg:col-span-4 card-dark rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white pb-3 border-b border-dark-700">
              Detalle del Turno
            </h3>

            {/* Alumno con Avatar */}
            {(() => {
              const selClient = clients.find(c => c.id === selectedAppointment.client_id || c.nombre_completo === selectedAppointment.client_name);
              return (
                <div className="flex items-center gap-3 pb-3 border-b border-dark-700/80">
                  <ClientAvatar
                    client={selClient}
                    name={selectedAppointment.client_name}
                    size="lg"
                    showStatus={true}
                    status={selClient?.estado || 'Activo'}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Alumno</span>
                    <p className="text-sm font-bold text-white truncate">{selectedAppointment.client_name}</p>
                    {selClient?.access_code && (
                      <span className="font-mono text-[10px] text-brand-light font-bold">
                        {selClient.access_code}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3 text-xs">

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Modalidad</span>
                <p className="text-xs font-semibold text-white mt-0.5 flex items-center gap-1.5">
                  {selectedAppointment.tipo === 'Presencial' ? (
                    <MapPin className="w-4 h-4 text-brand" />
                  ) : (
                    <Video className="w-4 h-4 text-blue-400" />
                  )}
                  {selectedAppointment.tipo}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Horario</span>
                <p className="text-xs font-semibold text-white mt-0.5">
                  {selectedAppointment.fecha_hora_inicio.replace('T', ' a las ')} hs
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Planificación / Notas</span>
                <p className="text-xs text-gray-300 mt-0.5 bg-dark-900 p-2.5 rounded-lg border border-dark-700">
                  {selectedAppointment.notas || 'Sin notas especiales para esta sesión.'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red transition-all">
                Iniciar Registro de Sesión
              </button>
              <button className="w-full py-2 rounded-xl bg-dark-900 hover:bg-dark-800 text-gray-400 hover:text-white border border-dark-700 text-xs font-semibold">
                Reprogramar o Cancelar
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL NUEVO TURNO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[92vh] sm:max-h-[85vh] flex flex-col p-5 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand" />
                Agendar Turno de Entrenamiento
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3 pb-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Alumno</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Tipo</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Hora Inicio</label>
                    <input
                      type="time"
                      required
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Hora Fin</label>
                    <input
                      type="time"
                      required
                      value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Objetivo del Turno</label>
                  <input
                    type="text"
                    placeholder="Ej: Piernas / Fuerza máxima"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-dark-700/80 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-dark-800 hover:text-white border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red min-h-[44px]"
                >
                  Guardar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
