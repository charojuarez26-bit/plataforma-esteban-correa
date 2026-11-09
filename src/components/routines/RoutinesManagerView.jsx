import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  Dumbbell, 
  Users, 
  Clock, 
  CheckCircle2, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft,
  Trash2, 
  X, 
  Search, 
  Check, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  Edit3, 
  UserPlus, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  HeartPulse
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import ClientAvatar from '../common/ClientAvatar';

// Generador seguro de identificadores únicos para evitar colisiones de keys en React
const generateUniqueId = (prefix = '') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return prefix ? `${prefix}-${crypto.randomUUID()}` : crypto.randomUUID();
  }
  return `${prefix ? `${prefix}-` : ''}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Formatea el nombre genérico del día sin referencias a días de la semana (Lunes, Martes, etc.)
const formatGenericDayTitle = (dayObj, index) => {
  const dayNumber = (index !== null && index !== undefined) ? index + 1 : (dayObj?.dia_numero || 1);
  const basePrefix = `Día ${dayNumber}`;
  
  if (!dayObj) return basePrefix;

  let raw = (dayObj.dia || dayObj.dia_nombre || '').trim();
  if (!raw) return basePrefix;

  // Limpiar cualquier residuo de días de la semana y formato viejo
  raw = raw.replace(/\((Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\)/gi, '').trim();
  raw = raw.replace(/:\s*Sesión\s*\d+/gi, '').trim();

  // Quitar prefijo "Día \d+:" o "Dia \d+ -" inicial para obtener únicamente el detalle/enfoque muscular
  const cleanDetail = raw.replace(/^(Día|Dia)\s*\d+[\s:–-]*/i, '').trim();

  if (cleanDetail && cleanDetail !== `Día ${dayNumber}` && cleanDetail !== `Sesión ${dayNumber}`) {
    return `${basePrefix} - ${cleanDetail}`;
  }
  return basePrefix;
};

export default function RoutinesManagerView({ onNavigateToClient, initialClientId, onClearInitialClientId }) {
  const [routines, setRoutines] = useState([]);
  const [clients, setClients] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de la vista principal
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todas'); // 'Todas' | '3 Días' | '4 Días' | '5 Días' | 'Plantillas'

  // Modal Constructor / Editor de Rutina
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null); // null = Crear nueva, string = Editar existente
  const [currentStep, setCurrentStep] = useState(1); // 1: Datos Generales, 2: Hub de Días (guardado final)
  const [mobileTab, setMobileTab] = useState('library'); // 'library' | 'sequence'
  const [routineForm, setRoutineForm] = useState({
    nombre: '',
    descripcion: '',
    destinatarioTipo: 'plantilla', // 'plantilla' | 'alumno'
    client_id: '',
    frecuenciaDias: 3
  });
  const [routineDays, setRoutineDays] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(null); // null = Hub de días, número = Editor de Día

  // Buscador de ejercicios dentro del editor
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('Todos');

  // Modal Rápido: Asignar a Alumno
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [routineToAssign, setRoutineToAssign] = useState(null);
  const [targetClientId, setTargetClientId] = useState('');

  // Modal de Confirmación: Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState(null);

  // Estados de carga y feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', text: '' }

  // Ficha médica del alumno seleccionado
  const [selectedStudentMedical, setSelectedStudentMedical] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      const foundClient = clients.find(c => c.id === initialClientId);
      if (foundClient) {
        handleOpenCreateModal(foundClient);
      }
      if (onClearInitialClientId) onClearInitialClientId();
    }
  }, [initialClientId, clients]);

  useEffect(() => {
    const fetchMedical = async () => {
      const targetId = (isAssignModalOpen && targetClientId) 
        ? targetClientId 
        : (routineForm.destinatarioTipo === 'alumno' ? routineForm.client_id : null);

      if (targetId) {
        try {
          const med = await dataService.getMedicalRecord(targetId);
          setSelectedStudentMedical(med);
        } catch {
          setSelectedStudentMedical(null);
        }
      } else {
        setSelectedStudentMedical(null);
      }
    };
    fetchMedical();
  }, [routineForm.client_id, routineForm.destinatarioTipo, targetClientId, isAssignModalOpen]);

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [routList, cliList, exList] = await Promise.all([
        dataService.getAllRoutines(),
        dataService.getClients(),
        dataService.getExercises('Todos')
      ]);

      setRoutines(routList || []);
      setClients(cliList || []);
      setExercises(exList || []);
    } catch (err) {
      console.error('Error cargando datos de rutinas:', err);
      showNotification('Error al conectar con Supabase', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // APERTURA DEL EDITOR (NUEVA O EDICIÓN)
  // ==========================================================
  const handleOpenCreateModal = (targetClient = null) => {
    setEditingRoutineId(null);
    setExerciseSearch('');
    setSelectedMuscleFilter('Todos');

    const defaultDaysCount = targetClient?.dias_por_semana || 3;

    // Generación de nombres genéricos agnósticos al calendario (Día 1, Día 2, etc.)
    const initialDays = Array.from({ length: defaultDaysCount }, (_, idx) => {
      const defaultName = `Día ${idx + 1}`;
      return {
        id: generateUniqueId('day'),
        dia_numero: idx + 1,
        dia_nombre: defaultName,
        dia: defaultName,
        dia_semana: defaultName,
        ejercicios: []
      };
    });

    setRoutineForm({
      nombre: targetClient 
        ? `Rutina Personalizada - ${targetClient.nombre_completo}` 
        : 'Rutina de Fuerza e Hipertrofia',
      descripcion: targetClient?.objetivo || 'Sobrecarga progresiva y enfoque en hipertrofia muscular.',
      destinatarioTipo: targetClient ? 'alumno' : 'plantilla',
      client_id: targetClient ? targetClient.id : '',
      frecuenciaDias: defaultDaysCount
    });

    setRoutineDays(initialDays);
    setActiveDayIndex(null);
    setCurrentStep(1);
    setMobileTab('library');
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (routine) => {
    setEditingRoutineId(routine.id);
    setExerciseSearch('');
    setSelectedMuscleFilter('Todos');

    const count = routine.dias ? routine.dias.length : (routine.dias_por_semana || 3);
    const isTemplate = Boolean(routine.es_plantilla || !routine.client_id || routine.client_id === '00000000-0000-0000-0000-000000000000');

    setRoutineForm({
      nombre: routine.nombre,
      descripcion: routine.descripcion || routine.objetivo || '',
      destinatarioTipo: isTemplate ? 'plantilla' : 'alumno',
      client_id: isTemplate ? '' : (routine.client_id || ''),
      frecuenciaDias: count
    });

    // Clonar días y ejercicios con IDs únicos garantizados y nombres limpios sin días de la semana
    const clonedDays = (routine.dias || []).map((d, dIdx) => {
      const defaultName = `Día ${dIdx + 1}`;
      let cleanDia = (d.dia || d.dia_nombre || defaultName).trim();
      cleanDia = cleanDia.replace(/\((Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\)/gi, '').trim();
      cleanDia = cleanDia.replace(/:\s*Sesión\s*\d+/gi, '').trim();
      if (!cleanDia || cleanDia === `Día ${dIdx + 1}`) {
        cleanDia = defaultName;
      }

      return {
        id: generateUniqueId('day'),
        dia_numero: d.dia_numero || dIdx + 1,
        dia_nombre: cleanDia,
        dia: cleanDia,
        dia_semana: defaultName,
        ejercicios: (d.ejercicios || []).map((e, eIdx) => ({
          id: generateUniqueId('item'),
          exercise_id: e.exercise?.id || e.exercise_id,
          exercise: e.exercise,
          series: parseInt(e.series, 10) || 4,
          repeticiones: e.repeticiones || '10-12',
          peso_sugerido: e.peso_raw !== null && e.peso_raw !== undefined ? e.peso_raw : (e.peso_sugerido || ''),
          descanso_seg: e.descanso_seg || e.descanso_segundos || 90
        }))
      };
    });

    setRoutineDays(clonedDays);
    setActiveDayIndex(null);
    setCurrentStep(1);
    setMobileTab('library');
    setIsEditorOpen(true);
  };

  // Ajustar frecuencia de días en el editor (generación estrictamente genérica: Día 1, Día 2, etc.)
  const handleSetFrequency = (newCount) => {
    if (newCount < 1 || newCount > 7) return;

    setRoutineForm(prev => ({ ...prev, frecuenciaDias: newCount }));

    setRoutineDays(prevDays => {
      const currentLength = prevDays.length;
      if (newCount === currentLength) return prevDays;

      if (newCount > currentLength) {
        // Añadir días adicionales con nombres genéricos
        const addedDays = Array.from({ length: newCount - currentLength }, (_, i) => {
          const nextIdx = currentLength + i;
          const defaultName = `Día ${nextIdx + 1}`;
          return {
            id: generateUniqueId('day'),
            dia_numero: nextIdx + 1,
            dia_nombre: defaultName,
            dia: defaultName,
            dia_semana: defaultName,
            ejercicios: []
          };
        });
        return [...prevDays, ...addedDays];
      } else {
        // Recortar días al nuevo límite
        return prevDays.slice(0, newCount);
      }
    });

    if (activeDayIndex !== null && activeDayIndex >= newCount) {
      setActiveDayIndex(null);
    }
  };

  // Modificar título del día activo
  const handleUpdateDayName = (dayIdx, newTitle) => {
    setRoutineDays(prev => {
      const copy = [...prev];
      if (copy[dayIdx]) {
        copy[dayIdx].dia = newTitle;
        copy[dayIdx].dia_nombre = newTitle;
      }
      return copy;
    });
  };

  // Agregar ejercicio al día activo con ID único seguro e inmutabilidad estricta
  const handleAddExerciseToCurrentDay = (e, exercise) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (routineDays.length === 0) return;

    const uniqueId = generateUniqueId('item');
    const newItem = {
      id: uniqueId,
      instanceId: uniqueId,
      exercise_id: exercise.id,
      exercise: exercise,
      series: exercise.series || 4,
      repeticiones: exercise.repeticiones || exercise.reps || '10-12',
      peso_sugerido: exercise.peso_sugerido || exercise.carga || 70,
      descanso_seg: exercise.descanso_seg || exercise.descanso || 90
    };

    setRoutineDays(prev => 
      prev.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        return {
          ...day,
          ejercicios: [...(day.ejercicios || []), newItem]
        };
      })
    );
  };

  // Quitar ejercicio del día activo
  const handleRemoveExercise = (exerciseIdx) => {
    setRoutineDays(prev => {
      const copy = [...prev];
      if (copy[activeDayIndex]) {
        copy[activeDayIndex].ejercicios.splice(exerciseIdx, 1);
      }
      return copy;
    });
  };

  // Reordenar ejercicios (Subir)
  const handleMoveExerciseUp = (exerciseIdx) => {
    if (exerciseIdx === 0) return;
    setRoutineDays(prev => {
      const copy = [...prev];
      const list = copy[activeDayIndex].ejercicios;
      const temp = list[exerciseIdx - 1];
      list[exerciseIdx - 1] = list[exerciseIdx];
      list[exerciseIdx] = temp;
      return copy;
    });
  };

  // Reordenar ejercicios (Bajar)
  const handleMoveExerciseDown = (exerciseIdx) => {
    setRoutineDays(prev => {
      const copy = [...prev];
      const list = copy[activeDayIndex].ejercicios;
      if (exerciseIdx === list.length - 1) return prev;
      const temp = list[exerciseIdx + 1];
      list[exerciseIdx + 1] = list[exerciseIdx];
      list[exerciseIdx] = temp;
      return copy;
    });
  };

  // Modificar parámetro del ejercicio
  const handleUpdateExerciseParam = (exerciseIdx, field, val) => {
    setRoutineDays(prev => {
      const copy = [...prev];
      if (copy[activeDayIndex] && copy[activeDayIndex].ejercicios[exerciseIdx]) {
        copy[activeDayIndex].ejercicios[exerciseIdx][field] = val;
      }
      return copy;
    });
  };

  // Guardar Rutina en Supabase con recarga de estado reactiva
  const handleSaveRoutineSubmit = async (e) => {
    e.preventDefault();
    if (!routineForm.nombre.trim()) {
      showNotification('Por favor indica un nombre para la rutina', 'error');
      return;
    }

    if (routineForm.destinatarioTipo === 'alumno') {
      if (!routineForm.client_id || routineForm.client_id === '00000000-0000-0000-0000-000000000000') {
        showNotification('Por favor selecciona un alumno válido para asignar la rutina', 'error');
        return;
      }
    }

    const totalExercises = routineDays.reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);
    if (totalExercises === 0) {
      showNotification('Por favor agrega al menos un ejercicio a la rutina antes de guardar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nombre: routineForm.nombre.trim(),
        descripcion: routineForm.descripcion.trim(),
        client_id: routineForm.destinatarioTipo === 'alumno' ? routineForm.client_id : '00000000-0000-0000-0000-000000000000',
        es_plantilla: routineForm.destinatarioTipo === 'plantilla',
        activa: true
      };

      const saved = await dataService.saveRoutine(payload, routineDays, editingRoutineId);

      // Recarga reactiva en tiempo real sin recargar página
      await loadAllData();

      setIsEditorOpen(false);
      showNotification(
        editingRoutineId
          ? `Rutina "${saved.nombre}" actualizada con éxito en Supabase`
          : `Rutina "${saved.nombre}" guardada y sincronizada con éxito`,
        'success'
      );
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
      const errorMsg = err?.message || 'Error al persistir la rutina en Supabase';
      showNotification(`Error: ${errorMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // ACCIÓN RÁPIDA: ASIGNAR RUTINA A ALUMNO
  // ==========================================================
  const handleOpenAssignModal = (routine) => {
    setRoutineToAssign(routine);
    setTargetClientId('');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignRoutine = async () => {
    if (!routineToAssign || !targetClientId) {
      showNotification('Por favor selecciona un alumno para asignar la rutina', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const assigned = await dataService.assignRoutineToClient(routineToAssign.id, targetClientId);
      await loadAllData();
      setIsAssignModalOpen(false);
      showNotification(`¡Rutina asignada exitosamente a ${assigned.client?.nombre_completo || 'Alumno'}!`);
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
      showNotification(`Error al asignar rutina: ${err?.message || 'Fallo de conexión'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // ACCIÓN RÁPIDA: ELIMINAR RUTINA
  // ==========================================================
  const handleOpenDeleteModal = (routine) => {
    setRoutineToDelete(routine);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!routineToDelete) return;

    const routineId = routineToDelete.id;
    const routineName = routineToDelete.nombre;

    setIsSubmitting(true);
    try {
      // 1. Ejecutar y esperar eliminación confirmada en Supabase directamente sobre la tabla routines
      await dataService.deleteRoutine(routineId);

      // 2. Solo tras confirmación exitosa de Supabase (!error), actualizar estado local
      setRoutines(prev => prev.filter(r => r.id !== routineId));

      setIsDeleteModalOpen(false);
      setRoutineToDelete(null);
      showNotification(`Rutina "${routineName}" eliminada correctamente.`);
    } catch (err) {
      console.error('Error detallado de Supabase al eliminar rutina:', err);
      showNotification(`Error al eliminar: ${err?.message || 'No se pudo eliminar la rutina en Supabase'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // FILTRADO DINÁMICO DE RUTINAS
  // ==========================================================
  const filteredRoutines = useMemo(() => {
    return routines.filter(r => {
      const totalDays = r.dias ? r.dias.length : (r.dias_por_semana || 3);
      const isTemplate = Boolean(r.es_plantilla || !r.client_id || r.client_id === '00000000-0000-0000-0000-000000000000');
      const clientName = r.client?.nombre_completo || '';

      // Filtro de pestañas
      if (selectedFilter === 'Plantillas' && !isTemplate) return false;
      if (selectedFilter === '3 Días' && totalDays !== 3) return false;
      if (selectedFilter === '4 Días' && totalDays !== 4) return false;
      if (selectedFilter === '5 Días' && totalDays !== 5) return false;

      // Filtro de texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = r.nombre?.toLowerCase().includes(query);
        const matchDesc = r.descripcion?.toLowerCase().includes(query);
        const matchClient = clientName.toLowerCase().includes(query);
        const matchCode = (r.client?.access_code || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchClient && !matchCode) return false;
      }

      return true;
    });
  }, [routines, selectedFilter, searchTerm]);

  // Contadores para las píldoras de filtro
  const filterCounts = useMemo(() => {
    const total = routines.length;
    const d3 = routines.filter(r => (r.dias?.length || r.dias_por_semana || 3) === 3).length;
    const d4 = routines.filter(r => (r.dias?.length || r.dias_por_semana || 3) === 4).length;
    const d5 = routines.filter(r => (r.dias?.length || r.dias_por_semana || 3) === 5).length;
    const templates = routines.filter(r => r.es_plantilla || !r.client_id || r.client_id === '00000000-0000-0000-0000-000000000000').length;
    return { total, d3, d4, d5, templates };
  }, [routines]);

  // Grupos musculares para el selector del modal
  const dynamicMuscleGroups = useMemo(() => {
    const base = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core / Abdomen', 'Glúteos'];
    const custom = new Set();
    exercises.forEach(ex => {
      if (ex.grupo_muscular && !base.includes(ex.grupo_muscular)) {
        custom.add(ex.grupo_muscular);
      }
    });
    return [...base, ...Array.from(custom)];
  }, [exercises]);

  const filteredExercisesForSelector = exercises.filter(ex => {
    const matchSearch = ex.nombre.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchGroup = selectedMuscleFilter === 'Todos' || 
      (ex.grupo_muscular || '').toLowerCase() === selectedMuscleFilter.toLowerCase() ||
      (selectedMuscleFilter === 'Core / Abdomen' && (ex.grupo_muscular || '').toLowerCase() === 'core') ||
      (selectedMuscleFilter === 'Core' && (ex.grupo_muscular || '').toLowerCase() === 'core / abdomen');
    return matchSearch && matchGroup;
  });

  const currentActiveDay = activeDayIndex !== null ? (routineDays[activeDayIndex] || null) : null;
  const isDayEditorOpen = currentStep === 2 && activeDayIndex !== null && Boolean(currentActiveDay);
  const totalModalExercisesCount = routineDays.reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);
  const selectedFormClient = clients.find(c => c.id === routineForm.client_id);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs sm:text-sm font-semibold transition-all animate-slide-down ${
          notification.type === 'error'
            ? 'bg-red-950/95 border-red-800 text-red-200'
            : 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
        }`}>
          {notification.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* 1. CABECERA Y ACCIÓN PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-light">
              <Dumbbell className="w-5 h-5" />
            </div>
            Gestión y Creador de Rutinas
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Diseña planes semanales, administra plantillas oficiales y asigna sesiones personalizadas en Supabase.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Crear Nueva Rutina</span>
        </button>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS: BUSCADOR Y FILTROS POR DÍAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Buscador de texto en tiempo real */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por nombre, alumno o ejercicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 pl-9 focus:outline-none focus:border-brand min-h-[42px]"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Píldoras de filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'Todas', label: `Todas (${filterCounts.total})` },
            { id: '3 Días', label: `3 Días (${filterCounts.d3})` },
            { id: '4 Días', label: `4 Días (${filterCounts.d4})` },
            { id: '5 Días', label: `5 Días (${filterCounts.d5})` },
            { id: 'Plantillas', label: `Plantillas (${filterCounts.templates})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-2 rounded-xl font-bold shrink-0 transition-all min-h-[38px] ${
                selectedFilter === f.id
                  ? 'bg-brand text-white shadow-glow-red'
                  : 'bg-dark-900 hover:bg-dark-800 text-gray-400 hover:text-white border border-dark-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. GRID DE TARJETAS DE RUTINAS */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="card-dark rounded-2xl p-5 border border-white/5 animate-pulse space-y-4">
              <div className="h-6 bg-dark-800 rounded w-2/3"></div>
              <div className="h-16 bg-dark-800 rounded"></div>
              <div className="h-10 bg-dark-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="card-dark rounded-2xl p-12 text-center border-2 border-dashed border-dark-700 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light mx-auto">
            <Dumbbell className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No se encontraron rutinas</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              {searchTerm 
                ? `No hay rutinas que coincidan con "${searchTerm}". Prueba con otros términos.` 
                : 'Crea tu primera rutina de entrenamiento o utiliza una plantilla base.'}
            </p>
          </div>
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Rutina Ahora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutines.map((routine) => {
            const isTemplate = Boolean(routine.es_plantilla || !routine.client_id || routine.client_id === '00000000-0000-0000-0000-000000000000');
            const clientData = routine.client || clients.find(c => c.id === routine.client_id);
            const totalDays = routine.dias ? routine.dias.length : (routine.dias_por_semana || 3);
            const totalExercises = routine.total_ejercicios || routine.dias?.reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0) || 0;

            return (
              <div
                key={routine.id}
                className="card-dark rounded-2xl p-5 card-dark-hover flex flex-col justify-between space-y-4 border border-white/5 shadow-lg group relative transition-all"
              >
                <div>
                  {/* Cabecera de la Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand-light shrink-0">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-brand-light transition-colors line-clamp-1">
                          {routine.nombre}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {totalDays} Días / Sem • {totalExercises} ejercicios
                        </p>
                      </div>
                    </div>

                    {/* Badge Estado / Plantilla */}
                    {isTemplate ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        <Sparkles className="w-3 h-3" /> Plantilla
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                        Asignada
                      </span>
                    )}
                  </div>

                  {/* Descripción / Objetivo */}
                  <p className="text-xs text-gray-300 mt-3 line-clamp-2">
                    {routine.descripcion || routine.objetivo || 'Rutina estructurada con progresión de cargas.'}
                  </p>

                  {/* Tarjeta de Destinatario */}
                  <div className="mt-3.5 p-3 rounded-xl bg-dark-900 border border-dark-700/80 text-xs">
                    {isTemplate ? (
                      <div className="flex items-center gap-2.5 text-zinc-300">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-bold text-white text-[11px]">Plantilla Oficial Reutilizable</p>
                          <p className="text-[10px] text-zinc-400">Asígnala a cualquier atleta con 1 clic</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <ClientAvatar
                            client={clientData}
                            name={clientData?.nombre_completo || 'Alumno'}
                            size="sm"
                            rounded="rounded-lg"
                          />
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">Asignada a:</span>
                            <p className="font-bold text-white text-xs truncate">
                              {clientData?.nombre_completo || 'Alumno'}
                            </p>
                          </div>
                        </div>

                        <span className="font-mono text-[10px] text-brand-light font-bold bg-brand/10 px-2 py-0.5 rounded border border-brand/20 shrink-0">
                          {clientData?.access_code || 'ACTIVO'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Resumen de Días */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(routine.dias || []).map((d, dIdx) => (
                      <span
                        key={d.id || `routine-${routine.id}-day-${dIdx}`}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-dark-800 border border-dark-700 text-zinc-300"
                      >
                        {formatGenericDayTitle(d, dIdx)} ({d.ejercicios?.length || 0})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Acciones Rápidas Inferiores */}
                <div className="pt-3 border-t border-dark-700/70 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(routine)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors"
                      title="Editar rutina y ejercicios"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(routine)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-brand/10 text-brand-light hover:text-white font-bold flex items-center gap-1.5 transition-colors"
                      title="Asignar o clonar a un alumno"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Asignar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isTemplate && clientData?.id && (
                      <button
                        type="button"
                        onClick={() => onNavigateToClient && onNavigateToClient(clientData.id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white"
                        title="Ver en Perfil del Alumno"
                      >
                        <ChevronRight className="w-4 h-4 text-brand" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(routine)}
                      className="p-1.5 rounded-lg hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Eliminar rutina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. WIZARD PRINCIPAL (PASO 1 Y HUB DE SESIONES)             */}
      {/* ========================================================== */}
      {isEditorOpen && !isDayEditorOpen && (
        <div className="fixed inset-0 z-50 w-full h-full bg-gray-950 md:bg-black/85 md:backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] flex flex-col p-0 md:p-6 overflow-hidden rounded-none md:rounded-2xl bg-gray-950 md:bg-dark-850 md:border md:border-dark-700 md:shadow-2xl relative animate-scale">
            
            {/* Header: Sticky top-0 (Wizard Principal) */}
            <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-800 p-4 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep > 1) {
                      setCurrentStep(1);
                    } else {
                      setIsEditorOpen(false);
                    }
                  }}
                  className="p-2 -ml-1 rounded-xl text-zinc-300 hover:text-white bg-dark-800 border border-dark-700 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                  aria-label="Volver o cerrar"
                  title={currentStep > 1 ? "Paso anterior" : "Cerrar"}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-light bg-brand/15 px-2 py-0.5 rounded-full border border-brand/30">
                    Paso {currentStep} de 2
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-1">
                    {currentStep === 1 ? 'Detalles de la Rutina' : `Estructura de Días (${totalModalExercisesCount} ej.)`}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-dark-800 border border-transparent hover:border-dark-700 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                aria-label="Cerrar creador"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenedor del Formulario con Scroll Interno */}
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
              <div className="overflow-y-auto no-scrollbar flex-1 px-4 py-4 md:p-4 space-y-5 pb-28">

                {/* ======================================================== */}
                {/* PASO 1: DATOS GENERALES                                  */}
                {/* ======================================================== */}
                {currentStep === 1 && (
                  <div className="space-y-4 max-w-2xl mx-auto w-full py-2">
                    <div className="text-left space-y-1 pb-1">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-light" />
                        Paso 1: Datos Generales
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Define el nombre, a quién va dirigida la planificación y su frecuencia semanal.
                      </p>
                    </div>

                    {/* 1. Nombre de la Rutina */}
                    <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700 space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-200">
                        1. Nombre de la Rutina *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Hipertrofia 4 días, Fuerza y Potencia..."
                        value={routineForm.nombre}
                        onChange={(e) => setRoutineForm({ ...routineForm, nombre: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-brand font-medium min-h-[48px]"
                      />
                    </div>

                    {/* 2. Destinatario / Alumno */}
                    <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700 space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-200">
                        2. Destinatario / Alumno
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRoutineForm({ ...routineForm, destinatarioTipo: 'plantilla', client_id: '' })}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all min-h-[48px] ${
                            routineForm.destinatarioTipo === 'plantilla'
                              ? 'bg-brand/15 border-brand text-white shadow-glow-red/20'
                              : 'bg-dark-900 border-dark-700 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Sparkles className={`w-5 h-5 shrink-0 ${routineForm.destinatarioTipo === 'plantilla' ? 'text-brand-light' : 'text-zinc-500'}`} />
                          <div>
                            <span className="text-xs font-bold block text-white">🌟 Plantilla General</span>
                            <span className="text-[10px] text-zinc-400">Reutilizable para cualquier alumno</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRoutineForm({ ...routineForm, destinatarioTipo: 'alumno' })}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all min-h-[48px] ${
                            routineForm.destinatarioTipo === 'alumno'
                              ? 'bg-brand/15 border-brand text-white shadow-glow-red/20'
                              : 'bg-dark-900 border-dark-700 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Users className={`w-5 h-5 shrink-0 ${routineForm.destinatarioTipo === 'alumno' ? 'text-brand-light' : 'text-zinc-500'}`} />
                          <div>
                            <span className="text-xs font-bold block text-white">👤 Alumno Específico</span>
                            <span className="text-[10px] text-zinc-400">Se asigna a su app directamente</span>
                          </div>
                        </button>
                      </div>

                      {routineForm.destinatarioTipo === 'alumno' && (
                        <div className="pt-2 space-y-2">
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Seleccionar Alumno del Directorio:
                          </label>
                          <select
                            required
                            value={routineForm.client_id}
                            onChange={(e) => setRoutineForm({ ...routineForm, client_id: e.target.value })}
                            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand font-medium min-h-[48px]"
                          >
                            <option value="">-- Elige un alumno --</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nombre_completo} ({c.access_code}) • {c.modalidad}
                              </option>
                            ))}
                          </select>

                          {/* BARRA DE ALERTAS DE SALUD EN VIVO */}
                          {routineForm.client_id && (
                            selectedStudentMedical ? (
                              <div className="p-3.5 rounded-xl bg-gray-950/90 border border-dark-700 space-y-2 text-xs animate-in fade-in">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                                    <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                                    Ficha de Salud del Alumno
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    Ficha Completa
                                  </span>
                                </div>

                                {/* Chips destacados de lesiones */}
                                {(() => {
                                  const lesionesValidas = Array.isArray(selectedStudentMedical.lesiones)
                                    ? selectedStudentMedical.lesiones.filter(z => z && z !== 'Ninguna')
                                    : [];

                                  if (lesionesValidas.length > 0) {
                                    return (
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap gap-1.5">
                                          {lesionesValidas.map((zona, idx) => (
                                            <span 
                                              key={idx}
                                              className="px-2 py-0.5 rounded-lg text-xs font-black bg-red-950/80 text-red-300 border border-red-500/50 flex items-center gap-1 shadow-sm"
                                            >
                                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                                              <span>⚠️ Lesión: {zona}</span>
                                            </span>
                                          ))}
                                        </div>
                                        {selectedStudentMedical.detalle_lesiones && (
                                          <p className="text-[11px] text-red-200/90 font-medium pt-0.5">
                                            <b>Detalle:</b> {selectedStudentMedical.detalle_lesiones}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-xl">
                                      <span>✅ Sin lesiones ni molestias reportadas por el alumno.</span>
                                    </div>
                                  );
                                })()}

                                {/* Condiciones o alergias en amarillo */}
                                {(selectedStudentMedical.condiciones_cronicas || selectedStudentMedical.alergias || selectedStudentMedical.medicamentos) && (
                                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-0.5">
                                    {selectedStudentMedical.condiciones_cronicas && (
                                      <p><b>Condición:</b> {selectedStudentMedical.condiciones_cronicas}</p>
                                    )}
                                    {selectedStudentMedical.alergias && (
                                      <p><b>Alergias:</b> {selectedStudentMedical.alergias}</p>
                                    )}
                                    {selectedStudentMedical.medicamentos && (
                                      <p><b>Medicación:</b> {selectedStudentMedical.medicamentos}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>El alumno aún no completó su ficha médica inicial.</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3. Frecuencia Semanal (1 a 6 días) */}
                    <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-200">
                          3. Frecuencia Semanal
                        </label>
                        <span className="text-xs font-bold text-brand-light">
                          {routineForm.frecuenciaDias} Días por semana
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => handleSetFrequency(cnt)}
                            className={`py-3 px-1 rounded-xl text-sm font-bold text-center transition-all min-h-[48px] flex flex-col items-center justify-center ${
                              routineForm.frecuenciaDias === cnt
                                ? 'bg-brand text-white shadow-glow-red scale-[1.03]'
                                : 'bg-dark-900 hover:bg-dark-800 text-zinc-400 border border-dark-700'
                            }`}
                          >
                            <span className="text-base font-black leading-none">{cnt}</span>
                            <span className="text-[10px] uppercase font-semibold mt-0.5 opacity-80">Día{cnt > 1 ? 's' : ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. Objetivo Opcional */}
                    <div className="card-dark rounded-2xl p-4 border border-dark-700 space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Descripción u Objetivo (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Enfoque en hipertrofia y sobrecarga progresiva"
                        value={routineForm.descripcion}
                        onChange={(e) => setRoutineForm({ ...routineForm, descripcion: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand font-medium min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* PASO 2: HUB DE ESTRUCTURA DE DÍAS                        */}
                {/* ======================================================== */}
                {currentStep === 2 && (
                  <div className="space-y-4 max-w-2xl mx-auto w-full py-2">
                    <div className="text-left space-y-1 pb-1">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-brand-light" />
                        Estructura de Días
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Toca una sesión para armar sus ejercicios. Cuando termines todas, guarda la rutina completa.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {routineDays.map((d, idx) => {
                        const count = d.ejercicios?.length || 0;
                        return (
                          <div
                            key={d.id || `hub-day-${idx}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => { setMobileTab('library'); setActiveDayIndex(idx); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setMobileTab('library');
                                setActiveDayIndex(idx);
                              }
                            }}
                            className="card-dark rounded-2xl p-4 border border-dark-700 hover:border-brand/50 cursor-pointer hover:bg-gray-800 transition-colors flex items-center justify-between gap-3 min-h-[72px]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 text-brand-light font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                  {formatGenericDayTitle(d, idx)}
                                </p>
                                <p className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${count > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  <Dumbbell className="w-3.5 h-3.5" />
                                  {count === 0
                                    ? 'Sin ejercicios cargados'
                                    : `${count} ${count === 1 ? 'ejercicio cargado' : 'ejercicios cargados'}`}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleSetFrequency(routineDays.length + 1)}
                        className="text-xs font-bold text-brand-light hover:text-white inline-flex items-center gap-1.5 p-2 rounded-xl hover:bg-dark-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir otra sesión a la semana</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* ======================================================== */}
              {/* BOTTOM ACTION BAR FIJA DEL WIZARD (Paso 1 y Paso 2 Hub)  */}
              {/* ======================================================== */}
              <div className="fixed md:sticky bottom-0 left-0 w-full bg-gray-900 border-t border-gray-800 p-4 z-20 shadow-2xl">
                <div className="max-w-2xl mx-auto w-full">
                  {/* PASO 1: Siguiente a Estructura */}
                  {currentStep === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!routineForm.nombre.trim()) {
                          showNotification('Por favor indica un nombre para la rutina', 'error');
                          return;
                        }
                        if (routineForm.destinatarioTipo === 'alumno' && !routineForm.client_id) {
                          showNotification('Por favor selecciona un alumno', 'error');
                          return;
                        }
                        setActiveDayIndex(null);
                        setCurrentStep(2);
                      }}
                      className="w-full py-3.5 px-6 rounded-xl text-base font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red transition-all flex items-center justify-center gap-2 min-h-[48px]"
                    >
                      <span>Siguiente: Estructura</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}

                  {/* PASO 2 (Hub): Atrás + Guardar Rutina completa */}
                  {currentStep === 2 && (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        disabled={isSubmitting}
                        className="py-3 px-4 rounded-xl text-sm font-bold text-zinc-300 hover:text-white bg-dark-800 border border-dark-700 transition-all flex items-center justify-center gap-1.5 min-h-[48px] disabled:opacity-50"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveRoutineSubmit}
                        disabled={isSubmitting}
                        className="py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-glow-red transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[48px]"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSubmitting ? 'Guardando...' : (editingRoutineId ? 'Guardar Cambios' : 'Guardar Rutina completa')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. SUB-VISTA: EDITOR DE DÍA A PANTALLA COMPLETA            */}
      {/* ========================================================== */}
      {isEditorOpen && isDayEditorOpen && currentActiveDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 md:bg-black/85 md:backdrop-blur-sm p-0 md:p-4">
          <div className="fixed inset-0 md:relative z-50 flex flex-col bg-gray-950 w-full h-full md:max-w-5xl md:max-h-[90vh] md:rounded-2xl md:border md:border-gray-800 md:shadow-2xl overflow-hidden">
            
            {/* 2. BLOQUE SUPERIOR FIJO (Header + Tabs) */}
            <div className="flex-none bg-gray-950 w-full border-b border-gray-800 z-10">
              
              {/* Header: Barra superior fija */}
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveDayIndex(null)}
                    className="px-3 py-2 -ml-1 rounded-xl text-xs font-bold text-zinc-200 hover:text-white bg-dark-800 border border-dark-700 min-h-[40px] flex items-center justify-center gap-1.5 shrink-0"
                    aria-label="Volver a Sesiones"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a Sesiones</span>
                  </button>

                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-light">
                      Editor de Día • {currentActiveDay.ejercicios?.length || 0} ej.
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5 truncate">
                      {formatGenericDayTitle(currentActiveDay, activeDayIndex)}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDayIndex(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-dark-800 border border-transparent hover:border-dark-700 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                  aria-label="Volver a Sesiones"
                  title="Volver a Sesiones"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* BARRA DE ALERTAS DE SALUD EN LA CABECERA DEL EDITOR DE DÍA */}
              {selectedStudentMedical && (
                <div className="mx-4 mb-3 p-2.5 rounded-xl bg-gray-950/90 border border-dark-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider flex items-center gap-1 mr-1">
                      <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                      Alertas de Salud:
                    </span>
                    {(() => {
                      const lesionesValidas = Array.isArray(selectedStudentMedical.lesiones)
                        ? selectedStudentMedical.lesiones.filter(z => z && z !== 'Ninguna')
                        : [];

                      if (lesionesValidas.length > 0) {
                        return lesionesValidas.map((zona, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-black bg-red-950/80 text-red-200 border border-red-500/50 flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>⚠️ Lesión: {zona}</span>
                          </span>
                        ));
                      }

                      return (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] px-2.5 py-1 rounded-lg">
                          <span>✅ Sin lesiones ni molestias reportadas</span>
                        </div>
                      );
                    })()}
                  </div>

                  {(selectedStudentMedical.condiciones_cronicas || selectedStudentMedical.alergias) && (
                    <span className="text-amber-300 font-bold text-[11px] bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      ⚠️ {[selectedStudentMedical.condiciones_cronicas, selectedStudentMedical.alergias].filter(Boolean).join(' • ')}
                    </span>
                  )}
                </div>
              )}

              {/* Selector de Pestañas Móviles (Fijo dentro del bloque superior, fondo coincidente y márgenes limpios p-4) */}
              <div className="px-4 pb-4 md:hidden">
                <div className="flex bg-dark-900 p-1 rounded-xl border border-dark-800 gap-1">
                  <button
                    type="button"
                    onClick={() => setMobileTab('library')}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[42px] ${
                      mobileTab === 'library'
                        ? 'bg-brand text-white shadow-glow-red'
                        : 'text-zinc-400 hover:text-white hover:bg-dark-850'
                    }`}
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>1. Biblioteca</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileTab('sequence')}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[42px] ${
                      mobileTab === 'sequence'
                        ? 'bg-brand text-white shadow-glow-red'
                        : 'text-zinc-400 hover:text-white hover:bg-dark-850'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>2. Configurar ({currentActiveDay.ejercicios?.length || 0} ej.)</span>
                  </button>
                </div>
              </div>

            </div>

            {/* 3. ÁREA DE CONTENIDO SCROLLEABLE (Lista de Ejercicios y Biblioteca) */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
              
              {/* Enfoque / Título editable de la Sesión */}
              <div className="p-3 mb-4 rounded-xl bg-dark-900 border border-dark-700 space-y-1">
                <label className="block text-[10px] uppercase font-bold text-brand-light">
                  Enfoque / Título de la Sesión
                </label>
                <input
                  type="text"
                  value={currentActiveDay.dia}
                  onChange={(e) => handleUpdateDayName(activeDayIndex, e.target.value)}
                  placeholder={`Ej: Día ${activeDayIndex + 1} - Pecho y Tríceps`}
                  className="w-full bg-dark-850 border border-dark-700 rounded-lg px-3 py-2 text-base sm:text-sm font-bold text-white focus:outline-none focus:border-brand min-h-[44px]"
                />
              </div>

              {/* Grid: Biblioteca de Ejercicios (Izq) + Secuencia (Der) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Columna Izquierda: Biblioteca de Ejercicios */}
                <div className={`${mobileTab === 'library' ? 'block' : 'hidden'} md:block md:col-span-5 space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Biblioteca de Ejercicios
                    </span>
                    <span className="text-[10px] text-zinc-400">Toca "+ Agregar"</span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar ejercicio..."
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-gray-500 pl-9 focus:outline-none focus:border-brand min-h-[44px]"
                    />
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                  </div>

                  {/* Píldoras de grupo muscular */}
                  <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] no-scrollbar">
                    {dynamicMuscleGroups.map(grp => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setSelectedMuscleFilter(grp)}
                        className={`px-3 py-1.5 rounded-lg shrink-0 font-medium ${
                          selectedMuscleFilter === grp ? 'bg-brand text-white font-bold shadow-sm' : 'bg-dark-900 text-zinc-400'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>

                  {/* Lista de ejercicios */}
                  <div className="space-y-1.5 md:max-h-[calc(90vh-320px)] md:overflow-y-auto no-scrollbar pr-1">
                    {filteredExercisesForSelector.map(ex => {
                      const isAdded = (currentActiveDay.ejercicios || []).some(
                        item => item.exercise_id === ex.id || item.exercise?.id === ex.id
                      );

                      return (
                        <div
                          key={ex.id}
                          onClick={(e) => !isAdded && handleAddExerciseToCurrentDay(e, ex)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between group transition-all min-h-[48px] ${
                            isAdded
                              ? 'border-emerald-500/50 bg-emerald-500/10 cursor-default'
                              : 'border-dark-700 bg-dark-900 hover:bg-dark-800 hover:border-brand/40 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={ex.imagen_url}
                              alt={ex.nombre}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className={`text-xs font-bold truncate transition-colors ${
                                isAdded ? 'text-emerald-300' : 'text-white group-hover:text-brand-light'
                              }`}>
                                {ex.nombre}
                              </p>
                              <span className="text-[10px] text-zinc-400">{ex.grupo_muscular}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={(e) => handleAddExerciseToCurrentDay(e, ex)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 min-h-[36px] ${
                              isAdded
                                ? 'bg-emerald-600/80 text-white cursor-not-allowed opacity-80'
                                : 'bg-brand hover:bg-brand-dark text-white shadow-glow-red'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Agregado</span>
                              </>
                            ) : (
                              '+ Agregar'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Columna Derecha: Configuración de la Secuencia */}
                <div className={`${mobileTab === 'sequence' ? 'block' : 'hidden'} md:block md:col-span-7 space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Secuencia de {formatGenericDayTitle(currentActiveDay, activeDayIndex)} ({currentActiveDay.ejercicios?.length || 0} ej.)
                    </span>
                    <span className="text-[10px] text-zinc-400">Series, repes y descansos</span>
                  </div>

                  <div className="space-y-3 md:max-h-[calc(90vh-320px)] md:overflow-y-auto no-scrollbar pr-1">
                    {(currentActiveDay.ejercicios || []).map((item, idx) => (
                      <div
                        key={item.instanceId || item.id || `active-day-item-${activeDayIndex}-${idx}`}
                        className="p-3.5 sm:p-3 rounded-2xl md:rounded-xl bg-dark-900 border border-dark-700 space-y-3 shadow-md"
                      >
                        {/* Fila superior: Nombre del ejercicio y acciones */}
                        <div className="flex items-center justify-between gap-2 pb-1 border-b border-dark-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-brand/20 text-brand-light text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm md:text-xs font-bold text-white truncate">
                              {item.exercise?.nombre || 'Ejercicio'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveExerciseUp(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white disabled:opacity-20 min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="Subir orden"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveExerciseDown(idx)}
                              disabled={idx === currentActiveDay.ejercicios.length - 1}
                              className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white disabled:opacity-20 min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="Bajar orden"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(idx)}
                              className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/60 text-red-400 hover:text-red-300 ml-1 min-h-[36px] min-w-[36px] flex items-center justify-center border border-red-500/20"
                              title="Quitar ejercicio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Fila inferior: Grid 2 columnas en móvil, 4 en desktop */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left md:text-center">
                          {/* Columna 1: Series */}
                          <div className="bg-dark-850 p-2 rounded-xl border border-dark-750">
                            <span className="text-[11px] md:text-[10px] text-zinc-400 uppercase font-bold block mb-1">Series</span>
                            <input
                              type="number"
                              min="1"
                              value={item.series}
                              onChange={(e) => handleUpdateExerciseParam(idx, 'series', e.target.value)}
                              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 md:py-1.5 md:px-2 text-center text-base md:text-xs font-black text-white min-h-[44px] md:min-h-[38px] focus:outline-none focus:border-brand"
                            />
                          </div>

                          {/* Columna 1: Reps */}
                          <div className="bg-dark-850 p-2 rounded-xl border border-dark-750">
                            <span className="text-[11px] md:text-[10px] text-zinc-400 uppercase font-bold block mb-1">Reps</span>
                            <input
                              type="text"
                              value={item.repeticiones}
                              onChange={(e) => handleUpdateExerciseParam(idx, 'repeticiones', e.target.value)}
                              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 md:py-1.5 md:px-2 text-center text-base md:text-xs font-black text-white min-h-[44px] md:min-h-[38px] focus:outline-none focus:border-brand"
                            />
                          </div>

                          {/* Columna 2: Carga */}
                          <div className="bg-dark-850 p-2 rounded-xl border border-dark-750">
                            <span className="text-[11px] md:text-[10px] text-zinc-400 uppercase font-bold block mb-1">Carga (kg)</span>
                            <input
                              type="number"
                              step="0.5"
                              value={item.peso_sugerido}
                              onChange={(e) => handleUpdateExerciseParam(idx, 'peso_sugerido', e.target.value)}
                              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 md:py-1.5 md:px-2 text-center text-base md:text-xs font-black text-brand-light min-h-[44px] md:min-h-[38px] focus:outline-none focus:border-brand"
                            />
                          </div>

                          {/* Columna 2: Descanso */}
                          <div className="bg-dark-850 p-2 rounded-xl border border-dark-750">
                            <span className="text-[11px] md:text-[10px] text-zinc-400 uppercase font-bold block mb-1">Descanso (s)</span>
                            <input
                              type="number"
                              step="15"
                              value={item.descanso_seg}
                              onChange={(e) => handleUpdateExerciseParam(idx, 'descanso_seg', e.target.value)}
                              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 md:py-1.5 md:px-2 text-center text-base md:text-xs font-black text-white min-h-[44px] md:min-h-[38px] focus:outline-none focus:border-brand"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(currentActiveDay.ejercicios || []).length === 0 && (
                      <div className="p-8 text-center border-2 border-dashed border-dark-700 rounded-xl text-zinc-500 text-xs">
                        <Dumbbell className="w-8 h-8 mx-auto mb-2 text-dark-600" />
                        <p className="font-bold text-zinc-400">No hay ejercicios en esta sesión</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Abre la pestaña "1. Biblioteca" para agregar ejercicios a este día.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 5. MODAL RÁPIDO: ASIGNAR RUTINA A ALUMNO                    */}
      {/* ========================================================== */}
      {isAssignModalOpen && routineToAssign && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale space-y-4">
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-light shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Asignar Rutina a Alumno</h3>
                  <p className="text-xs text-gray-400">Vincular una copia activa a su perfil</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ficha de la rutina seleccionada */}
            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-light block">Rutina Seleccionada:</span>
              <p className="text-sm font-bold text-white">{routineToAssign.nombre}</p>
              <p className="text-xs text-zinc-400">
                {routineToAssign.dias?.length || 3} Días de entreno • {routineToAssign.total_ejercicios || 0} ejercicios
              </p>
            </div>

            {/* Selector de alumno */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                Seleccionar Alumno Destinatario *
              </label>
              <select
                value={targetClientId}
                onChange={(e) => setTargetClientId(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand font-medium min-h-[44px]"
              >
                <option value="">-- Elige el alumno --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} ({c.access_code}) • {c.modalidad}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">
                💡 Se clonará la rutina completa para este alumno y se activará inmediatamente en su portal.
              </p>

              {/* Alertas médicas en modal de asignación */}
              {targetClientId && (
                selectedStudentMedical ? (
                  <div className="p-3 rounded-xl bg-gray-950 border border-dark-750 text-xs space-y-1.5 mt-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                      Ficha de Salud del Alumno:
                    </span>
                    {(() => {
                      const lesionesValidas = Array.isArray(selectedStudentMedical.lesiones)
                        ? selectedStudentMedical.lesiones.filter(z => z && z !== 'Ninguna')
                        : [];

                      if (lesionesValidas.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1">
                            {lesionesValidas.map((zona, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-950/80 text-red-300 border border-red-500/40">
                                ⚠️ Lesión: {zona}
                              </span>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1.5 rounded-lg">
                          <span>✅ Sin lesiones ni molestias reportadas por el alumno.</span>
                        </div>
                      );
                    })()}
                    {(selectedStudentMedical.condiciones_cronicas || selectedStudentMedical.alergias) && (
                      <p className="text-amber-300 text-[11px]">
                        <b>Condiciones:</b> {[selectedStudentMedical.condiciones_cronicas, selectedStudentMedical.alergias].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mt-2">
                    ⚠️ El alumno aún no completó su ficha médica.
                  </div>
                )
              )}
            </div>

            {/* Botones de acción */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting || !targetClientId}
                onClick={handleConfirmAssignRoutine}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red transition-all flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Asignando...' : 'Confirmar Asignación'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 6. MODAL DE CONFIRMACIÓN: ELIMINAR RUTINA                   */}
      {/* ========================================================== */}
      {isDeleteModalOpen && routineToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar Rutina?</h3>
                <p className="text-xs text-gray-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Estás a punto de eliminar la rutina <strong>"{routineToDelete.nombre}"</strong> y todos sus ejercicios configurados de Supabase.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Eliminando...' : 'Eliminar Definitivamente'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}