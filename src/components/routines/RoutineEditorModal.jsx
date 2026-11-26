import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  Copy, 
  Calendar, 
  Users, 
  Dumbbell, 
  Check, 
  X, 
  FileDown, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  HeartPulse, 
  Repeat,
  Sparkles,
  Loader2,
  MessageSquare,
  Link2,
  Unlink,
  TrendingDown
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import StaticGif from '../common/StaticGif';
import { exportRoutineToPdf } from '../../utils/routinePdfExporter';
import {
  groupExercisesBySuperset,
  toggleLinkWithNextExercise,
  cleanupOrphanGroupIds
} from '../../utils/routineGroupUtils';

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

export default function RoutineEditorModal({
  isOpen,
  onClose,
  routineToEdit = null,
  initialClient = null,
  clients: externalClients = null,
  onSaveSuccess = null
}) {
  const [clients, setClients] = useState(externalClients || []);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [mobileTab, setMobileTab] = useState('library');
  const [routineForm, setRoutineForm] = useState({
    nombre: '',
    descripcion: '',
    destinatarioTipo: 'alumno',
    client_id: '',
    duration_type: 'weekly',
    total_weeks: 1,
    frecuenciaDias: 3
  });
  const [routineDays, setRoutineDays] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isReplicateConfirmOpen, setIsReplicateConfirmOpen] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedStudentMedical, setSelectedStudentMedical] = useState(null);

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

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Cargar clientes si no vienen provistos
  useEffect(() => {
    if (!isOpen) return;
    if (externalClients && externalClients.length > 0) {
      setClients(externalClients);
    } else {
      dataService.getClients().then(cList => {
        if (Array.isArray(cList)) setClients(cList);
      }).catch(err => console.warn('Error cargando alumnos para rutina:', err));
    }
  }, [isOpen, externalClients]);

  // Cargar grupos musculares disponibles
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    dataService.getDistinctMuscleGroups().then(grps => {
      if (!isMounted || !Array.isArray(grps) || grps.length === 0) return;
      const base = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Abdomen / Core', 'Cardio / Otros'];
      const custom = grps.filter(g => g && !base.some(b => b.toLowerCase() === g.toLowerCase()));
      setAvailableMuscleGroups([...base, ...custom]);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [isOpen]);

  // Precargar rutina en MODO EDICIÓN (UPDATE) o CREACIÓN (INSERT)
  useEffect(() => {
    if (!isOpen) return;

    if (routineToEdit) {
      // 1. MODO EDICIÓN (UPDATE) - Pre-cargar TODOS los datos de la rutina activa
      setEditingRoutineId(routineToEdit.id);
      setExerciseSearch('');
      setSelectedMuscleFilter('Todos');
      setSelectedWeek(1);

      const isTemplate = initialClient ? false : Boolean(routineToEdit.es_plantilla || !routineToEdit.client_id || routineToEdit.client_id === '00000000-0000-0000-0000-000000000000');
      const durType = routineToEdit.duration_type || (routineToEdit.total_weeks > 4 ? 'quarterly' : routineToEdit.total_weeks > 1 ? 'monthly' : 'weekly');
      const totWeeks = parseInt(routineToEdit.total_weeks, 10) || (durType === 'quarterly' ? 12 : durType === 'monthly' ? 4 : 1);

      // Clonar días y ejercicios con IDs únicos garantizados y week_number preservado
      const clonedDays = (routineToEdit.dias || []).map((d, dIdx) => {
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
            recommended_intensity: e.recommended_intensity || e.intensidad_recomendada || e.intensidad || '',
            observaciones: e.observaciones || e.notas || '',
            grupo_id: e.grupo_id || null,
            es_descendente: Boolean(e.es_descendente)
          }))
        };
      });

      const week1Count = clonedDays.filter(d => (d.week_number || 1) === 1).length;
      const count = routineToEdit.dias_por_semana || (week1Count > 0 ? week1Count : 3);

      setRoutineForm({
        nombre: routineToEdit.nombre || '',
        descripcion: routineToEdit.descripcion || routineToEdit.objetivo || '',
        destinatarioTipo: isTemplate ? 'plantilla' : 'alumno',
        client_id: isTemplate ? '' : (routineToEdit.client_id || initialClient?.id || ''),
        duration_type: durType,
        total_weeks: totWeeks,
        frecuenciaDias: count
      });

      setRoutineDays(clonedDays);
      setActiveDayIndex(null);
      setCurrentStep(1);
      setMobileTab('library');
    } else {
      // 2. MODO CREACIÓN (INSERT)
      setEditingRoutineId(null);
      setExerciseSearch('');
      setSelectedMuscleFilter('Todos');
      setSelectedWeek(1);

      const targetClient = initialClient;
      const defaultDaysCount = targetClient?.dias_por_semana || 3;
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
        nombre: targetClient ? `Plan de Entrenamiento - ${targetClient.nombre_completo?.split(' ')[0]}` : '',
        descripcion: '',
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
    }
  }, [isOpen, routineToEdit, initialClient]);

  // Consulta reactiva de salud / ficha médica del alumno
  useEffect(() => {
    if (!isOpen || !routineForm.client_id || routineForm.client_id === '00000000-0000-0000-0000-000000000000') {
      setSelectedStudentMedical(null);
      return;
    }
    let isMounted = true;
    dataService.getMedicalRecord(routineForm.client_id).then(record => {
      if (isMounted) setSelectedStudentMedical(record || null);
    }).catch(err => {
      console.warn('Error consultando ficha médica del alumno:', err);
      if (isMounted) setSelectedStudentMedical(null);
    });
    return () => { isMounted = false; };
  }, [isOpen, routineForm.client_id]);

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
    if (isOpen) {
      fetchSelectorExercises(0, true);
    }
  }, [isOpen, selectedMuscleFilter, debouncedExerciseSearch, fetchSelectorExercises]);

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
      { root: selectorScrollRef.current, threshold: 0.1 }
    );

    observer.observe(selectorSentinelRef.current);
    return () => observer.disconnect();
  }, [selectorHasMore, selectorLoading, selectorLoadingMore, selectorPage, fetchSelectorExercises]);

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

  const handleAddExerciseToCurrentDay = (e, exercise) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (routineDays.length === 0 || activeDayIndex === null) return;

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
      recommended_intensity: exercise.recommended_intensity || exercise.intensidad_recomendada || exercise.intensidad || '',
      observaciones: exercise.observaciones || '',
      grupo_id: null,
      es_descendente: Boolean(exercise.es_descendente)
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

  const handleRemoveExercise = (exerciseIdx) => {
    setRoutineDays(prev => prev.map((day, dIdx) => {
      if (dIdx !== activeDayIndex) return day;
      const nextList = [...(day.ejercicios || [])];
      nextList.splice(exerciseIdx, 1);
      return { ...day, ejercicios: cleanupOrphanGroupIds(nextList) };
    }));
  };

  const handleMoveExerciseUp = (exerciseIdx) => {
    if (exerciseIdx === 0) return;
    setRoutineDays(prev => prev.map((day, dIdx) => {
      if (dIdx !== activeDayIndex) return day;
      const list = [...(day.ejercicios || [])];
      const temp = list[exerciseIdx - 1];
      list[exerciseIdx - 1] = list[exerciseIdx];
      list[exerciseIdx] = temp;
      return { ...day, ejercicios: cleanupOrphanGroupIds(list) };
    }));
  };

  const handleMoveExerciseDown = (exerciseIdx) => {
    setRoutineDays(prev => prev.map((day, dIdx) => {
      if (dIdx !== activeDayIndex) return day;
      const list = [...(day.ejercicios || [])];
      if (exerciseIdx >= list.length - 1) return day;
      const temp = list[exerciseIdx + 1];
      list[exerciseIdx + 1] = list[exerciseIdx];
      list[exerciseIdx] = temp;
      return { ...day, ejercicios: cleanupOrphanGroupIds(list) };
    }));
  };

  const handleToggleLinkWithNext = (exerciseIdx) => {
    setRoutineDays(prev => prev.map((day, dIdx) => {
      if (dIdx !== activeDayIndex) return day;
      return {
        ...day,
        ejercicios: toggleLinkWithNextExercise(day.ejercicios || [], exerciseIdx)
      };
    }));
  };

  const handleToggleDropSet = (exerciseIdx) => {
    setRoutineDays(prev => prev.map((day, dIdx) => {
      if (dIdx !== activeDayIndex) return day;
      const nextList = (day.ejercicios || []).map((ex, i) =>
        i === exerciseIdx ? { ...ex, es_descendente: !ex.es_descendente } : ex
      );
      return { ...day, ejercicios: nextList };
    }));
  };

  const handleUpdateExerciseParam = (exerciseIdx, field, val) => {
    setRoutineDays(prev => {
      const copy = [...prev];
      if (copy[activeDayIndex] && copy[activeDayIndex].ejercicios[exerciseIdx]) {
        copy[activeDayIndex].ejercicios[exerciseIdx][field] = val;
      }
      return copy;
    });
  };

  // Guardar Rutina en Supabase (Modo UPDATE si hay editingRoutineId, modo INSERT si no)
  const handleSaveRoutineSubmit = async (e) => {
    if (e) e.preventDefault();
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

      // Si editingRoutineId está definido -> UPDATE en Supabase. Si es null -> INSERT.
      const saved = await dataService.saveRoutine(payload, routineDays, editingRoutineId);

      if (onSaveSuccess) {
        await onSaveSuccess(saved);
      }

      onClose();
    } catch (err) {
      console.error('Error detallado de Supabase:', err);
      const errorMsg = err?.message || 'Error al persistir la rutina en Supabase';
      showNotification(`Error: ${errorMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerPdfExportFromEditor = async () => {
    const currentEditorRoutine = {
      nombre: routineForm.nombre?.trim() || 'Rutina en Edición',
      descripcion: routineForm.descripcion || '',
      duration_type: routineForm.duration_type || 'weekly',
      total_weeks: routineForm.total_weeks || 1,
      dias: routineDays,
      client: routineForm.destinatarioTipo === 'alumno' ? clients.find(c => c.id === routineForm.client_id) : null
    };

    const targetStudent = routineForm.destinatarioTipo === 'alumno'
      ? clients.find(c => c.id === routineForm.client_id)
      : null;

    try {
      setIsExportingPdf(true);
      await exportRoutineToPdf(currentEditorRoutine, {
        studentName: targetStudent?.nombre_completo || 'General',
        selectedWeek: selectedWeek || 1,
        exportAllWeeks: true
      });
      showNotification('¡Rutina exportada a PDF exitosamente!', 'success');
    } catch (err) {
      console.error('Error exportando PDF:', err);
      showNotification('No se pudo generar el PDF de la rutina', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  const currentActiveDay = activeDayIndex !== null ? routineDays[activeDayIndex] : null;
  const isDayEditorOpen = activeDayIndex !== null && Boolean(currentActiveDay);
  const totalModalExercisesCount = routineDays.reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);

  return (
    <>
      {/* ========================================================== */}
      {/* 1. NOTIFICACIÓN TOAST FLOTANTE                             */}
      {/* ========================================================== */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-bold border transition-all animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'error'
            ? 'bg-red-950/95 text-red-200 border-red-800'
            : 'bg-emerald-950/95 text-emerald-200 border-emerald-800'
        }`}>
          {notification.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. WIZARD PRINCIPAL (PASO 1 Y HUB DE SESIONES)             */}
      {/* ========================================================== */}
      {!isDayEditorOpen && (
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
                      onClose();
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
                    {editingRoutineId ? 'Modo Edición' : `Paso ${currentStep} de 2`}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-1 truncate">
                    {currentStep === 1 
                      ? (editingRoutineId ? `Editar: ${routineForm.nombre || 'Rutina'}` : 'Detalles de la Rutina') 
                      : `Estructura de Días (${totalModalExercisesCount} ej.)`}
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
                  onClick={onClose}
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

                    {/* BARRA DE NAVEGACIÓN Y REPLICACIÓN DE SEMANAS */}
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

              {/* BOTTOM ACTION BAR FIJA DEL WIZARD */}
              <div className="fixed md:sticky bottom-0 left-0 w-full bg-gray-900 border-t border-gray-800 p-4 z-20 shadow-2xl">
                <div className="max-w-2xl mx-auto w-full">
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
      {/* 3. SUB-VISTA: EDITOR DE DÍA A PANTALLA COMPLETA            */}
      {/* ========================================================== */}
      {isDayEditorOpen && currentActiveDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 md:bg-black/85 md:backdrop-blur-sm p-0 md:p-4">
          <div className="fixed inset-0 md:relative z-50 flex flex-col bg-gray-950 w-full h-full md:max-w-5xl md:max-h-[90vh] md:rounded-2xl md:border md:border-gray-800 md:shadow-2xl overflow-hidden">
            
            {/* Header: Barra superior fija */}
            <div className="flex-none bg-gray-950 w-full border-b border-gray-800 z-10">
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

              {/* Selector de Pestañas Móviles */}
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

            {/* Contenido Scrolleable (Lista y Biblioteca) */}
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

              {/* Grid: Biblioteca (Izq) + Secuencia (Der) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Columna Izquierda: Biblioteca */}
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

                  <div 
                    ref={selectorScrollRef}
                    className="space-y-1.5 md:max-h-[calc(90vh-320px)] md:overflow-y-auto no-scrollbar pr-1"
                  >
                    {selectorLoading && (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                        <Loader2 className="w-5 h-5 animate-spin text-brand" />
                        <span>Cargando ejercicios...</span>
                      </div>
                    )}

                    {!selectorLoading && selectorExercises.length === 0 && (
                      <div className="py-8 text-center text-gray-500 text-xs space-y-1">
                        <p className="font-semibold text-gray-400">No se encontraron ejercicios</p>
                        <p className="text-[11px]">Prueba con otro término de búsqueda o categoría</p>
                      </div>
                    )}

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

                    <div ref={selectorSentinelRef} className="h-2 w-full pointer-events-none" />

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
                    {(() => {
                      const allDayExercises = currentActiveDay.ejercicios || [];
                      const blocks = groupExercisesBySuperset(allDayExercises);

                      const renderExerciseEditorCard = (item, idx) => {
                        const isLastOfDay = idx === allDayExercises.length - 1;
                        const nextItem = !isLastOfDay ? allDayExercises[idx + 1] : null;
                        const isLinkedWithNext = Boolean(item.grupo_id && nextItem?.grupo_id && item.grupo_id === nextItem.grupo_id);
                        const isDrop = Boolean(item.es_descendente);

                        return (
                          <div
                            key={item.instanceId || item.id || `active-day-item-${activeDayIndex}-${idx}`}
                            className="p-3.5 sm:p-3 rounded-2xl md:rounded-xl bg-dark-900 border border-dark-700 space-y-3 shadow-md"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-dark-800">
                              {/* Fila 1 (Título): badge de orden + nombre completo */}
                              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-full bg-brand/20 text-brand-light text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                  {idx + 1}
                                </span>
                                <span className="text-sm md:text-xs font-bold text-white leading-snug break-words">
                                  {item.exercise?.nombre || 'Ejercicio'}
                                </span>
                              </div>

                              {/* Fila 2 (Controles): Drop Set y Vincular a la izquierda; orden y eliminar a la derecha */}
                              <div className="flex items-center justify-between gap-2 w-full sm:w-auto shrink-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* Toggle Drop Set / Serie Descendente */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDropSet(idx)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 min-h-[32px] ${
                                      isDrop
                                        ? 'bg-orange-500/20 border-orange-400 text-orange-300 shadow-sm'
                                        : 'bg-dark-850 hover:bg-dark-800 border-dark-700 text-zinc-400 hover:text-orange-300'
                                    }`}
                                    title="Activar/desactivar serie descendente (Drop Set)"
                                  >
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    <span>{isDrop ? 'DROP' : 'Drop Set'}</span>
                                  </button>

                                  {/* Botón Vincular / Desvincular Superserie (excepto último ejercicio del día) */}
                                  {!isLastOfDay && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLinkWithNext(idx)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 min-h-[32px] ${
                                        isLinkedWithNext
                                          ? 'bg-violet-500/20 border-violet-400 text-violet-200 hover:bg-violet-500/30'
                                          : 'bg-dark-850 hover:bg-dark-800 border-dark-700 text-zinc-400 hover:text-violet-300'
                                      }`}
                                      title={isLinkedWithNext ? 'Desvincular del ejercicio siguiente' : 'Vincular con el ejercicio siguiente (Superserie)'}
                                    >
                                      {isLinkedWithNext ? (
                                        <>
                                          <Unlink className="w-3.5 h-3.5" />
                                          <span>Desvincular</span>
                                        </>
                                      ) : (
                                        <>
                                          <Link2 className="w-3.5 h-3.5" />
                                          <span>Vincular</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveExerciseUp(idx)}
                                    disabled={idx === 0}
                                    className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white disabled:opacity-20 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                    title="Subir orden"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveExerciseDown(idx)}
                                    disabled={isLastOfDay}
                                    className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white disabled:opacity-20 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                    title="Bajar orden"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExercise(idx)}
                                    className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/60 text-red-400 hover:text-red-300 ml-0.5 min-h-[32px] min-w-[32px] flex items-center justify-center border border-red-500/20"
                                    title="Quitar ejercicio"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-left md:text-center">
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

                              <div className="bg-dark-850 p-2 rounded-xl border border-dark-750">
                                <span className="text-[11px] md:text-[10px] text-zinc-400 uppercase font-bold block mb-1">Reps</span>
                                <input
                                  type="text"
                                  value={item.repeticiones}
                                  onChange={(e) => handleUpdateExerciseParam(idx, 'repeticiones', e.target.value)}
                                  className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 md:py-1.5 md:px-2 text-center text-base md:text-xs font-black text-white min-h-[44px] md:min-h-[38px] focus:outline-none focus:border-brand"
                                />
                              </div>

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

                            {/* Observaciones / Consejos para el alumno */}
                            <div className="mt-2.5 pt-2.5 border-t border-dark-800/80 text-left">
                              <label className="text-[11px] md:text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5 mb-1">
                                <MessageSquare className="w-3 h-3 text-brand-light" />
                                <span>Observaciones / Consejos</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: Controlar la bajada, mantener espalda recta..."
                                value={item.observaciones || ''}
                                onChange={(e) => handleUpdateExerciseParam(idx, 'observaciones', e.target.value)}
                                className="w-full bg-dark-900 border border-dark-700 focus:border-brand rounded-lg px-3 py-2 md:py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors min-h-[38px]"
                              />
                            </div>
                          </div>
                        );
                      };

                      return blocks.map((block, bIdx) => {
                        if (!block.isGroup) {
                          const { item, index } = block.items[0];
                          return renderExerciseEditorCard(item, index);
                        }

                        return (
                          <div
                            key={`grp-block-${block.grupo_id}-${bIdx}`}
                            className="rounded-2xl border border-violet-500/35 border-l-4 border-l-violet-500 bg-violet-950/15 p-2.5 space-y-2.5 shadow-md"
                          >
                            <div className="flex items-center justify-between px-1.5">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10px] font-black tracking-wider uppercase">
                                  <Link2 className="w-3 h-3" />
                                  {block.label}
                                </span>
                                <span className="text-[10px] text-violet-300/80 font-medium">
                                  {block.items.length} ejercicios encadenados sin descanso
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {block.items.map(({ item, index }) => renderExerciseEditorCard(item, index))}
                            </div>
                          </div>
                        );
                      });
                    })()}

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
      {/* 4. MODAL DE CONFIRMACIÓN: REPLICAR SEMANAS                 */}
      {/* ========================================================== */}
      {isReplicateConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="card-dark rounded-2xl max-w-md w-full p-6 border border-dark-700 space-y-4 animate-scale">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">¿Sobrescribir semanas posteriores?</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Las semanas {selectedWeek + 1} a {routineForm.total_weeks} ya contienen ejercicios cargados. Replicar la Semana {selectedWeek} reemplazará completamente esas sesiones con la estructura actual.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsReplicateConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-dark-800 hover:bg-dark-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeReplicateRemainingWeeks}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-glow-amber transition-colors"
              >
                Sí, sobrescribir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
