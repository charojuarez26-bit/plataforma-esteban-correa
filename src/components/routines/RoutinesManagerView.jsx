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
  ExternalLink 
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import ClientAvatar from '../common/ClientAvatar';

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
  const [routineForm, setRoutineForm] = useState({
    nombre: '',
    descripcion: '',
    destinatarioTipo: 'plantilla', // 'plantilla' | 'alumno'
    client_id: '',
    frecuenciaDias: 3
  });
  const [routineDays, setRoutineDays] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

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
    const assignedDays = targetClient?.dias_asignados || ['Lunes', 'Miércoles', 'Viernes'];

    const initialDays = Array.from({ length: defaultDaysCount }, (_, idx) => {
      const dayName = assignedDays[idx] || (idx === 0 ? 'Lunes' : idx === 1 ? 'Miércoles' : idx === 2 ? 'Viernes' : `Día ${idx + 1}`);
      return {
        id: `d-${idx + 1}-${Date.now()}`,
        dia_numero: idx + 1,
        dia_nombre: `Día ${idx + 1} (${dayName}): Sesión ${idx + 1}`,
        dia: `Día ${idx + 1} (${dayName}): Sesión ${idx + 1}`,
        dia_semana: dayName,
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
    setActiveDayIndex(0);
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

    // Clonar días y ejercicios para edición limpia
    const clonedDays = (routine.dias || []).map((d, dIdx) => ({
      id: d.id || `d-${dIdx + 1}-${Date.now()}`,
      dia_numero: d.dia_numero || dIdx + 1,
      dia_nombre: d.dia_nombre || d.dia || `Día ${dIdx + 1}`,
      dia: d.dia || d.dia_nombre || `Día ${dIdx + 1}`,
      dia_semana: d.dia_semana || `Día ${dIdx + 1}`,
      ejercicios: (d.ejercicios || []).map((e, eIdx) => ({
        id: e.id || `item-${dIdx}-${eIdx}-${Date.now()}`,
        exercise_id: e.exercise?.id || e.exercise_id,
        exercise: e.exercise,
        series: e.series || 4,
        repeticiones: e.repeticiones || '10-12',
        peso_sugerido: e.peso_raw !== null && e.peso_raw !== undefined ? e.peso_raw : (e.peso_sugerido || ''),
        descanso_seg: e.descanso_seg || e.descanso_segundos || 90
      }))
    }));

    setRoutineDays(clonedDays);
    setActiveDayIndex(0);
    setIsEditorOpen(true);
  };

  // Ajustar frecuencia de días en el editor (3, 4 o 5 días, o añadir/quitar)
  const handleSetFrequency = (newCount) => {
    if (newCount < 1 || newCount > 7) return;

    setRoutineForm(prev => ({ ...prev, frecuenciaDias: newCount }));

    setRoutineDays(prevDays => {
      const currentLength = prevDays.length;
      if (newCount === currentLength) return prevDays;

      if (newCount > currentLength) {
        // Añadir días adicionales preservando los anteriores
        const addedDays = Array.from({ length: newCount - currentLength }, (_, i) => {
          const nextIdx = currentLength + i;
          const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
          const dayLabel = dayNames[nextIdx] || `Día ${nextIdx + 1}`;
          return {
            id: `d-${nextIdx + 1}-${Date.now()}`,
            dia_numero: nextIdx + 1,
            dia_nombre: `Día ${nextIdx + 1} (${dayLabel}): Sesión ${nextIdx + 1}`,
            dia: `Día ${nextIdx + 1} (${dayLabel}): Sesión ${nextIdx + 1}`,
            dia_semana: dayLabel,
            ejercicios: []
          };
        });
        return [...prevDays, ...addedDays];
      } else {
        // Recortar días al nuevo límite
        return prevDays.slice(0, newCount);
      }
    });

    if (activeDayIndex >= newCount) {
      setActiveDayIndex(newCount - 1);
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

  // Agregar ejercicio al día activo
  const handleAddExerciseToCurrentDay = (exercise) => {
    if (routineDays.length === 0) return;

    const newItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      exercise_id: exercise.id,
      exercise: exercise,
      series: 4,
      repeticiones: '10-12',
      peso_sugerido: 70,
      descanso_seg: 90
    };

    setRoutineDays(prev => {
      const copy = [...prev];
      const targetDay = copy[activeDayIndex];
      if (targetDay) {
        targetDay.ejercicios = [...(targetDay.ejercicios || []), newItem];
      }
      return copy;
    });
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

  // Guardar Rutina en Supabase
  const handleSaveRoutineSubmit = async (e) => {
    e.preventDefault();
    if (!routineForm.nombre.trim()) {
      alert('Por favor indica un nombre para la rutina');
      return;
    }

    if (routineForm.destinatarioTipo === 'alumno' && !routineForm.client_id) {
      alert('Por favor selecciona el alumno destinatario');
      return;
    }

    const totalExercises = routineDays.reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);
    if (totalExercises === 0) {
      alert('Por favor agrega al menos un ejercicio a la rutina antes de guardar.');
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

      // Actualizar listado local
      if (editingRoutineId) {
        setRoutines(prev => prev.map(r => r.id === editingRoutineId ? saved : r));
        showNotification(`Rutina "${saved.nombre}" actualizada con éxito en Supabase`);
      } else {
        setRoutines(prev => [saved, ...prev]);
        showNotification(`Rutina "${saved.nombre}" guardada con éxito en Supabase`);
      }

      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error guardando rutina:', err);
      showNotification('Error al guardar la rutina en Supabase', 'error');
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
      alert('Por favor selecciona un alumno');
      return;
    }

    setIsSubmitting(true);
    try {
      const assigned = await dataService.assignRoutineToClient(routineToAssign.id, targetClientId);
      setRoutines(prev => [assigned, ...prev]);
      setIsAssignModalOpen(false);
      showNotification(`¡Rutina asignada exitosamente a ${assigned.client?.nombre_completo || 'Alumno'}!`);
    } catch (err) {
      console.error('Error asignando rutina:', err);
      showNotification('Error al asignar la rutina en Supabase', 'error');
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

    setIsSubmitting(true);
    try {
      await dataService.deleteRoutine(routineToDelete.id);
      setRoutines(prev => prev.filter(r => r.id !== routineToDelete.id));
      setIsDeleteModalOpen(false);
      showNotification(`Rutina "${routineToDelete.nombre}" eliminada correctamente.`);
    } catch (err) {
      console.error('Error eliminando rutina:', err);
      showNotification('Error al eliminar la rutina', 'error');
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
    const custom = new Set();
    exercises.forEach(ex => {
      if (ex.grupo_muscular && !['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'].includes(ex.grupo_muscular)) {
        custom.add(ex.grupo_muscular);
      }
    });
    return ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', ...Array.from(custom)];
  }, [exercises]);

  const filteredExercisesForSelector = exercises.filter(ex => {
    const matchSearch = ex.nombre.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchGroup = selectedMuscleFilter === 'Todos' || (ex.grupo_muscular || '').toLowerCase() === selectedMuscleFilter.toLowerCase();
    return matchSearch && matchGroup;
  });

  const currentActiveDay = routineDays[activeDayIndex] || null;
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
                        key={dIdx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-dark-800 border border-dark-700 text-zinc-300"
                      >
                        {d.dia_semana || `Día ${dIdx + 1}`} ({d.ejercicios?.length || 0})
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
      {/* 4. MODAL CONSTRUCTOR / EDITOR GUIADO MULTIDÍA               */}
      {/* ========================================================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-4xl max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
            
            {/* Cabecera Fija */}
            <div className="flex items-start justify-between pb-3 border-b border-dark-700 shrink-0">
              <div className="pr-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-light bg-brand/15 px-2.5 py-0.5 rounded-full border border-brand/30 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {editingRoutineId ? 'Editor de Rutina' : 'Creador de Rutina'}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  {editingRoutineId ? `Modificar: ${routineForm.nombre}` : 'Diseñar Nueva Rutina de Entrenamiento'}
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                  Estructura las sesiones por día, agrega ejercicios desde la biblioteca y define series, reps y descanso.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white bg-dark-800 border border-dark-700 shrink-0"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario y Scroll Interno */}
            <form onSubmit={handleSaveRoutineSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-4 pb-3">

                {/* SECCIÓN 1: DATOS GENERALES */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-xl bg-dark-900 border border-dark-700">
                  
                  {/* Nombre */}
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                      Nombre de la Rutina *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Hipertrofia Torso-Pierna (4 Días)"
                      value={routineForm.nombre}
                      onChange={(e) => setRoutineForm({ ...routineForm, nombre: e.target.value })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand font-medium min-h-[44px]"
                    />
                  </div>

                  {/* Frecuencia de Días (Píldoras) */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                      Frecuencia Semanal
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => handleSetFrequency(cnt)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all min-h-[44px] ${
                            routineForm.frecuenciaDias === cnt
                              ? 'bg-brand text-white shadow-glow-red'
                              : 'bg-dark-850 hover:bg-dark-800 text-zinc-400 border border-dark-700'
                          }`}
                        >
                          {cnt} Días
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Descripción / Objetivo */}
                  <div className="sm:col-span-12">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                      Objetivo / Descripción
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Enfoque en hipertrofia y sobrecarga progresiva"
                      value={routineForm.descripcion}
                      onChange={(e) => setRoutineForm({ ...routineForm, descripcion: e.target.value })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand font-medium min-h-[42px]"
                    />
                  </div>

                  {/* Destinatario: Plantilla vs Alumno */}
                  <div className="sm:col-span-12 pt-2 border-t border-dark-700/60">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                      Destinatario de la Rutina
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setRoutineForm({ ...routineForm, destinatarioTipo: 'plantilla', client_id: '' })}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all min-h-[44px] ${
                          routineForm.destinatarioTipo === 'plantilla'
                            ? 'bg-brand/10 border-brand text-white'
                            : 'bg-dark-850 border-dark-700 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className={`w-4 h-4 ${routineForm.destinatarioTipo === 'plantilla' ? 'text-brand-light' : 'text-zinc-500'}`} />
                        <div>
                          <span className="text-xs font-bold block">🌟 Guardar como Plantilla Reutilizable</span>
                          <span className="text-[10px] text-zinc-400">Queda en el catálogo del coach para asignar después</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoutineForm({ ...routineForm, destinatarioTipo: 'alumno' })}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all min-h-[44px] ${
                          routineForm.destinatarioTipo === 'alumno'
                            ? 'bg-brand/10 border-brand text-white'
                            : 'bg-dark-850 border-dark-700 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Users className={`w-4 h-4 ${routineForm.destinatarioTipo === 'alumno' ? 'text-brand-light' : 'text-zinc-500'}`} />
                        <div>
                          <span className="text-xs font-bold block">👤 Asignar a un Alumno Específico</span>
                          <span className="text-[10px] text-zinc-400">Se vincula a su perfil y portal móvil de inmediato</span>
                        </div>
                      </button>
                    </div>

                    {/* Selector de alumno si se eligió esa opción */}
                    {routineForm.destinatarioTipo === 'alumno' && (
                      <div className="mt-2">
                        <select
                          required
                          value={routineForm.client_id}
                          onChange={(e) => setRoutineForm({ ...routineForm, client_id: e.target.value })}
                          className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand font-medium min-h-[44px]"
                        >
                          <option value="">-- Selecciona el Alumno --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nombre_completo} ({c.access_code}) • {c.dias_por_semana || 3} días/sem • {c.modalidad}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                </div>

                {/* SECCIÓN 2: PESTAÑAS DE DÍAS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-brand-light" />
                      Estructura por Días ({routineDays.length} sesiones)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetFrequency(routineDays.length + 1)}
                      className="text-[11px] font-bold text-brand-light hover:text-white flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Día Extra</span>
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {routineDays.map((d, idx) => {
                      const isActive = activeDayIndex === idx;
                      const count = d.ejercicios?.length || 0;
                      return (
                        <button
                          key={d.id || idx}
                          type="button"
                          onClick={() => setActiveDayIndex(idx)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 min-h-[40px] ${
                            isActive
                              ? 'bg-brand text-white shadow-glow-red scale-[1.02]'
                              : 'bg-dark-900 text-zinc-400 hover:text-white border border-dark-700'
                          }`}
                        >
                          <span>{d.dia_semana || `Día ${idx + 1}`}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive ? 'bg-black/40 text-white' : 'bg-dark-800 text-zinc-300'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SECCIÓN 3: ARMADO DE EJERCICIOS DEL DÍA ACTIVO */}
                {currentActiveDay && (
                  <div className="space-y-3 pt-2 border-t border-dark-700/80">
                    
                    {/* Enfoque del Día Activo */}
                    <div className="p-3 rounded-xl bg-dark-900 border border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-bold text-brand-light mb-1">
                          Enfoque / Título de la Sesión ({currentActiveDay.dia_semana || `Día ${activeDayIndex + 1}`})
                        </label>
                        <input
                          type="text"
                          value={currentActiveDay.dia}
                          onChange={(e) => handleUpdateDayName(activeDayIndex, e.target.value)}
                          placeholder="Ej: Día 1 (Lunes): Torso & Empuje"
                          className="w-full bg-dark-850 border border-dark-700 rounded-lg px-3 py-1.5 text-base sm:text-xs font-bold text-white focus:outline-none focus:border-brand min-h-[40px]"
                        />
                      </div>
                      <span className="text-xs text-zinc-400 font-semibold self-end sm:self-center shrink-0">
                        {currentActiveDay.ejercicios?.length || 0} ejercicios programados
                      </span>
                    </div>

                    {/* Catálogo de ejercicios (Izq) + Secuencia (Der) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      
                      {/* Columna Izquierda: Catálogo */}
                      <div className="lg:col-span-5 space-y-2.5">
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
                            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-gray-500 pl-8 focus:outline-none focus:border-brand min-h-[42px]"
                          />
                          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-3" />
                        </div>

                        {/* Píldoras de grupo muscular */}
                        <div className="flex gap-1 overflow-x-auto pb-1 text-[10px]">
                          {dynamicMuscleGroups.map(grp => (
                            <button
                              key={grp}
                              type="button"
                              onClick={() => setSelectedMuscleFilter(grp)}
                              className={`px-2.5 py-1.5 rounded-lg shrink-0 font-medium ${
                                selectedMuscleFilter === grp ? 'bg-brand text-white font-bold' : 'bg-dark-900 text-zinc-400'
                              }`}
                            >
                              {grp}
                            </button>
                          ))}
                        </div>

                        {/* Lista con scroll */}
                        <div className="space-y-1.5 max-h-56 sm:max-h-72 overflow-y-auto no-scrollbar pr-1">
                          {filteredExercisesForSelector.map(ex => (
                            <div
                              key={ex.id}
                              onClick={() => handleAddExerciseToCurrentDay(ex)}
                              className="p-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 hover:border-brand/40 cursor-pointer flex items-center justify-between group transition-all min-h-[44px]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={ex.imagen_url}
                                  alt={ex.nombre}
                                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white group-hover:text-brand-light truncate">
                                    {ex.nombre}
                                  </p>
                                  <span className="text-[10px] text-zinc-400">{ex.grupo_muscular}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="px-2 py-1 rounded-lg bg-brand/10 group-hover:bg-brand text-brand-light group-hover:text-white text-[11px] font-bold transition-all shrink-0"
                              >
                                + Agregar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Columna Derecha: Secuencia para el día activo */}
                      <div className="lg:col-span-7 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                            Secuencia del Día ({currentActiveDay.ejercicios?.length || 0} ejercicios)
                          </span>
                          <span className="text-[10px] text-zinc-400">Ajusta series, repes y cargas</span>
                        </div>

                        <div className="space-y-2.5 max-h-60 sm:max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                          {(currentActiveDay.ejercicios || []).map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="p-3 rounded-xl bg-dark-900 border border-dark-700 space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-brand/20 text-brand-light text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-white truncate">
                                    {item.exercise?.nombre || 'Ejercicio'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveExerciseUp(idx)}
                                    disabled={idx === 0}
                                    className="p-1 rounded hover:bg-dark-800 text-zinc-400 hover:text-white disabled:opacity-20 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                    title="Subir orden"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveExerciseDown(idx)}
                                    disabled={idx === currentActiveDay.ejercicios.length - 1}
                                    className="p-1 rounded hover:bg-dark-800 text-zinc-400 hover:text-white disabled:opacity-20 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                    title="Bajar orden"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExercise(idx)}
                                    className="p-1 rounded hover:bg-red-950/40 text-red-400 hover:text-red-300 ml-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                    title="Quitar ejercicio"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Inputs de Parámetros */}
                              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div>
                                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Series</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.series}
                                    onChange={(e) => handleUpdateExerciseParam(idx, 'series', e.target.value)}
                                    className="w-full bg-dark-850 border border-dark-700 rounded-lg py-1 px-1 text-center text-xs font-bold text-white min-h-[36px]"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Reps</span>
                                  <input
                                    type="text"
                                    value={item.repeticiones}
                                    onChange={(e) => handleUpdateExerciseParam(idx, 'repeticiones', e.target.value)}
                                    className="w-full bg-dark-850 border border-dark-700 rounded-lg py-1 px-1 text-center text-xs font-bold text-white min-h-[36px]"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Carga (kg)</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={item.peso_sugerido}
                                    onChange={(e) => handleUpdateExerciseParam(idx, 'peso_sugerido', e.target.value)}
                                    className="w-full bg-dark-850 border border-dark-700 rounded-lg py-1 px-1 text-center text-xs font-bold text-brand-light min-h-[36px]"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Descanso (s)</span>
                                  <input
                                    type="number"
                                    step="15"
                                    value={item.descanso_seg}
                                    onChange={(e) => handleUpdateExerciseParam(idx, 'descanso_seg', e.target.value)}
                                    className="w-full bg-dark-850 border border-dark-700 rounded-lg py-1 px-1 text-center text-xs font-bold text-white min-h-[36px]"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          {(currentActiveDay.ejercicios || []).length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed border-dark-700 rounded-xl text-zinc-500 text-xs">
                              <Dumbbell className="w-8 h-8 mx-auto mb-2 text-dark-600" />
                              <p className="font-bold text-zinc-400">No hay ejercicios en este día</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Selecciona ejercicios del catálogo de la izquierda con "+ Agregar".
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Barra Inferior Sticky con Acciones */}
              <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-zinc-400">
                  Total: <strong>{totalModalExercisesCount} ejercicios</strong> en {routineDays.length} días estructurados.
                </span>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || totalModalExercisesCount === 0}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red transition-all flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSubmitting 
                        ? 'Guardando en Supabase...' 
                        : (editingRoutineId ? 'Guardar Cambios' : 'Guardar Rutina')}
                    </span>
                  </button>
                </div>
              </div>

            </form>
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