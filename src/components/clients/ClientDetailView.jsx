import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  Edit3, 
  Phone, 
  Mail, 
  Calendar, 
  Target, 
  CreditCard, 
  TrendingUp, 
  Dumbbell, 
  FileText, 
  CheckCircle2, 
  Plus, 
  ArrowDownRight, 
  ArrowUpRight, 
  Scale, 
  Ruler, 
  Clock, 
  Activity, 
  Award, 
  X, 
  Save, 
  ChevronRight,
  AlertCircle,
  Trash2,
  ExternalLink,
  HeartPulse
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { dataService } from '../../services/dataService';
import ClientAvatar from '../common/ClientAvatar';
import ClientPhotoUploader from '../common/ClientPhotoUploader';
import MedicalRecordViewOnly from '../medical/MedicalRecordViewOnly';

export default function ClientDetailView({ client: initialClient, onBack, onUpdateClient, onCreateRoutine }) {
  const [client, setClient] = useState(initialClient);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(null);

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'rutinas' | 'progreso' | 'pagos' | 'salud' | 'notas'
  const [evaluations, setEvaluations] = useState([]);
  const [routine, setRoutine] = useState(null);
  const [libraryRoutines, setLibraryRoutines] = useState([]);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [isAuthorizingMedicalEdit, setIsAuthorizingMedicalEdit] = useState(false);
  const [isAssignExistingModalOpen, setIsAssignExistingModalOpen] = useState(false);
  const [isAssigningRoutine, setIsAssigningRoutine] = useState(false);
  const [routineStartDate, setRoutineStartDate] = useState(null);
  const [weeklySessions, setWeeklySessions] = useState([]);
  const [totalSessions, setTotalSessions] = useState([]);
  const [clientAppointments, setClientAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notesText, setNotesText] = useState(client?.notas || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Modal Editar Perfil
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editPhotoRemoved, setEditPhotoRemoved] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isAssignRoutineOpen, setIsAssignRoutineOpen] = useState(false);
  const [catalogExercises, setCatalogExercises] = useState([]);
  const [newRoutineTitle, setNewRoutineTitle] = useState('Rutina Personalizada');
  const [selectedExForRoutine, setSelectedExForRoutine] = useState([]);
  const [editFormData, setEditFormData] = useState({
    nombre_completo: client?.nombre_completo || '',
    telefono: client?.telefono || '',
    email: client?.email || '',
    edad: client?.edad || '',
    altura: client?.altura || '',
    modalidad: client?.modalidad || 'Presencial',
    objetivo: client?.objetivo || '',
    estado: client?.estado || 'Activo',
    plan_actual: client?.plan_actual || 'Presencial',
    dias_por_semana: client?.dias_por_semana || 3,
    dias_asignados: client?.dias_asignados || ['Lunes', 'Miércoles', 'Viernes'],
    tipo_planificacion: client?.tipo_planificacion || 'Semanal',
    duracion_sesion_min: client?.duracion_sesion_min || 60
  });

  const ALL_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const toggleEditDay = (day) => {
    let nextDays = [...(editFormData.dias_asignados || [])];
    if (nextDays.includes(day)) {
      if (nextDays.length > 1) {
        nextDays = nextDays.filter(d => d !== day);
      }
    } else {
      nextDays.push(day);
    }
    nextDays.sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
    setEditFormData({
      ...editFormData,
      dias_asignados: nextDays,
      dias_por_semana: nextDays.length
    });
  };

  // Modal Registrar Medición desde Progreso
  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(false);
  const [isSavingEval, setIsSavingEval] = useState(false);
  const [newEvalData, setNewEvalData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso: '',
    porcentaje_grasa: '',
    cintura: '',
    cadera: '',
    brazo: '',
    muslo: '',
    notas: ''
  });

  useEffect(() => {
    if (client?.id) {
      loadClientData(client.id);
      setNotesText(client.notas || '');
      setEditPhotoFile(null);
      setEditPhotoPreview(client.foto_url || client.avatar_url || null);
      setEditPhotoRemoved(false);
      setEditFormData({
        nombre_completo: client.nombre_completo || '',
        telefono: client.telefono || '',
        email: client.email || '',
        edad: client.edad || '',
        altura: client.altura || '',
        modalidad: client.modalidad || 'Presencial',
        objetivo: client.objetivo || '',
        estado: client.estado || 'Activo',
        plan_actual: client.plan_actual || 'Presencial',
        dias_por_semana: client.dias_por_semana || 3,
        dias_asignados: client.dias_asignados || ['Lunes', 'Miércoles', 'Viernes'],
        tipo_planificacion: client.tipo_planificacion || 'Semanal',
        duracion_sesion_min: client.duracion_sesion_min || 60
      });
    }
  }, [client]);

  const loadClientData = async (clientId) => {
    try {
      const [evals, rout, pays, exList, allRoutines, weekSessions, sessionsList, appointmentsList, medRec] = await Promise.all([
        dataService.getEvaluations(clientId),
        dataService.getRoutineForClient(clientId),
        dataService.getPayments(clientId),
        dataService.getExercises('Todos'),
        dataService.getRoutines(),
        dataService.getWeeklySessionsForClient(clientId, new Date()),
        dataService.getTrainingSessionsForClient(clientId),
        dataService.getAppointments(),
        dataService.getMedicalRecord(clientId)
      ]);

      setEvaluations(evals || []);
      setRoutine(rout || null);
      setCatalogExercises(exList || []);
      setLibraryRoutines(allRoutines || []);
      setWeeklySessions(Array.isArray(weekSessions) ? weekSessions : (weekSessions?.sessions || []));
      setTotalSessions(sessionsList || []);
      setMedicalRecord(medRec || null);

      const clientApts = (appointmentsList || []).filter(apt =>
        apt.client_id === clientId ||
        apt.client?.id === clientId ||
        (apt.client_name && client?.nombre_completo && apt.client_name.toLowerCase() === client.nombre_completo.toLowerCase())
      );
      setClientAppointments(clientApts);

      const sDate = client?.fecha_inicio_rutina || (await dataService.getRoutineStartDate(clientId));
      setRoutineStartDate(sDate);
      
      setPayments(pays || []);
    } catch (err) {
      console.error('Error cargando detalles del cliente:', err);
    }
  };

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const months = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        return `${day} de ${months[monthIndex]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleAssignExistingRoutine = async (routineId) => {
    try {
      setIsAssigningRoutine(true);
      await dataService.assignRoutineToClient(routineId, client.id);
      await loadClientData(client.id);
      setIsAssignExistingModalOpen(false);
      if (onUpdateClient) {
        const updatedClient = await dataService.getClientById(client.id);
        if (updatedClient) onUpdateClient(updatedClient);
      }
    } catch (err) {
      console.error('Error al asignar rutina existente:', err);
      alert('Error al asignar la rutina seleccionada.');
    } finally {
      setIsAssigningRoutine(false);
    }
  };

  const handleUnassignRoutine = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas desasignar la rutina actual de ${client?.nombre_completo}?`)) {
      return;
    }
    try {
      await dataService.unassignRoutineFromClient(client.id);
      await loadClientData(client.id);
      if (onUpdateClient) {
        const updatedClient = await dataService.getClientById(client.id);
        if (updatedClient) onUpdateClient(updatedClient);
      }
    } catch (err) {
      console.error('Error desasignando rutina:', err);
    }
  };

  const handleGoToRoutineCreator = () => {
    if (onCreateRoutine && client?.id) {
      onCreateRoutine(client.id);
    }
  };

  const handleSaveNewRoutineForThisClient = async (e) => {
    e.preventDefault();
    if (!newRoutineTitle || selectedExForRoutine.length === 0) return;

    await dataService.createRoutine({
      nombre: newRoutineTitle,
      client_id: client.id,
      dia: 'Sesión Asignada',
      objetivo: client.objetivo || 'Hipertrofia y fuerza'
    }, selectedExForRoutine);

    setIsAssignRoutineOpen(false);
    setSelectedExForRoutine([]);
    loadClientData(client.id);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await dataService.updateClient(client.id, { notas: notesText });
    setIsSavingNotes(false);
    setNotesSuccess(true);
    setTimeout(() => setNotesSuccess(false), 2000);
    if (onUpdateClient) {
      onUpdateClient({ ...client, notas: notesText });
    }
  };

  const handleOpenEditModal = () => {
    setEditPhotoFile(null);
    setEditPhotoPreview(client?.foto_url || client?.avatar_url || null);
    setEditPhotoRemoved(false);
    setEditFormData({
      nombre_completo: client?.nombre_completo || '',
      telefono: client?.telefono || '',
      email: client?.email || '',
      edad: (client?.edad !== null && client?.edad !== undefined) ? client.edad : '',
      altura: (client?.altura !== null && client?.altura !== undefined) ? client.altura : '',
      modalidad: client?.modalidad || 'Presencial',
      objetivo: client?.objetivo || '',
      estado: client?.estado || 'Activo',
      plan_actual: client?.plan_actual || 'Presencial',
      dias_por_semana: client?.dias_por_semana || 3,
      dias_asignados: client?.dias_asignados || ['Lunes', 'Miércoles', 'Viernes'],
      tipo_planificacion: client?.tipo_planificacion || 'Semanal',
      duracion_sesion_min: client?.duracion_sesion_min || 60
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      let photoUrl = client?.foto_url || client?.avatar_url || null;
      let isPhotoChanged = false;

      if (editPhotoRemoved) {
        photoUrl = null;
        isPhotoChanged = true;
      }
      if (editPhotoFile) {
        const uploadedUrl = await dataService.uploadClientAvatar(editPhotoFile);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
          isPhotoChanged = true;
        }
      }

      // Mapear el ID de plan oficial de membresía
      const planName = editFormData.plan_actual || client?.plan_actual || 'Presencial';
      let planId = client?.plan_id || null;
      const lower = planName.toLowerCase();
      if (lower.includes('presencial')) {
        planId = '12dc754e-4262-4171-9f6c-6669b853af70';
      } else if (lower.includes('distancia') || lower.includes('online')) {
        planId = 'e2f87a8f-3ff0-4cd7-9e2b-35737861a172';
      } else if (lower.includes('personalizado')) {
        planId = 'b89bd142-8dd2-4a60-8436-fe069f7aeb83';
      }

      // Sanitizar el payload limpiando campos calculados y aislando metadatos
      const payload = {
        nombre_completo: editFormData.nombre_completo?.trim(),
        telefono: editFormData.telefono?.trim(),
        email: editFormData.email ? editFormData.email.trim() : null,
        edad: (editFormData.edad !== '' && editFormData.edad !== null && editFormData.edad !== undefined) ? parseInt(editFormData.edad, 10) : null,
        altura: (editFormData.altura !== '' && editFormData.altura !== null && editFormData.altura !== undefined) ? parseFloat(editFormData.altura) : null,
        modalidad: editFormData.modalidad,
        objetivo: editFormData.objetivo?.trim(),
        estado: editFormData.estado,
        plan_actual: planName,
        plan_id: planId,
        dias_por_semana: editFormData.dias_por_semana,
        dias_asignados: editFormData.dias_asignados,
        tipo_planificacion: editFormData.tipo_planificacion,
        duracion_sesion_min: editFormData.duracion_sesion_min,
        foto_url: photoUrl,
        avatar_url: photoUrl
      };

      const updated = await dataService.updateClient(client.id, payload);
      const updatedClient = {
        ...client,
        ...updated,
        ...payload,
        foto_url: photoUrl,
        avatar_url: photoUrl,
        plan_actual: planName,
        plan_id: planId
      };

      // Inmediatamente actualizar estado local
      setClient(updatedClient);
      setEditPhotoPreview(photoUrl);
      setEditPhotoFile(null);
      setEditPhotoRemoved(false);
      setIsEditModalOpen(false);

      if (onUpdateClient) {
        onUpdateClient(updatedClient);
      }

      setProfileSuccessMsg(isPhotoChanged ? 'Foto de perfil actualizada correctamente' : 'Perfil actualizado correctamente');
      setTimeout(() => {
        setProfileSuccessMsg(null);
      }, 3500);

      // Recargar datos frescos del cliente
      loadClientData(client.id);
    } catch (err) {
      console.error('Error actualizando perfil del cliente:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateEvaluation = async (e) => {
    e.preventDefault();
    if (!newEvalData.peso) return;
    setIsSavingEval(true);
    try {
      await dataService.addEvaluation({
        ...newEvalData,
        client_id: client.id,
        peso: parseFloat(newEvalData.peso),
        porcentaje_grasa: parseFloat(newEvalData.porcentaje_grasa || 0),
        cintura: parseFloat(newEvalData.cintura || 0),
        cadera: parseFloat(newEvalData.cadera || 0),
        brazo: parseFloat(newEvalData.brazo || 0),
        muslo: parseFloat(newEvalData.muslo || 0)
      });

      setIsNewEvalModalOpen(false);
      loadClientData(client.id);
    } catch (err) {
      console.error('Error guardando evaluación:', err);
      alert('Hubo un error al guardar la medición. Intenta de nuevo.');
    } finally {
      setIsSavingEval(false);
    }
  };

  const renderDelta = (diff, isReductionGood = true) => {
    if (diff === null || diff === undefined || isNaN(diff)) return null;
    const num = Number(diff);
    if (num === 0) return <span className="text-[10px] text-gray-500 font-semibold ml-1">(= 0 cm)</span>;

    const isPositive = num > 0;
    const isGood = isReductionGood ? !isPositive : isPositive;
    const colorClass = isGood ? 'text-emerald-400' : 'text-red-400';
    const arrow = isPositive ? '▲' : '▼';
    const sign = isPositive ? '+' : '';

    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${colorClass} ml-1`}>
        <span>{arrow}</span>
        <span>{sign}{diff} cm</span>
      </span>
    );
  };

  // 1. Total Sesiones y Asistencia Real
  const completedSessionsCount = totalSessions.filter(s => s.completada === true || s.completada === 1 || s.completada === 'true').length;
  const scheduledCount = Math.max(
    totalSessions.length,
    clientAppointments.filter(a => a.estado !== 'Cancelado').length
  );
  const attendancePercent = scheduledCount > 0
    ? Math.min(100, Math.round((completedSessionsCount / scheduledCount) * 100))
    : 0;

  // 2. Evaluaciones y comparativas dinámicas
  const lastEval = evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;
  const firstEval = evaluations.length > 0 ? evaluations[0] : null;
  const hasMultipleEvals = evaluations.length >= 2;

  const rawWeightDelta = hasMultipleEvals && firstEval?.peso != null && lastEval?.peso != null
    ? Number((Number(lastEval.peso) - Number(firstEval.peso)).toFixed(1))
    : null;
  const rawWaistDelta = hasMultipleEvals && firstEval?.cintura != null && lastEval?.cintura != null
    ? Number((Number(lastEval.cintura) - Number(firstEval.cintura)).toFixed(1))
    : null;
  const armDelta = firstEval && lastEval && firstEval.brazo != null && lastEval.brazo != null
    ? (lastEval.brazo - firstEval.brazo).toFixed(1)
    : null;
  const currentWeight = lastEval?.peso != null ? lastEval.peso : (client?.peso_actual || client?.peso || '-');

  // 3. Próximo Turno Agendado
  const now = new Date();
  const upcomingAppointments = clientAppointments
    .filter(a => {
      if (a.estado === 'Cancelado') return false;
      const aptDate = new Date(a.fecha_hora_inicio);
      return aptDate >= now;
    })
    .sort((a, b) => new Date(a.fecha_hora_inicio) - new Date(b.fecha_hora_inicio));

  const nextAppointment = upcomingAppointments[0] || null;

  const formatNextAptText = (apt) => {
    if (!apt?.fecha_hora_inicio) return '-';
    try {
      const d = new Date(apt.fecha_hora_inicio);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const isToday = d.toDateString() === today.toDateString();
      const isTomorrow = d.toDateString() === tomorrow.toDateString();
      const timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

      if (isToday) return `Hoy ${timeStr}`;
      if (isTomorrow) return `Mañana ${timeStr}`;

      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayNum = d.getDate();
      const monthStr = months[d.getMonth()];
      return `${dayNum} ${monthStr} ${timeStr}`;
    } catch {
      return '-';
    }
  };

  const cleanPhone = (client?.telefono || '').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(client?.nombre_completo || '')},%20te%20escribo%20desde%20Esteban%20Correa%20Personal%20Trainer.`;

  const targetFrequency = routine?.dias_por_semana || (routine?.dias ? routine.dias.length : null) || client?.dias_por_semana || 3;
  const completedThisWeek = Array.isArray(weeklySessions) ? weeklySessions.length : 0;
  const progressPercent = Math.min(100, Math.round((completedThisWeek / (targetFrequency || 1)) * 100));
  const completedDaysNames = Array.isArray(weeklySessions)
    ? [...new Set(weeklySessions.map(s => s.nombre_dia || s.dia_rutina).filter(Boolean))]
    : [];

  const getProgressBarColor = () => {
    if (completedThisWeek >= targetFrequency && targetFrequency > 0) return 'bg-emerald-500';
    if (completedThisWeek > 0) return 'bg-amber-500';
    return 'bg-gray-600';
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      {/* Toast de confirmación de actualización de perfil */}
      {profileSuccessMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-2xl border border-emerald-400/40 text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <span className="pr-1">{profileSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setProfileSuccessMsg(null)}
            className="text-white/70 hover:text-white ml-2 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* 1. CABECERA CON BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
          <button 
            onClick={onBack}
            className="hover:text-white transition-colors flex items-center gap-1 font-semibold text-gray-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Alumnos</span>
          </button>
          <span>/</span>
          <span className="text-white font-bold truncate">Perfil del Alumno</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          <button
            onClick={handleOpenEditModal}
            className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red transition-all flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar Perfil</span>
          </button>
        </div>
      </div>

      {/* 2. TARJETA DE INFORMACIÓN PRINCIPAL */}
      <div className="card-dark rounded-2xl p-5 sm:p-6 space-y-6">
        
        {/* Fila Superior: Avatar + Nombre + Datos Rápidos */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-dark-700/80">
          <div className="flex items-start sm:items-center gap-4">
            <ClientAvatar
              client={client}
              rounded="rounded-full"
              showStatus={true}
              status={client?.estado}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-red-500 relative shrink-0 shadow-lg"
            />

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                  {client?.nombre_completo}
                </h1>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  client?.estado === 'Activo'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {client?.estado || 'Activa'}
                </span>
                <span className="font-mono text-xs font-bold text-brand-light bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                  {client?.access_code}
                </span>

                {routine ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-brand/15 text-brand-light border-brand/30 flex items-center gap-1 shadow-sm">
                    <Dumbbell className="w-3 h-3 text-brand" />
                    <span className="truncate max-w-[200px]">{routine.nombre}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center gap-1 shadow-sm">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span>Sin Rutina Asignada</span>
                  </span>
                )}
              </div>

              {/* Datos rápidos en línea */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                <span>{client?.edad ? `${client.edad} años` : '-'}</span>
                <span>•</span>
                <span>{client?.altura ? `${client.altura} cm` : '-'}</span>
                <span>•</span>
                <span className="text-white font-bold">{currentWeight !== '-' ? `${currentWeight} kg` : '-'}</span>
                <span>•</span>
                <span className="text-gray-300 font-semibold">{client?.modalidad || 'Presencial'}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                  title="Abrir chat de WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5 text-brand" />
                  <span className="hover:underline">{client?.telefono}</span>
                </a>
                {client?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-500" /> {client.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Tarjetas de Resumen Clave: Objetivo, Plan Actual y Última Evaluación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Tarjeta 1: Objetivo Principal */}
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-700/80 space-y-1.5">
            <span className="text-[11px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-brand-light" /> Objetivo Principal
            </span>
            <p className="text-sm font-bold text-white line-clamp-2">
              {client?.objetivo || 'Reducir % de grasa y ganar fuerza'}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold pt-1">
              Enfocado en déficit calórico y sobrecarga progresiva
            </p>
          </div>

          {/* Tarjeta 2: Plan Actual */}
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-700/80 space-y-1.5">
            <span className="text-[11px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Plan Actual
            </span>
            <p className="text-sm font-bold text-white">
              {client?.plan_actual || 'Plan Presencial'}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400">Vto: 28/11/2026</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Al Día
              </span>
            </div>
          </div>

          {/* Tarjeta 3: Última Evaluación */}
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-700/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Última Evaluación
              </span>
              <button 
                onClick={() => setActiveTab('progreso')}
                className="text-[10px] text-brand-light hover:underline font-bold"
              >
                Ver detalle
              </button>
            </div>
            <p className="text-sm font-bold text-white">
              {lastEval ? `${lastEval.peso} kg • ${lastEval.porcentaje_grasa || 17.2}% Grasa` : '81.5 kg • 17.2% Grasa'}
            </p>
            <p className="text-[11px] text-gray-400 pt-1">
              Fecha: {lastEval ? lastEval.fecha : '2024-04-25'} ({evaluations.length} mediciones)
            </p>
          </div>

        </div>

      </div>

      {/* 3. SISTEMA DE PESTAÑAS SECUNDARIAS */}
      <div className="card-dark rounded-2xl p-5 sm:p-6 space-y-6">
        
        {/* Barra de pestañas */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-dark-700">
          {[
            { id: 'resumen', label: 'Resumen', icon: Activity },
            { id: 'rutinas', label: 'Rutinas', icon: Dumbbell },
            { id: 'progreso', label: 'Progreso', icon: TrendingUp },
            { id: 'pagos', label: 'Pagos', icon: CreditCard },
            { 
              id: 'salud', 
              label: 'Ficha de Salud', 
              icon: HeartPulse,
              badge: medicalRecord?.completada ? 'Completa' : 'Pendiente',
              badgeColor: medicalRecord?.completada ? 'emerald' : 'amber'
            },
            { id: 'notas', label: 'Notas', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-brand text-white shadow-glow-red'
                    : 'text-gray-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    tab.badgeColor === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* PESTAÑA 1: RESUMEN */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Tarjeta 1: Total Sesiones Real */}
              <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Sesiones</span>
                <p className="text-2xl font-black text-white mt-1">{completedSessionsCount}</p>
                <span className={`text-[10px] font-semibold ${
                  scheduledCount > 0 
                    ? (attendancePercent >= 80 ? 'text-emerald-400' : attendancePercent >= 50 ? 'text-amber-400' : 'text-rose-400')
                    : 'text-gray-400'
                }`}>
                  {scheduledCount > 0 ? `${attendancePercent}% asistencia` : 'Sin registros'}
                </span>
              </div>

              {/* Tarjeta 2: Variación Peso */}
              <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Variación Peso</span>
                <p className={`text-2xl font-black mt-1 ${
                  rawWeightDelta !== null
                    ? (rawWeightDelta < 0 ? 'text-emerald-400' : rawWeightDelta > 0 ? 'text-amber-400' : 'text-white')
                    : (lastEval?.peso ? 'text-white' : 'text-gray-400')
                }`}>
                  {rawWeightDelta !== null
                    ? `${rawWeightDelta > 0 ? `+${rawWeightDelta}` : rawWeightDelta} kg`
                    : (lastEval?.peso ? `${lastEval.peso} kg` : '-')}
                </p>
                <span className="text-[10px] text-gray-400">
                  {rawWeightDelta !== null
                    ? 'Desde inicio'
                    : (lastEval?.peso ? 'Peso inicial' : 'Sin mediciones')}
                </span>
              </div>

              {/* Tarjeta 3: Reducción Cintura */}
              <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Reducción Cintura</span>
                <p className={`text-2xl font-black mt-1 ${
                  rawWaistDelta !== null
                    ? (rawWaistDelta <= 0 ? 'text-blue-400' : 'text-amber-400')
                    : (lastEval?.cintura ? 'text-blue-400' : 'text-gray-400')
                }`}>
                  {rawWaistDelta !== null
                    ? `${rawWaistDelta > 0 ? `+${rawWaistDelta}` : rawWaistDelta} cm`
                    : (lastEval?.cintura ? `${lastEval.cintura} cm` : '-')}
                </p>
                <span className="text-[10px] text-gray-400">
                  {rawWaistDelta !== null
                    ? 'Desde inicio'
                    : (lastEval?.cintura ? 'Cintura actual' : 'Sin mediciones')}
                </span>
              </div>

              {/* Tarjeta 4: Próximo Turno */}
              <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Próximo Turno</span>
                <p className={`text-sm font-black mt-2 truncate ${nextAppointment ? 'text-brand-light' : 'text-gray-400'}`}>
                  {nextAppointment ? formatNextAptText(nextAppointment) : '-'}
                </p>
                <span className="text-[10px] text-gray-400 truncate block">
                  {nextAppointment ? (nextAppointment.tipo_detalle || nextAppointment.tipo || 'Presencial') : 'Sin turnos agendados'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Ficha del Atleta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300">
                <div>
                  <p><strong className="text-white">Código Móvil de Acceso:</strong> <span className="font-mono text-brand-light font-bold">{client?.access_code}</span></p>
                  <p className="mt-1"><strong className="text-white">Modalidad:</strong> {client?.modalidad || 'Presencial'}</p>
                  <p className="mt-1"><strong className="text-white">Fecha de Alta:</strong> {client?.fecha_inicio || client?.created_at?.split('T')[0] || client?.creado_el?.split('T')[0] || '-'}</p>
                </div>
                <div>
                  <p><strong className="text-white">Estado de Salud / Lesiones:</strong> {client?.lesiones || client?.estado_salud || client?.notas || 'Sin contraindicaciones registradas.'}</p>
                  <p className="mt-1"><strong className="text-white">Frecuencia Pactada:</strong> {client?.dias_por_semana || client?.dias_asignados?.length || 3} días por semana.</p>
                </div>
              </div>
            </div>

            {/* Ficha de Planificación Temporal y Días de Entrenamiento */}
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand-light shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Esquema Temporal y Disponibilidad</span>
                  <p className="font-bold text-white text-sm">
                    {client?.tipo_planificacion || 'Semanal'} • {client?.duracion_sesion_min || 60} min por sesión
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(client?.dias_asignados || ['Lunes', 'Miércoles', 'Viernes']).map((d) => (
                  <span key={d} className="px-2.5 py-1 rounded-lg bg-dark-850 border border-dark-700 text-brand-light font-bold text-xs shadow-sm">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* BLOQUE PROGRESO DE RUTINA (RESUMEN) */}
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 space-y-3.5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-750 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/25 flex items-center justify-center text-brand-light">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Progreso de Rutina</h4>
                    <p className="text-xs text-gray-400">
                      {routineStartDate ? (
                        <span className="text-emerald-400 font-semibold">
                          Inició el plan: {formatFriendlyDate(routineStartDate)}
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">
                          Pendiente de inicio
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-bold text-white">
                    Plan semanal: {completedThisWeek} / {targetFrequency} días
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    Semana en curso ({progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Barra de Progreso */}
              <div className="space-y-1.5">
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Lista rápida de días específicos completados esta semana */}
              <div className="pt-1 text-xs">
                {completedDaysNames.length > 0 ? (
                  <p className="text-gray-300">
                    <strong className="text-gray-400 font-semibold">Completó: </strong>
                    <span className="text-emerald-400 font-bold">{completedDaysNames.join(', ')}</span>
                  </p>
                ) : (
                  <p className="text-gray-400 italic">
                    Completó: Sin sesiones registradas esta semana (lunes a domingo).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: RUTINAS */}
        {activeTab === 'rutinas' && (
          !routine || !routine.dias || routine.dias.length === 0 ? (
            /* EMPTY STATE CON DOS BOTONES DE ACCIÓN DIRECTA */
            <div className="card-dark rounded-2xl p-6 sm:p-10 text-center space-y-6 border border-white/5 shadow-xl max-w-xl mx-auto my-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                <Dumbbell className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Sin Rutina Asignada
                </span>
                <h3 className="text-xl font-bold text-white mt-2">
                  Plan de Entrenamiento Pendiente
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {client?.nombre_completo} aún no tiene ninguna rutina activa en el sistema. Elige una opción para planificar su entrenamiento:
                </p>
              </div>

              {/* 2 Botones de Acción Directa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 1. 📋 Asignar Rutina Existente */}
                <button
                  type="button"
                  onClick={() => setIsAssignExistingModalOpen(true)}
                  className="p-4 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-700 hover:border-emerald-500/50 text-left transition-all group flex flex-col justify-between min-h-[120px] shadow-md hover:shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <span>Asignar Rutina Existente</span>
                      <ChevronRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      Elige una plantilla o rutina guardada en la biblioteca con un solo clic.
                    </p>
                  </div>
                </button>

                {/* 2. ➕ Crear Rutina Personalizada */}
                <button
                  type="button"
                  onClick={handleGoToRoutineCreator}
                  className="p-4 rounded-xl bg-dark-900 hover:bg-dark-850 border border-brand/40 hover:border-brand text-left transition-all group flex flex-col justify-between min-h-[120px] shadow-glow-red/10 hover:shadow-glow-red/20"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/40 flex items-center justify-center text-brand-light mb-2 group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-light transition-colors flex items-center gap-1.5">
                      <span>Crear Rutina Personalizada</span>
                      <ChevronRight className="w-4 h-4 text-brand-light opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      Abre el Creador de Rutinas con este alumno preseleccionado día por día.
                    </p>
                  </div>
                </button>
              </div>

              {/* Disponibilidad configurada para orientar al coach */}
              <div className="pt-4 border-t border-dark-700/70 text-left bg-dark-900/60 p-3 rounded-xl border border-dark-750">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Disponibilidad acordada del alumno:</span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                  <span className="font-semibold text-white">{client?.dias_por_semana || 3} días/sem</span>
                  <span>•</span>
                  <span>{client?.tipo_planificacion || 'Semanal'}</span>
                  <span>•</span>
                  <span className="text-brand-light font-bold">{(client?.dias_asignados || ['Lunes', 'Miércoles', 'Viernes']).join(', ')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-brand-light" />
                      {routine.nombre}
                    </h3>
                    <span className="text-xs font-bold text-brand-light bg-brand/10 px-2.5 py-0.5 rounded-lg border border-brand/20">
                      Activa
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{routine.objetivo || routine.descripcion || 'Plan personalizado con sobrecarga progresiva'}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsAssignExistingModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 text-gray-300 hover:text-white border border-dark-700 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cambiar Rutina</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToRoutineCreator}
                    className="px-3 py-1.5 rounded-xl bg-brand/20 hover:bg-brand/30 text-brand-light border border-brand/40 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Editar en Creador</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUnassignRoutine}
                    title="Desasignar rutina de este alumno"
                    className="p-1.5 rounded-xl bg-dark-900 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-dark-700 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* BLOQUE PROGRESO DE RUTINA */}
              <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 space-y-3.5 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-750 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/25 flex items-center justify-center text-brand-light">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Progreso de Rutina</h4>
                      <p className="text-xs text-gray-400">
                        {routineStartDate ? (
                          <span className="text-emerald-400 font-semibold">
                            Inició el plan: {formatFriendlyDate(routineStartDate)}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold">
                            Pendiente de inicio
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold text-white">
                      Plan semanal: {completedThisWeek} / {targetFrequency} días
                    </span>
                    <span className="text-[11px] text-gray-400 block">
                      Semana en curso ({progressPercent}%)
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="space-y-1.5">
                  <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Lista rápida de días específicos completados esta semana */}
                <div className="pt-1 text-xs space-y-2">
                  {completedDaysNames.length > 0 ? (
                    <>
                      <p className="text-gray-300">
                        <strong className="text-gray-400 font-semibold">Completó: </strong>
                        <span className="text-emerald-400 font-bold">{completedDaysNames.join(', ')}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {weeklySessions.map((s, idx) => (
                          <span
                            key={s.id || idx}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1"
                          >
                            <span>✓</span>
                            <span>{s.nombre_dia || s.dia_rutina || `Día ${idx + 1}`}</span>
                            <span className="text-[10px] text-emerald-400/80">({(s.fecha || '').split('T')[0]})</span>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">
                      Completó: Sin sesiones registradas esta semana (lunes a domingo).
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {routine.dias.map((dia, dIdx) => (
                  <div key={dIdx} className="p-4 rounded-xl bg-dark-900 border border-dark-700 space-y-3">
                    <div className="flex items-center justify-between border-b border-dark-700/60 pb-2">
                      <h4 className="text-sm font-bold text-white">{dia.dia}</h4>
                      <span className="text-xs text-gray-400 font-semibold">{dia.ejercicios.length} ejercicios</span>
                    </div>

                    <div className="space-y-2">
                      {dia.ejercicios.map((item, eIdx) => (
                        <div key={eIdx} className="p-3 rounded-lg bg-dark-850 border border-dark-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-brand/20 text-brand-light text-xs font-bold flex items-center justify-center shrink-0">
                              {eIdx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-white">{item.exercise?.nombre}</p>
                              <span className="text-[10px] text-gray-400">{item.exercise?.grupo_muscular}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs self-end sm:self-center">
                            <span className="font-semibold text-gray-300">{item.series} x {item.repeticiones}</span>
                            <span className="font-bold text-brand-light bg-brand/10 px-2 py-0.5 rounded">{item.peso_sugerido}</span>
                            <span className="text-gray-400 text-[11px]">{item.descanso_seg}s desc.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* PESTAÑA 3: PROGRESO */}
        {activeTab === 'progreso' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-light" />
                  Evolución de Peso & Antropometría
                </h3>
                <p className="text-xs text-gray-400">Curva de descenso de peso corporal</p>
              </div>

              <button
                onClick={() => setIsNewEvalModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Medición</span>
              </button>
            </div>

            {/* Gráfico de Línea con Recharts */}
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-700">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evaluations} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
                    <XAxis dataKey="fecha" stroke="#888" fontSize={11} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#888" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181f',
                        borderColor: '#272733',
                        borderRadius: '0.75rem',
                        color: '#fff'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="peso"
                      name="Peso (kg)"
                      stroke="#e50914"
                      strokeWidth={3}
                      dot={{ fill: '#e50914', r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla de Medidas con Comparativa (+/- cm) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Historial de Medidas & Variaciones (+/- cm)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-dark-900 text-gray-400 uppercase text-[10px] border-b border-dark-700">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Peso</th>
                      <th className="py-2.5 px-3">Cintura</th>
                      <th className="py-2.5 px-3">Cadera</th>
                      <th className="py-2.5 px-3">Brazo</th>
                      <th className="py-2.5 px-3">Muslo</th>
                      <th className="py-2.5 px-3">% Grasa</th>
                      <th className="py-2.5 px-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/60 text-gray-300">
                    {evaluations.map((ev, idx) => {
                      const prev = idx > 0 ? evaluations[idx - 1] : null;
                      const cDiff = prev ? (ev.cintura - prev.cintura).toFixed(1) : null;
                      const hDiff = prev ? (ev.cadera - prev.cadera).toFixed(1) : null;
                      const bDiff = prev ? (ev.brazo - prev.brazo).toFixed(1) : null;
                      const mDiff = prev ? (ev.muslo - prev.muslo).toFixed(1) : null;

                      return (
                        <tr key={ev.id || idx} className="hover:bg-dark-800/50">
                          <td className="py-2.5 px-3 font-semibold text-white">{ev.fecha}</td>
                          <td className="py-2.5 px-3 font-bold text-brand-light">{ev.peso} kg</td>
                          <td className="py-2.5 px-3">
                            <span>{ev.cintura} cm</span>
                            {renderDelta(cDiff, true)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span>{ev.cadera} cm</span>
                            {renderDelta(hDiff, true)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span>{ev.brazo} cm</span>
                            {renderDelta(bDiff, false)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span>{ev.muslo} cm</span>
                            {renderDelta(mDiff, false)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-amber-400">{ev.porcentaje_grasa}%</td>
                          <td className="py-2.5 px-3 text-gray-400 truncate max-w-[150px]">{ev.notas || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: PAGOS */}
        {activeTab === 'pagos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-light" />
                  Historial de Pagos del Alumno
                </h3>
                <p className="text-xs text-gray-400">Registros sincronizados con la tabla client_payments de Supabase</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {payments.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-dark-900 border border-dark-700/80 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white">{p.plan_nombre}</h4>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Vence: {p.fecha_vencimiento} • Método: {p.metodo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-white font-mono">${p.monto?.toLocaleString('es-AR')}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.estado === 'Pagado'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))}

              {payments.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No hay pagos registrados aún para este alumno.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA: FICHA DE SALUD */}
        {activeTab === 'salud' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-red-500" />
                  Ficha Médica y de Salud del Alumno
                </h3>
                <p className="text-xs text-gray-400">
                  Zonas con molestias, cirugías previas, condiciones crónicas y medicación.
                </p>
              </div>
            </div>

            <MedicalRecordViewOnly
              record={medicalRecord}
              isStudentView={false}
              isAuthorizing={isAuthorizingMedicalEdit}
              onAuthorizeEdit={async (nuevoPermiso) => {
                if (!client?.id) return;
                try {
                  setIsAuthorizingMedicalEdit(true);
                  const updated = await dataService.setMedicalRecordEditPermission(client.id, nuevoPermiso);
                  setMedicalRecord(prev => prev ? { ...prev, permitir_edicion: nuevoPermiso } : updated);
                  if (nuevoPermiso) {
                    setProfileSuccessMsg('El alumno ahora puede modificar sus datos médicos desde su aplicación.');
                  } else {
                    setProfileSuccessMsg('Se ha revocado el permiso de edición. La ficha vuelve a estar bloqueada.');
                  }
                  setTimeout(() => setProfileSuccessMsg(null), 4000);
                } catch (err) {
                  console.error('Error actualizando permiso de edición:', err);
                } finally {
                  setIsAuthorizingMedicalEdit(false);
                }
              }}
            />
          </div>
        )}

        {/* PESTAÑA 5: NOTAS TÉCNICAS */}
        {activeTab === 'notas' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-light" />
                Bloc de Notas y Observaciones del Coach
              </h3>
              <p className="text-xs text-gray-400">
                Anotaciones privadas sobre patologías, preferencias, adherencia nutricional y progresos.
              </p>
            </div>

            <textarea
              rows="6"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Escribe aquí las observaciones técnicas del alumno..."
              className="w-full bg-dark-900 border border-dark-700 rounded-xl p-4 text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-brand transition-all"
            ></textarea>

            <div className="flex items-center justify-between">
              {notesSuccess ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> ¡Notas guardadas en Supabase!
                </span>
              ) : <span></span>}

              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingNotes ? 'Guardando...' : 'Guardar Observaciones'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: EDITAR PERFIL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
            
            {/* Cabecera fija */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand" />
                Editar Perfil del Alumno
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              {/* Cuerpo scrolleable */}
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3.5 pb-2">
                {/* Selector de Foto / Cámara */}
                <div className="flex justify-center pb-2">
                  <ClientPhotoUploader
                    initialUrl={editPhotoPreview}
                    currentPhoto={editPhotoPreview}
                    name={editFormData.nombre_completo}
                    onPhotoSelected={(file, previewUrl) => {
                      setEditPhotoFile(file);
                      setEditPhotoPreview(previewUrl);
                      setEditPhotoRemoved(false);
                    }}
                    onPhotoSelect={(file, previewUrl) => {
                      setEditPhotoFile(file);
                      setEditPhotoPreview(previewUrl);
                      setEditPhotoRemoved(false);
                    }}
                    onPhotoRemoved={() => {
                      setEditPhotoFile(null);
                      setEditPhotoPreview(null);
                      setEditPhotoRemoved(true);
                    }}
                    onPhotoRemove={() => {
                      setEditPhotoFile(null);
                      setEditPhotoPreview(null);
                      setEditPhotoRemoved(true);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.nombre_completo}
                    onChange={(e) => setEditFormData({ ...editFormData, nombre_completo: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Teléfono / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.telefono}
                      onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Edad</label>
                    <input
                      type="number"
                      value={editFormData.edad}
                      onChange={(e) => setEditFormData({ ...editFormData, edad: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      value={editFormData.altura}
                      onChange={(e) => setEditFormData({ ...editFormData, altura: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Modalidad</label>
                    <select
                      value={editFormData.modalidad}
                      onChange={(e) => setEditFormData({ ...editFormData, modalidad: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Plan de Membresía</label>
                    <select
                      value={editFormData.plan_actual || 'Presencial'}
                      onChange={(e) => setEditFormData({ ...editFormData, plan_actual: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    >
                      <option value="Presencial">Plan Presencial</option>
                      <option value="Personalizado">Plan Personalizado</option>
                      <option value="A distancia">Plan A Distancia (Online)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Objetivo</label>
                    <input
                      type="text"
                      value={editFormData.objetivo}
                      onChange={(e) => setEditFormData({ ...editFormData, objetivo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Estado</label>
                    <select
                      value={editFormData.estado}
                      onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Pausado">Pausado</option>
                    </select>
                  </div>
                </div>

                {/* Configuración de Entrenamiento y Días Asignados */}
                <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-light">
                      🗓️ Días Asignados & Planificación
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      {(editFormData.dias_asignados || []).length} días
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1">
                    {ALL_DAYS.map((day) => {
                      const isSelected = (editFormData.dias_asignados || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleEditDay(day)}
                          className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-brand text-white shadow-glow-red'
                              : 'bg-dark-800 text-zinc-400 hover:text-white border border-dark-700'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-0.5">
                        Tipo Planificación
                      </label>
                      <select
                        value={editFormData.tipo_planificacion || 'Semanal'}
                        onChange={(e) => setEditFormData({ ...editFormData, tipo_planificacion: e.target.value })}
                        className="w-full bg-dark-850 border border-dark-700 rounded-lg px-2 py-2 text-base sm:text-xs text-white min-h-[44px]"
                      >
                        <option value="Semanal">Semanal</option>
                        <option value="Mensual">Mensual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-0.5">
                        Duración Sesión
                      </label>
                      <select
                        value={editFormData.duracion_sesion_min || 60}
                        onChange={(e) => setEditFormData({ ...editFormData, duracion_sesion_min: parseInt(e.target.value) })}
                        className="w-full bg-dark-850 border border-dark-700 rounded-lg px-2 py-2 text-base sm:text-xs text-white min-h-[44px]"
                      >
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                        <option value="75">75 min</option>
                        <option value="90">90 min</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra inferior fija */}
              <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-dark-800 border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red min-h-[44px] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR MEDICIÓN FÍSICA */}
      {isNewEvalModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
            
            {/* Cabecera fija */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand" />
                Nueva Medición para {client?.nombre_completo}
              </h2>
              <button
                type="button"
                onClick={() => setIsNewEvalModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvaluation} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3.5 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={newEvalData.fecha}
                      onChange={(e) => setNewEvalData({ ...newEvalData, fecha: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="81.5"
                      value={newEvalData.peso}
                      onChange={(e) => setNewEvalData({ ...newEvalData, peso: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="86"
                      value={newEvalData.cintura}
                      onChange={(e) => setNewEvalData({ ...newEvalData, cintura: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-base sm:text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Cadera (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="100"
                      value={newEvalData.cadera}
                      onChange={(e) => setNewEvalData({ ...newEvalData, cadera: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-base sm:text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Brazo (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="38"
                      value={newEvalData.brazo}
                      onChange={(e) => setNewEvalData({ ...newEvalData, brazo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-base sm:text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Muslo (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="62"
                      value={newEvalData.muslo}
                      onChange={(e) => setNewEvalData({ ...newEvalData, muslo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-base sm:text-xs text-white min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Barra inferior fija */}
              <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewEvalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-dark-800 border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEval}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red min-h-[44px] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEval ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Medición</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASIGNAR NUEVA RUTINA DIRECTA A ESTE ALUMNO */}
      {isAssignRoutineOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
            
            {/* Cabecera fija */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-brand" />
                Asignar Rutina a {client?.nombre_completo}
              </h2>
              <button
                type="button"
                onClick={() => setIsAssignRoutineOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRoutineForThisClient} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-4 pb-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                    Nombre de la Rutina *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Rutina Piernas & Isquios con Progresión"
                    value={newRoutineTitle}
                    onChange={(e) => setNewRoutineTitle(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-2">
                    Seleccionar Ejercicios del Catálogo ({catalogExercises.length} disponibles)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1 bg-dark-900 rounded-xl border border-dark-750">
                    {catalogExercises.map(ex => {
                      const isAdded = selectedExForRoutine.some(s => s.exercise?.id === ex.id);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => {
                            if (isAdded) {
                              setSelectedExForRoutine(selectedExForRoutine.filter(s => s.exercise?.id !== ex.id));
                            } else {
                              setSelectedExForRoutine([...selectedExForRoutine, {
                                id: (typeof crypto !== 'undefined' && crypto.randomUUID ? `quick-ex-${crypto.randomUUID()}` : `quick-ex-${Date.now()}-${ex.id}`),
                                exercise: ex,
                                series: 4,
                                repeticiones: '10-12',
                                peso_sugerido: 'RPE 8',
                                descanso_seg: 90
                              }]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all min-h-[44px] ${
                            isAdded
                              ? 'bg-brand/20 border-brand text-white'
                              : 'bg-dark-850 border-dark-700 text-gray-400 hover:text-white'
                          }`}
                        >
                          <span className="font-semibold truncate">{ex.nombre}</span>
                          <span className="text-[10px] font-mono text-brand-light font-bold shrink-0 ml-2">
                            {isAdded ? '✓' : '+'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de Ejercicios Seleccionados */}
                {selectedExForRoutine.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase font-bold text-gray-400 block">
                      Parámetros ({selectedExForRoutine.length} ejercicios agregados)
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar pr-1">
                      {selectedExForRoutine.map((item, idx) => (
                        <div key={item.id || item.exercise?.id || `quick-param-${idx}`} className="p-2.5 rounded-lg bg-dark-900 border border-dark-700 flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate max-w-[150px]">{item.exercise?.nombre}</span>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={item.series}
                              onChange={(e) => {
                                const copy = [...selectedExForRoutine];
                                copy[idx].series = e.target.value;
                                setSelectedExForRoutine(copy);
                              }}
                              className="w-12 bg-dark-850 border border-dark-700 rounded py-1 px-1 text-center font-bold text-white text-xs min-h-[36px]"
                              title="Series"
                            />
                            <input
                              type="text"
                              value={item.repeticiones}
                              onChange={(e) => {
                                const copy = [...selectedExForRoutine];
                                copy[idx].repeticiones = e.target.value;
                                setSelectedExForRoutine(copy);
                              }}
                              className="w-16 bg-dark-850 border border-dark-700 rounded py-1 px-1 text-center font-bold text-white text-xs min-h-[36px]"
                              title="Reps"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Barra inferior fija */}
              <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAssignRoutineOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-dark-800 border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={selectedExForRoutine.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red disabled:opacity-40 min-h-[44px]"
                >
                  Guardar Rutina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASIGNAR RUTINA EXISTENTE DE LA BIBLIOTECA (1 CLIC) */}
      {isAssignExistingModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
            
            {/* Cabecera fija */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Asignar Rutina a {client?.nombre_completo}
                  </h2>
                  <p className="text-[11px] text-zinc-400">Selecciona una plantilla o rutina guardada para clonarla a este alumno</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignExistingModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista con scroll independiente */}
            <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3 py-3">
              {libraryRoutines.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 space-y-3">
                  <p className="text-xs">No hay plantillas guardadas en la biblioteca aún.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssignExistingModalOpen(false);
                      handleGoToRoutineCreator();
                    }}
                    className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs"
                  >
                    Crear Nueva Rutina en el Creador
                  </button>
                </div>
              ) : (
                libraryRoutines.map((rout) => {
                  const daysCount = rout.dias?.length || rout.dias_por_semana || 3;
                  const totalExercises = (rout.dias || []).reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);
                  const isCurrent = routine?.id === rout.id;

                  return (
                    <div
                      key={rout.id}
                      className="p-4 rounded-xl bg-dark-900 border border-dark-700/80 hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white group-hover:text-brand-light transition-colors truncate">
                            {rout.nombre}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand/10 text-brand-light border border-brand/20 shrink-0">
                            {daysCount} Días / Sem
                          </span>
                          {rout.es_plantilla && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              Plantilla Oficial
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                          {rout.descripcion || 'Sobrecarga progresiva y enfoque en hipertrofia muscular.'}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {totalExercises > 0 ? `${totalExercises} ejercicios planificados` : 'Esquema estructurado por días'}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isAssigningRoutine || isCurrent}
                        onClick={() => handleAssignExistingRoutine(rout.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                            : 'bg-brand hover:bg-brand-dark text-white shadow-glow-red'
                        }`}
                      >
                        {isAssigningRoutine ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : isCurrent ? (
                          <span>Ya Asignada</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Asignar con 1 Clic</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con opción de crear personalizada */}
            <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-between shrink-0 text-xs">
              <span className="text-[11px] text-zinc-400">¿Prefieres armarla desde cero?</span>
              <button
                type="button"
                onClick={() => {
                  setIsAssignExistingModalOpen(false);
                  handleGoToRoutineCreator();
                }}
                className="text-brand-light font-bold hover:underline flex items-center gap-1"
              >
                <span>Ir al Creador</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
