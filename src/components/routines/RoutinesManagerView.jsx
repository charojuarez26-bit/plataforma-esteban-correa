import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  HeartPulse,
  Loader2,
  Repeat,
  FileDown
} from 'lucide-react';
import { exportRoutineToPdf } from '../../utils/routinePdfExporter';
import { dataService } from '../../services/dataService';
import ClientAvatar from '../common/ClientAvatar';
import StaticGif from '../common/StaticGif';
import AssignRoutineModal from './AssignRoutineModal';

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
    duration_type: 'weekly', // 'weekly' | 'monthly' | 'quarterly'
    total_weeks: 1, // 1 | 4 | 12
    frecuenciaDias: 3
  });
  const [routineDays, setRoutineDays] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isReplicateConfirmOpen, setIsReplicateConfirmOpen] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null); // null = Hub de días, número = Editor de Día

  // Buscador y Paginación por lotes de ejercicios dentro del editor
  const SELECTOR_PAGE_SIZE = 25;
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [debouncedExerciseSearch, setDebouncedExerciseSearch] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('Todos');
  const [selectorExercises, setSelectorExercises] = useState([]);
  const [selectorPage, setSelectorPage] = useState(0);
  const [selectorHasMore, setSelectorHasMore] = useState(false);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [selectorLoadingMore, setSelectorLoadingMore] = useState(false);
  const [selectorTotalCount, setSelectorTotalCount] = useState(0);
  const [availableMuscleGroups, setAvailableMuscleGroups] = useState([
    'Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Abdomen / Core', 'Cardio / Otros'
  ]);
  const selectorScrollRef = useRef(null);
  const selectorSentinelRef = useRef(null);

  // Modal Rápido: Asignar a Alumno
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [routineToAssign, setRoutineToAssign] = useState(null);
  const [targetClientId, setTargetClientId] = useState(null);

  // Modal de Confirmación: Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState(null);

  // Estados de carga y feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', text: '' }

  // Estados para exportación a PDF
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportTarget, setPdfExportTarget] = useState(null);

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
      const targetId = routineForm.destinatarioTipo === 'alumno' ? routineForm.client_id : null;

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
  }, [routineForm.client_id, routineForm.destinatarioTipo]);

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [routList, cliList] = await Promise.all([
        dataService.getAllRoutines(),
        dataService.getClients()
      ]);

      setRoutines(routList || []);
      setClients(cliList || []);
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
    setSelectedWeek(1);

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
        week_number: 1,
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
      duration_type: 'weekly',
      total_weeks: 1,
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
    setSelectedWeek(1);

    const isTemplate = Boolean(routine.es_plantilla || !routine.client_id || routine.client_id === '00000000-0000-0000-0000-000000000000');
    const durType = routine.duration_type || (routine.total_weeks > 4 ? 'quarterly' : routine.total_weeks > 1 ? 'monthly' : 'weekly');
    const totWeeks = parseInt(routine.total_weeks, 10) || (durType === 'quarterly' ? 12 : durType === 'monthly' ? 4 : 1);

    // Clonar días y ejercicios con IDs únicos garantizados y week_number preservado
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
        week_number: parseInt(d.week_number, 10) || 1,
        ejercicios: (d.ejercicios || []).map((e) => ({
          id: generateUniqueId('item'),
          exercise_id: e.exercise?.id || e.exercise_id,
          exercise: e.exercise,
          series: parseInt(e.series, 10) || 4,
          repeticiones: e.repeticiones || '10-12',
          peso_sugerido: e.peso_raw !== null && e.peso_raw !== undefined ? e.peso_raw : (e.peso_sugerido || ''),
          descanso_seg: e.descanso_seg || e.descanso_segundos || 90,
          recommended_intensity: e.recommended_intensity || e.intensidad_recomendada || e.intensidad || ''
        }))
      };
    });

    const week1Count = clonedDays.filter(d => (d.week_number || 1) === 1).length;
    const count = routine.dias_por_semana || (week1Count > 0 ? week1Count : 3);

    setRoutineForm({
      nombre: routine.nombre,
      descripcion: routine.descripcion || routine.objetivo || '',
      destinatarioTipo: isTemplate ? 'plantilla' : 'alumno',
      client_id: isTemplate ? '' : (routine.client_id || ''),
      duration_type: durType,
      total_weeks: totWeeks,
      frecuenciaDias: count
    });

    setRoutineDays(clonedDays);
    setActiveDayIndex(null);
    setCurrentStep(1);
    setMobileTab('library');
    setIsEditorOpen(true);
  };

  const handleSelectDurationType = (type) => {
    let weeks = 1;
    if (type === 'monthly') weeks = 4;
    else if (type === 'quarterly') weeks = 12;

    setRoutineForm(prev => ({
      ...prev,
      duration_type: type,
      total_weeks: weeks
    }));

    if (selectedWeek > weeks) {
      setSelectedWeek(1);
    }
  };

  // Ajustar frecuencia de días en la semana activa
  const handleSetFrequency = (newCount) => {
    if (newCount < 1 || newCount > 7) return;

    setRoutineForm(prev => ({ ...prev, frecuenciaDias: newCount }));

    setRoutineDays(prevDays => {
      const targetWeek = currentStep === 2 ? selectedWeek : 1;
      const otherWeekDays = prevDays.filter(d => (d.week_number || 1) !== targetWeek);
      const weekDays = prevDays.filter(d => (d.week_number || 1) === targetWeek);

      if (newCount === weekDays.length) return prevDays;

      let updatedWeekDays;
      if (newCount > weekDays.length) {
        const added = Array.from({ length: newCount - weekDays.length }, (_, i) => {
          const nextIdx = weekDays.length + i;
          const defaultName = `Día ${nextIdx + 1}`;
          return {
            id: generateUniqueId('day'),
            dia_numero: nextIdx + 1,
            dia_nombre: defaultName,
            dia: defaultName,
            dia_semana: defaultName,
            week_number: targetWeek,
            ejercicios: []
          };
        });
        updatedWeekDays = [...weekDays, ...added];
      } else {
        updatedWeekDays = weekDays.slice(0, newCount);
      }

      return [...otherWeekDays, ...updatedWeekDays].sort((a, b) => {
        if ((a.week_number || 1) !== (b.week_number || 1)) {
          return (a.week_number || 1) - (b.week_number || 1);
        }
        return (a.dia_numero || 1) - (b.dia_numero || 1);
      });
    });

    if (activeDayIndex !== null) {
      setActiveDayIndex(null);
    }
  };

  // Añadir una sesión a la semana activa
  const handleAddDayToCurrentWeek = () => {
    const weekDays = routineDays.filter(d => (d.week_number || 1) === selectedWeek);
    const nextNum = weekDays.length + 1;
    const defaultName = `Día ${nextNum}`;
    const newDay = {
      id: generateUniqueId('day'),
      dia_numero: nextNum,
      dia_nombre: defaultName,
      dia: defaultName,
      dia_semana: defaultName,
      week_number: selectedWeek,
      ejercicios: []
    };

    setRoutineDays(prev => [...prev, newDay].sort((a, b) => {
      if ((a.week_number || 1) !== (b.week_number || 1)) {
        return (a.week_number || 1) - (b.week_number || 1);
      }
      return (a.dia_numero || 1) - (b.dia_numero || 1);
    }));
  };

  // Inicializar sesiones vacías para una semana
  const handleInitWeekDays = (targetWeek) => {
    const count = routineForm.frecuenciaDias || 3;
    const initial = Array.from({ length: count }, (_, idx) => {
      const defaultName = `Día ${idx + 1}`;
      return {
        id: generateUniqueId('day'),
        dia_numero: idx + 1,
        dia_nombre: defaultName,
        dia: defaultName,
        dia_semana: defaultName,
        week_number: targetWeek,
        ejercicios: []
      };
    });

    setRoutineDays(prev => {
      const rest = prev.filter(d => (d.week_number || 1) !== targetWeek);
      return [...rest, ...initial].sort((a, b) => {
        if ((a.week_number || 1) !== (b.week_number || 1)) {
          return (a.week_number || 1) - (b.week_number || 1);
        }
        return (a.dia_numero || 1) - (b.dia_numero || 1);
      });
    });
  };

  // Copiar semana N a la semana N+1
  const handleCopyWeekToNext = () => {
    const nextWeek = selectedWeek + 1;
    if (nextWeek > routineForm.total_weeks) return;

    const sourceDays = routineDays.filter(d => (d.week_number || 1) === selectedWeek);
    if (sourceDays.length === 0) {
      showNotification(`No hay sesiones en la Semana ${selectedWeek} para copiar`, 'error');
      return;
    }

    const cloned = sourceDays.map((d, dIdx) => ({
      ...d,
      id: generateUniqueId('day'),
      week_number: nextWeek,
      dia_numero: d.dia_numero || dIdx + 1,
      ejercicios: (d.ejercicios || []).map((e) => ({
        ...e,
        id: generateUniqueId('item'),
        exercise: e.exercise ? { ...e.exercise } : {}
      }))
    }));

    setRoutineDays(prev => {
      const rest = prev.filter(d => (d.week_number || 1) !== nextWeek);
      return [...rest, ...cloned].sort((a, b) => {
        if ((a.week_number || 1) !== (b.week_number || 1)) {
          return (a.week_number || 1) - (b.week_number || 1);
        }
        return (a.dia_numero || 1) - (b.dia_numero || 1);
      });
    });

    setSelectedWeek(nextWeek);
    showNotification(`Semana ${selectedWeek} copiada exitosamente a la Semana ${nextWeek}`, 'success');
  };

  // Copiar estructura de una semana origen a otra semana destino
  const handleCopyWeekFrom = (fromWeek, toWeek) => {
    const sourceDays = routineDays.filter(d => (d.week_number || 1) === fromWeek);
    if (sourceDays.length === 0) {
      showNotification(`No hay sesiones en la Semana ${fromWeek}`, 'error');
      return;
    }

    const cloned = sourceDays.map((d, dIdx) => ({
      ...d,
      id: generateUniqueId('day'),
      week_number: toWeek,
      dia_numero: d.dia_numero || dIdx + 1,
      ejercicios: (d.ejercicios || []).map((e) => ({
        ...e,
        id: generateUniqueId('item'),
        exercise: e.exercise ? { ...e.exercise } : {}
      }))
    }));

    setRoutineDays(prev => {
      const rest = prev.filter(d => (d.week_number || 1) !== toWeek);
      return [...rest, ...cloned].sort((a, b) => {
        if ((a.week_number || 1) !== (b.week_number || 1)) {
          return (a.week_number || 1) - (b.week_number || 1);
        }
        return (a.dia_numero || 1) - (b.dia_numero || 1);
      });
    });

    showNotification(`Semana ${fromWeek} copiada a la Semana ${toWeek}`, 'success');
  };

  // Replicar semana activa en todas las semanas restantes
  const handleReplicateToRemainingWeeks = () => {
    if (selectedWeek >= routineForm.total_weeks) return;

    const sourceDays = routineDays.filter(d => (d.week_number || 1) === selectedWeek);
    if (sourceDays.length === 0) {
      showNotification(`No hay sesiones en la Semana ${selectedWeek} para replicar`, 'error');
      return;
    }

    const targetWeeksHaveExercises = routineDays.some(
      d => (d.week_number || 1) > selectedWeek && 
           (d.week_number || 1) <= routineForm.total_weeks && 
           (d.ejercicios?.length || 0) > 0
    );

    if (targetWeeksHaveExercises) {
      setIsReplicateConfirmOpen(true);
    } else {
      executeReplicateRemainingWeeks();
    }
  };

  const executeReplicateRemainingWeeks = () => {
    const sourceDays = routineDays.filter(d => (d.week_number || 1) === selectedWeek);
    const newReplicatedDays = [];

    for (let w = selectedWeek + 1; w <= routineForm.total_weeks; w++) {
      sourceDays.forEach((d, dIdx) => {
        newReplicatedDays.push({
          ...d,
          id: generateUniqueId('day'),
          week_number: w,
          dia_numero: d.dia_numero || dIdx + 1,
          ejercicios: (d.ejercicios || []).map((e) => ({
            ...e,
            id: generateUniqueId('item'),
            exercise: e.exercise ? { ...e.exercise } : {}
          }))
        });
      });
    }

    setRoutineDays(prev => {
      const rest = prev.filter(
        d => (d.week_number || 1) <= selectedWeek || (d.week_number || 1) > routineForm.total_weeks
      );
      return [...rest, ...newReplicatedDays].sort((a, b) => {
        if ((a.week_number || 1) !== (b.week_number || 1)) {
          return (a.week_number || 1) - (b.week_number || 1);
        }
        return (a.dia_numero || 1) - (b.dia_numero || 1);
      });
    });

    setIsReplicateConfirmOpen(false);
    showNotification(
      `Semana ${selectedWeek} replicada en todas las semanas restantes (${selectedWeek + 1} a ${routineForm.total_weeks})`,
      'success'
    );
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
      descanso_seg: exercise.descanso_seg || exercise.descanso || 90,
      recommended_intensity: exercise.recommended_intensity || exercise.intensidad_recomendada || exercise.intensidad || ''
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
        client_id: (routineForm.destinatarioTipo === 'alumno' && routineForm.client_id && routineForm.client_id.trim() !== '' && routineForm.client_id !== '00000000-0000-0000-0000-000000000000')
          ? routineForm.client_id.trim()
          : null,
        es_plantilla: routineForm.destinatarioTipo === 'plantilla',
        duration_type: routineForm.duration_type || 'weekly',
        total_weeks: routineForm.total_weeks || 1,
        dias_por_semana: routineForm.frecuenciaDias || 3,
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
    setTargetClientId(null);
    setIsAssignModalOpen(true);
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
  // EXPORTACIÓN A PDF
  // ==========================================================
  const handleTriggerPdfExport = async (routineToExport, overrideOptions = {}) => {
    if (!routineToExport) return;
    const totWeeks = parseInt(routineToExport.total_weeks, 10) || 1;
    const targetClient = routineToExport.client || clients.find(c => c.id === routineToExport.client_id);
    const studentName = overrideOptions.studentName || targetClient?.nombre_completo || (routineToExport.es_plantilla ? 'Plantilla / Modelo General' : 'Alumno');

    // Si la rutina contempla múltiples semanas y el usuario aún no eligió qué exportar, abrir selector rápido
    if (totWeeks > 1 && overrideOptions.exportAllWeeks === undefined) {
      setPdfExportTarget({
        routine: routineToExport,
        studentName,
        selectedWeek: overrideOptions.selectedWeek || selectedWeek || 1,
        totalWeeks: totWeeks
      });
      return;
    }

    try {
      setIsExportingPdf(true);
      await exportRoutineToPdf(routineToExport, {
        studentName,
        selectedWeek: overrideOptions.selectedWeek || 1,
        exportAllWeeks: overrideOptions.exportAllWeeks ?? true
      });
      showNotification('¡Rutina exportada a PDF exitosamente!', 'success');
    } catch (err) {
      console.error('Error exportando PDF:', err);
      showNotification('No se pudo generar el PDF de la rutina', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleTriggerPdfExportFromEditor = () => {
    const currentEditorRoutine = {
      nombre: routineForm.nombre?.trim() || 'Rutina en Edición',
      descripcion: routineForm.descripcion || '',
      duration_type: routineForm.duration_type || 'weekly',
      total_weeks: routineForm.total_weeks || 1,
      dias: routineDays,
      es_plantilla: routineForm.destinatarioTipo === 'plantilla',
      client_id: routineForm.client_id
    };
    const targetClient = clients.find(c => c.id === routineForm.client_id);
    const studentName = targetClient?.nombre_completo || (routineForm.destinatarioTipo === 'plantilla' ? 'Plantilla / Modelo General' : 'Alumno');

    handleTriggerPdfExport(currentEditorRoutine, {
      studentName,
      selectedWeek: selectedWeek || 1
    });
  };

  // ==========================================================
  // FILTRADO DINÁMICO DE RUTINAS
  // ==========================================================
  const filteredRoutines = useMemo(() => {
    return routines.filter(r => {
      const isTemplate = Boolean(r.es_plantilla || !r.client_id || r.client_id === '00000000-0000-0000-0000-000000000000');

      // Regla de Negocio (Prevención de duplicados visuales):
      // Solo deben mostrarse las rutinas donde r.activa === true (o si son plantillas r.es_plantilla === true)
      if (!isTemplate && r.activa !== true) {
        return false;
      }

      const totalDays = r.dias ? r.dias.length : (r.dias_por_semana || 3);
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

  // Contadores para las píldoras de filtro (calculados únicamente sobre rutinas activas o plantillas)
  const filterCounts = useMemo(() => {
    const activeRoutines = routines.filter(r => {
      const isTemplate = Boolean(r.es_plantilla || !r.client_id || r.client_id === '00000000-0000-0000-0000-000000000000');
      return isTemplate || r.activa === true;
    });

    const total = activeRoutines.length;
    const d3 = activeRoutines.filter(r => (r.dias?.length || r.dias_por_semana || 3) === 3).length;
    const d4 = activeRoutines.filter(r => (r.dias?.length || r.dias_por_semana || 3) === 4).length;
    const d5 = activeRoutines.filter(r => (r.dias?.length || r.dias_por_semana || 3) === 5).length;
    const templates = activeRoutines.filter(r => r.es_plantilla || !r.client_id || r.client_id === '00000000-0000-0000-0000-000000000000').length;
    return { total, d3, d4, d5, templates };
  }, [routines]);

  // Cargar grupos musculares disponibles
  useEffect(() => {
    const loadDistinctGroups = async () => {
      try {
        const groups = await dataService.getDistinctMuscleGroups();
        if (groups && groups.length > 0) {
          const base = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Abdomen / Core', 'Cardio / Otros'];
          const custom = groups.filter(g => g && !base.some(b => b.toLowerCase() === g.toLowerCase()));
          setAvailableMuscleGroups([...base, ...custom]);
        }
      } catch (err) {
        // Silencioso
      }
    };
    loadDistinctGroups();
  }, []);

  // Debounce para búsqueda en el selector de ejercicios (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExerciseSearch(exerciseSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [exerciseSearch]);

  // Consulta paginada por lotes (25 registros con .range(from, to))
  const fetchSelectorExercises = useCallback(async (pageToLoad, isReset = false) => {
    if (isReset) {
      setSelectorLoading(true);
    } else {
      setSelectorLoadingMore(true);
    }

    try {
      const res = await dataService.getExercisesPaginated({
        page: pageToLoad,
        limit: SELECTOR_PAGE_SIZE,
        filterGroup: selectedMuscleFilter,
        search: debouncedExerciseSearch
      });

      const items = res.data || [];
      if (isReset) {
        setSelectorExercises(items);
      } else {
        setSelectorExercises(prev => [...prev, ...items]);
      }

      setSelectorTotalCount(res.total ?? 0);
      setSelectorHasMore(Boolean(res.hasMore));
      setSelectorPage(pageToLoad);
    } catch (err) {
      console.error('Error cargando ejercicios en el selector:', err);
      if (isReset) {
        setSelectorExercises([]);
        setSelectorTotalCount(0);
        setSelectorHasMore(false);
      }
    } finally {
      if (isReset) setSelectorLoading(false);
      setSelectorLoadingMore(false);
    }
  }, [selectedMuscleFilter, debouncedExerciseSearch]);

  // Carga reactiva solo cuando el editor de rutinas está abierto
  useEffect(() => {
    if (isEditorOpen) {
      fetchSelectorExercises(0, true);
    }
  }, [isEditorOpen, selectedMuscleFilter, debouncedExerciseSearch, fetchSelectorExercises]);

  // Cargar más ejercicios (siguiente lote)
  const handleLoadMoreSelectorExercises = () => {
    if (selectorLoading || selectorLoadingMore || !selectorHasMore) return;
    fetchSelectorExercises(selectorPage + 1, false);
  };

  // Scroll infinito automático usando IntersectionObserver
  useEffect(() => {
    if (!selectorSentinelRef.current || !selectorHasMore || selectorLoading || selectorLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && selectorHasMore && !selectorLoading && !selectorLoadingMore) {
          fetchSelectorExercises(selectorPage + 1, false);
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    observer.observe(selectorSentinelRef.current);
    return () => observer.disconnect();
  }, [selectorHasMore, selectorLoading, selectorLoadingMore, selectorPage, fetchSelectorExercises]);

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
                          {routine.dias_por_semana || (routine.dias ? Math.round(routine.dias.length / (routine.total_weeks || 1)) : totalDays)} Días / Sem • {routine.total_weeks > 1 ? `${routine.total_weeks} sem • ` : ''}{totalExercises} ejercicios
                        </p>
                      </div>
                    </div>

                    {/* Badge Estado / Duración / Plantilla */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isTemplate ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Sparkles className="w-3 h-3" /> Plantilla
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          Asignada
                        </span>
                      )}
                      {routine.duration_type === 'quarterly' ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          Trimestral (12 sem)
                        </span>
                      ) : (routine.duration_type === 'monthly' || routine.total_weeks === 4) ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Mensual (4 sem)
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Semanal (1 sem)
                        </span>
                      )}
                    </div>
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

                  {/* Resumen de Días (Truncado a máx 12 con badge de restantes para altura uniforme) */}
                  {(() => {
                    const allDays = routine.dias || [];
                    const maxVisibleDays = 12;
                    const visibleDays = allDays.slice(0, maxVisibleDays);
                    const remainingDaysCount = allDays.length - maxVisibleDays;

                    return (
                      <div className="mt-3 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                        {visibleDays.map((d, dIdx) => (
                          <span
                            key={d.id || `routine-${routine.id}-day-${dIdx}`}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-dark-800 border border-dark-700 text-zinc-300 shrink-0"
                          >
                            {formatGenericDayTitle(d, dIdx)} ({d.ejercicios?.length || 0})
                          </span>
                        ))}

                        {remainingDaysCount > 0 && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-dark-700/50 text-gray-400 border border-dark-600 shrink-0 inline-flex items-center"
                            title={`${remainingDaysCount} sesiones adicionales programadas`}
                          >
                            + {remainingDaysCount} días más
                          </span>
                        )}
                      </div>
                    );
                  })()}
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

                    <button
                      type="button"
                      disabled={isExportingPdf}
                      onClick={() => handleTriggerPdfExport(routine)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Exportar rutina a PDF (A4)"
                    >
                      <FileDown className="w-3.5 h-3.5 text-brand-light" />
                      <span>PDF</span>
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={handleTriggerPdfExportFromEditor}
                  className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  title="Exportar versión actual a PDF"
                >
                  <FileDown className="w-4 h-4 text-brand-light" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-dark-800 border border-transparent hover:border-dark-700 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                  aria-label="Cerrar creador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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

                    {/* 3. Duración de la Planificación */}
                    <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-200">
                          3. Duración de la Planificación
                        </label>
                        <span className="text-xs font-bold text-brand-light">
                          {routineForm.duration_type === 'quarterly' ? '12 Semanas (Trimestral)' : routineForm.duration_type === 'monthly' ? '4 Semanas (Mensual)' : '1 Semana (Semanal)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {[
                          { id: 'weekly', label: 'Semanal', sub: '1 semana', weeks: 1 },
                          { id: 'monthly', label: 'Mensual', sub: '4 semanas', weeks: 4 },
                          { id: 'quarterly', label: 'Trimestral', sub: '12 semanas', weeks: 12 }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectDurationType(item.id)}
                            className={`p-3 rounded-xl text-left transition-all border min-h-[58px] flex flex-col justify-center ${
                              routineForm.duration_type === item.id
                                ? 'bg-brand/15 border-brand text-white shadow-glow-red'
                                : 'bg-dark-900 hover:bg-dark-800 border-dark-700 text-zinc-400'
                            }`}
                          >
                            <span className={`text-sm font-black leading-tight ${routineForm.duration_type === item.id ? 'text-brand-light' : 'text-zinc-200'}`}>
                              {item.label}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-medium mt-0.5">
                              {item.sub}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. Frecuencia Semanal (1 a 6 días) */}
                    <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-200">
                          4. Frecuencia Semanal
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

                    {/* 5. Objetivo Opcional */}
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
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-brand-light" />
                          Estructura de Días
                        </h3>
                        {routineForm.total_weeks > 1 && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand/15 text-brand-light border border-brand/30">
                            Plan {routineForm.total_weeks} Semanas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {routineForm.total_weeks > 1
                          ? `Configura los días para cada semana. Puedes armar la Semana 1 y replicarla automáticamente a las semanas siguientes.`
                          : 'Toca una sesión para armar sus ejercicios. Cuando termines todas, guarda la rutina completa.'}
                      </p>
                    </div>

                    {/* BARRA DE NAVEGACIÓN Y REPLICACIÓN DE SEMANAS (Para rutinas multi-semana) */}
                    {routineForm.total_weeks > 1 && (
                      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-3 sm:p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-brand-light" />
                            Semanas del Ciclo ({routineForm.total_weeks} semanas)
                          </span>
                          <span className="text-xs font-bold text-brand-light">
                            Activa: Sem {selectedWeek}
                          </span>
                        </div>

                        {/* Pestañas de Semanas */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                          {Array.from({ length: routineForm.total_weeks }, (_, i) => i + 1).map((w) => {
                            const isSelected = selectedWeek === w;
                            const weekExercises = routineDays
                              .filter(d => (d.week_number || 1) === w)
                              .reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);
                            const weekDaysCount = routineDays.filter(d => (d.week_number || 1) === w).length;

                            return (
                              <button
                                key={w}
                                type="button"
                                onClick={() => setSelectedWeek(w)}
                                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 min-w-[70px] border ${
                                  isSelected
                                    ? 'bg-brand text-white border-brand shadow-glow-red scale-[1.02]'
                                    : 'bg-dark-800 text-zinc-400 hover:text-white border-dark-700 hover:border-dark-600'
                                }`}
                              >
                                <span className="text-xs font-black">Sem {w}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : weekExercises > 0
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-dark-700 text-zinc-500'
                                }`}>
                                  {weekExercises > 0 ? `${weekExercises} ej.` : `${weekDaysCount} d.`}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Herramientas de Clonación / Replicación entre Semanas */}
                        {selectedWeek < routineForm.total_weeks && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dark-700/80">
                            <button
                              type="button"
                              onClick={handleCopyWeekToNext}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-dark-800 hover:bg-dark-700 text-zinc-200 border border-dark-600 flex items-center gap-1.5 transition-colors"
                              title={`Copiar sesiones de Semana ${selectedWeek} a Semana ${selectedWeek + 1}`}
                            >
                              <Copy className="w-3.5 h-3.5 text-brand-light" />
                              <span>Copiar a Semana {selectedWeek + 1}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleReplicateToRemainingWeeks}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-dark-800 hover:bg-dark-700 text-zinc-200 border border-dark-600 flex items-center gap-1.5 transition-colors"
                              title={`Replicar en todas las semanas restantes (${selectedWeek + 1} a ${routineForm.total_weeks})`}
                            >
                              <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Replicar en Semanas {selectedWeek + 1} a {routineForm.total_weeks}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* LISTA DE SESIONES DE LA SEMANA ACTIVA */}
                    {(() => {
                      const currentWeekDays = routineDays.filter(d => (d.week_number || 1) === selectedWeek);

                      if (currentWeekDays.length === 0) {
                        return (
                          <div className="card-dark rounded-2xl p-6 text-center border border-dashed border-dark-700 space-y-3">
                            <Calendar className="w-8 h-8 text-zinc-500 mx-auto" />
                            <p className="text-sm font-bold text-white">Semana {selectedWeek} sin sesiones configuradas</p>
                            <p className="text-xs text-zinc-400">Puedes copiar la estructura de la Semana 1 o inicializar sesiones vacías para esta semana.</p>
                            <div className="flex flex-wrap justify-center gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => handleCopyWeekFrom(1, selectedWeek)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-dark transition-colors shadow-glow-red"
                              >
                                Copiar desde Semana 1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInitWeekDays(selectedWeek)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-dark-800 text-zinc-300 border border-dark-700 hover:bg-dark-700 transition-colors"
                              >
                                Crear {routineForm.frecuenciaDias || 3} sesiones vacías
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {currentWeekDays.map((d, localIdx) => {
                            const count = d.ejercicios?.length || 0;
                            const realIdx = routineDays.findIndex(rd => rd.id === d.id);
                            return (
                              <div
                                key={d.id || `hub-day-${localIdx}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => { setMobileTab('library'); setActiveDayIndex(realIdx); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setMobileTab('library');
                                    setActiveDayIndex(realIdx);
                                  }
                                }}
                                className="card-dark rounded-2xl p-4 border border-dark-700 hover:border-brand/50 cursor-pointer hover:bg-gray-800 transition-colors flex items-center justify-between gap-3 min-h-[72px]"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 text-brand-light font-black flex items-center justify-center shrink-0">
                                    {d.dia_numero || localIdx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {routineForm.total_weeks > 1 && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-dark-800 border border-dark-600 text-zinc-300 shrink-0">
                                          Sem {d.week_number || 1}
                                        </span>
                                      )}
                                      <p className="text-sm font-bold text-white truncate">
                                        {formatGenericDayTitle(d, (d.dia_numero || localIdx + 1) - 1)}
                                      </p>
                                    </div>
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
                      );
                    })()}

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={handleAddDayToCurrentWeek}
                        className="text-xs font-bold text-brand-light hover:text-white inline-flex items-center gap-1.5 p-2 rounded-xl hover:bg-dark-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir otra sesión a Semana {selectedWeek}</span>
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
                    onClick={() => {
                      if (currentActiveDay?.week_number) {
                        setSelectedWeek(currentActiveDay.week_number);
                      }
                      setActiveDayIndex(null);
                    }}
                    className="px-3 py-2 -ml-1 rounded-xl text-xs font-bold text-zinc-200 hover:text-white bg-dark-800 border border-dark-700 min-h-[40px] flex items-center justify-center gap-1.5 shrink-0"
                    aria-label="Volver a Sesiones"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a Sesiones</span>
                  </button>

                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-light">
                      {routineForm.total_weeks > 1 ? `Semana ${currentActiveDay.week_number || 1} • ` : ''}Editor de Día • {currentActiveDay.ejercicios?.length || 0} ej.
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5 truncate">
                      {formatGenericDayTitle(currentActiveDay, (currentActiveDay.dia_numero || 1) - 1)}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentActiveDay?.week_number) {
                      setSelectedWeek(currentActiveDay.week_number);
                    }
                    setActiveDayIndex(null);
                  }}
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
                    <span className="text-[10px] text-zinc-400">
                      {selectorTotalCount > 0 ? `${selectorExercises.length} de ${selectorTotalCount} disponibles` : 'Toca "+ Agregar"'}
                    </span>
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
                    {availableMuscleGroups.map(grp => (
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

                  {/* Lista de ejercicios con carga por lotes y scroll infinito */}
                  <div 
                    ref={selectorScrollRef}
                    className="space-y-1.5 md:max-h-[calc(90vh-320px)] md:overflow-y-auto no-scrollbar pr-1"
                  >
                    {/* Indicador de carga inicial */}
                    {selectorLoading && (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                        <Loader2 className="w-5 h-5 animate-spin text-brand" />
                        <span>Cargando ejercicios...</span>
                      </div>
                    )}

                    {/* Estado vacío */}
                    {!selectorLoading && selectorExercises.length === 0 && (
                      <div className="py-8 text-center text-gray-500 text-xs space-y-1">
                        <p className="font-semibold text-gray-400">No se encontraron ejercicios</p>
                        <p className="text-[11px]">Prueba con otro término de búsqueda o categoría</p>
                      </div>
                    )}

                    {/* Lista paginada */}
                    {!selectorLoading && selectorExercises.map(ex => {
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
                            <StaticGif
                              src={ex.imagen_url || ex.video_url}
                              alt={ex.nombre}
                              className="w-10 h-10 rounded-lg object-cover shrink-0 overflow-hidden"
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

                    {/* Centinela invisible para auto-scroll incremental */}
                    <div ref={selectorSentinelRef} className="h-2 w-full pointer-events-none" />

                    {/* Botón Cargar más ejercicios */}
                    {selectorHasMore && !selectorLoading && (
                      <div className="pt-2 pb-1">
                        <button
                          type="button"
                          onClick={handleLoadMoreSelectorExercises}
                          disabled={selectorLoadingMore}
                          className="w-full py-2 px-3 rounded-xl border border-dark-700 bg-dark-850 hover:bg-dark-800 hover:border-brand/40 text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-all min-h-[40px] shadow-sm disabled:opacity-50"
                        >
                          {selectorLoadingMore ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-brand" />
                              <span>Cargando más ejercicios...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-brand" />
                              <span>Cargar más ejercicios ({Math.max(0, selectorTotalCount - selectorExercises.length)} restantes)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
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

                        {/* Fila inferior: Grid responsivo de parámetros (Series, Reps, Carga, Descanso, Intensidad) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-left md:text-center">
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

                          {/* Columna 2: Reps */}
                          <div className="bg-dark-850 p-2 rounded-xl border border-dark-750">
                            <span className="text-[11px] md:text-[10px] text-zinc-400 uppercase font-bold block mb-1">Reps</span>
                            <input
                              type="text"
                              value={item.repeticiones}
                              onChange={(e) => handleUpdateExerciseParam(idx, 'repeticiones', e.target.value)}
                              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 md:py-1.5 md:px-2 text-center text-base md:text-xs font-black text-white min-h-[44px] md:min-h-[38px] focus:outline-none focus:border-brand"
                            />
                          </div>

                          {/* Columna 3: Carga */}
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

                          {/* Columna 4: Descanso */}
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

                          {/* Columna 5: Intensidad Recomendada */}
                          <div className="bg-dark-850 p-2 rounded-xl border border-dark-750 col-span-2 sm:col-span-1">
                            <span className="text-[11px] md:text-[10px] text-amber-400 uppercase font-bold block mb-1">Intensidad</span>
                            <input
                              type="text"
                              placeholder="RPE 8 / RIR 2"
                              value={item.recommended_intensity ?? item.intensidad_recomendada ?? ''}
                              onChange={(e) => handleUpdateExerciseParam(idx, 'recommended_intensity', e.target.value)}
                              className="w-full bg-dark-900 border border-dark-700 focus:border-amber-400 rounded-lg p-2 md:py-1.5 md:px-2 text-center text-base md:text-xs font-black text-amber-300 min-h-[44px] md:min-h-[38px] focus:outline-none placeholder:text-zinc-600 placeholder:font-normal"
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
        <AssignRoutineModal
          isOpen={isAssignModalOpen}
          routine={routineToAssign}
          clients={clients}
          routines={routines}
          onClose={() => {
            setIsAssignModalOpen(false);
            setRoutineToAssign(null);
            setTargetClientId(null);
          }}
          onSuccess={async (assigned) => {
            await loadAllData();
            const clientName = Array.isArray(assigned)
              ? `${assigned.length} alumnos`
              : (assigned?.client?.nombre_completo || 'el alumno');
            showNotification(`¡Rutina asignada exitosamente a ${clientName}!`, 'success');
          }}
          onQuickEdit={(client, activeRoutine) => {
            if (activeRoutine) {
              handleOpenEditModal(activeRoutine);
            } else if (onNavigateToClient) {
              onNavigateToClient(client.id);
            }
          }}
        />
      )}

      {/* ========================================================== */}
      {/* 5.5 MODAL DE CONFIRMACIÓN: REPLICAR SEMANA                */}
      {/* ========================================================== */}
      {isReplicateConfirmOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Replicar en Semanas Restantes?</h3>
                <p className="text-xs text-gray-400">Acción masiva de planificación</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Las semanas <strong>{selectedWeek + 1} a {routineForm.total_weeks}</strong> ya contienen ejercicios configurados. 
              Esta acción sobreescribirá dichas semanas con la estructura y ejercicios de la <strong className="text-brand-light">Semana {selectedWeek}</strong>.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReplicateConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeReplicateRemainingWeeks}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-dark transition-all flex items-center gap-2 shadow-glow-red min-h-[44px]"
              >
                <Repeat className="w-4 h-4" />
                <span>Sí, Replicar y Sobreescribir</span>
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

      {/* ========================================================== */}
      {/* 6. MODAL: OPCIONES DE EXPORTACIÓN A PDF (MULTI-SEMANA)     */}
      {/* ========================================================== */}
      {pdfExportTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-dark-900 border border-dark-700 shadow-2xl p-5 sm:p-6 space-y-4 animate-scale">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-light">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Exportar Rutina a PDF</h3>
                  <p className="text-xs text-zinc-400">Formato A4 optimizado para imprimir</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfExportTarget(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-dark-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-850 border border-dark-750 text-xs space-y-1">
              <div className="font-bold text-white text-sm truncate">{pdfExportTarget.routine.nombre}</div>
              <div className="text-zinc-400">
                Destinatario: <span className="text-zinc-200 font-semibold">{pdfExportTarget.studentName}</span>
              </div>
              <div className="text-zinc-400">
                Planificación: <span className="text-brand-light font-semibold">{pdfExportTarget.totalWeeks} Semanas</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Esta rutina contiene múltiples semanas. Elige cómo deseas exportarla:
            </p>

            <div className="space-y-2 pt-1">
              {/* Opción 1: Exportar semana actual */}
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={() => {
                  const tgt = pdfExportTarget;
                  setPdfExportTarget(null);
                  handleTriggerPdfExport(tgt.routine, {
                    studentName: tgt.studentName,
                    selectedWeek: tgt.selectedWeek,
                    exportAllWeeks: false
                  });
                }}
                className="w-full p-3.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-left transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-brand-light">
                    Exportar solo Semana {pdfExportTarget.selectedWeek}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Solo las sesiones de la semana {pdfExportTarget.selectedWeek}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </button>

              {/* Opción 2: Exportar plan completo */}
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={() => {
                  const tgt = pdfExportTarget;
                  setPdfExportTarget(null);
                  handleTriggerPdfExport(tgt.routine, {
                    studentName: tgt.studentName,
                    selectedWeek: tgt.selectedWeek,
                    exportAllWeeks: true
                  });
                }}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-left transition-all flex items-center justify-between shadow-glow-red cursor-pointer disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-black text-white">
                    Exportar Plan Completo (Todas las {pdfExportTarget.totalWeeks} semanas)
                  </div>
                  <div className="text-[11px] text-red-100">
                    Todas las semanas en un único documento A4
                  </div>
                </div>
                <FileDown className="w-4 h-4 text-white" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPdfExportTarget(null)}
              className="w-full py-2.5 rounded-xl bg-transparent hover:bg-dark-800 text-zinc-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}