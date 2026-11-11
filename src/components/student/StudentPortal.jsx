import React, { useState, useEffect } from 'react';
import BrandLogo, { MotivationalSlogan } from '../common/BrandLogo';
import { 
  Dumbbell, 
  TrendingUp, 
  CreditCard, 
  MessageSquare, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Flame, 
  ArrowLeft,
  ChevronRight,
  Info,
  Scale,
  Ruler,
  ExternalLink,
  Calendar,
  Play,
  Video,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Building2,
  MessageCircle,
  Receipt,
  Lock,
  HeartPulse,
  Timer,
  X
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
import { supabase } from '../../lib/supabaseClient';
import { 
  calcularEstadoPago, 
  getEstadoPagoConfig, 
  formatearFechaPago, 
  diasRestantesParaVencimiento, 
  formatearPrecioARS,
  normalizarFechaLocal,
  DEFAULT_BANK_DETAILS 
} from '../../utils/paymentUtils';
import ExerciseTechniqueModal from '../exercises/ExerciseTechniqueModal';
import ClientAvatar from '../common/ClientAvatar';
import StaticGif from '../common/StaticGif';
import AboutModal from '../AboutModal';
import MedicalRecordModal from '../medical/MedicalRecordModal';
import MedicalRecordViewOnly from '../medical/MedicalRecordViewOnly';

export default function StudentPortal({ student, onLogout }) {
  const [currentStudent, setCurrentStudent] = useState(student);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [activeSection, setActiveSection] = useState('home'); // 'home' | 'routine' | 'progress' | 'plan' | 'salud'
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [routine, setRoutine] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState({});
  const [exerciseLogs, setExerciseLogs] = useState({});
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [studentSessionLogs, setStudentSessionLogs] = useState([]);
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState(null);

  // Ficha Médica y de Salud
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [isMedicalMandatory, setIsMedicalMandatory] = useState(false);

  // Datos bancarios del coach y estado de copia
  const [bankDetails, setBankDetails] = useState(DEFAULT_BANK_DETAILS);
  const [copiedKey, setCopiedKey] = useState(null);

  // Seguimiento de Rutina: Fecha de inicio
  const [startDate, setStartDate] = useState(null);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [chosenStartDate, setChosenStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSavingStartDate, setIsSavingStartDate] = useState(false);

  // Seguimiento de Rutina: Finalizar entreno
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [showFinishSuccessModal, setShowFinishSuccessModal] = useState(false);
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);
  const [completedSessionsToday, setCompletedSessionsToday] = useState([]);
  const [entrenamientosDeHoy, setEntrenamientosDeHoy] = useState([]);
  const [sessionComments, setSessionComments] = useState('');

  // Auto-Rest Timer con Feedback Nativo (Vibración y Sonido)
  const [restTimer, setRestTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Función de audio sintético Web Audio API (cero dependencias externas y sin error 404)
  const playTimerAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const playTone = (freq, startTime, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          gain.gain.setValueAtTime(0.35, ctx.currentTime + startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };

        // Secuencia deportiva: 3 beeps de finalización (800Hz -> 800Hz -> 1200Hz)
        playTone(800, 0, 0.12);
        playTone(800, 0.18, 0.12);
        playTone(1200, 0.36, 0.35);
        return;
      }
    } catch (err) {
      console.warn('Web Audio API no inicializada:', err);
    }

    try {
      const audio = new Audio('/sounds/beep.mp3');
      audio.play().catch(e => console.warn('Autoplay de audio bloqueado por el navegador:', e));
    } catch (error) {
      console.warn('Error reproduciendo sonido:', error);
    }
  };

  // Efecto que decrementa el cronómetro cada 1000ms y activa el feedback nativo al llegar a 0
  useEffect(() => {
    let interval = null;

    if (isTimerActive && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => prev - 1);
      }, 1000);
    } else if (isTimerActive && restTimer === 0) {
      setIsTimerActive(false);

      // API de Vibración (Patrón: vibra, pausa, vibra)
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([500, 200, 500]);
        } catch (e) {
          console.warn('Vibrate API no permitida por el dispositivo/navegador:', e);
        }
      }

      // Sonido (Beep)
      playTimerAlertSound();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, restTimer]);

  useEffect(() => {
    loadStudentData();
  }, [student]);

  const loadStudentData = async () => {
    if (!student) return;
    const r = await dataService.getRoutineForClient(student.id);
    const ev = await dataService.getEvaluations(student.id);
    const p = await dataService.getPayments(student.id);
    const studentPayments = (Array.isArray(p) ? p : []).filter(item => !item.client_id || item.client_id === student.id || item.client_name === student.nombre_completo);

    setRoutine(r);
    setEvaluations(ev);
    setPayments(studentPayments);

    try {
      const sLogs = await dataService.getClientSessionLogs(student.id);
      setStudentSessionLogs(sLogs || []);
    } catch (errLogs) {
      console.warn('Error cargando historial de sesiones del alumno:', errLogs);
    }

    // Cargar ficha médica directamente desde Supabase sin confiar en flags ficticios
    try {
      if (student?.id) {
        const cleanStudentId = String(student.id).trim();
        const { data: fichaReal, error: fichaError } = await supabase
          .from('medical_records')
          .select('*')
          .eq('client_id', cleanStudentId)
          .maybeSingle();

        if (fichaError) {
          console.warn('Error consultando ficha médica en Supabase:', fichaError);
        }

        const estaRealmenteCompleta = Boolean(
          fichaReal && (fichaReal.completada === true || fichaReal.declaracion_jurada === true)
        );

        if (estaRealmenteCompleta) {
          setMedicalRecord(fichaReal);
          setIsMedicalMandatory(false);
          setShowMedicalModal(false);
        } else {
          // La base de datos no tiene ficha completada para este alumno
          setMedicalRecord(fichaReal || null);
          setIsMedicalMandatory(true);
          setShowMedicalModal(true);
        }
      }
    } catch (e) {
      console.warn('Error cargando ficha médica en StudentPortal:', e);
      setIsMedicalMandatory(true);
      setShowMedicalModal(true);
    }

    const banks = dataService.getBankDetails();
    setBankDetails(banks);

    // 1. Verificar si el campo fecha_inicio / fecha_inicio_rutina ya está definido
    let sDate = student.fecha_inicio || student.fecha_inicio_rutina;

    // Si no está en el prop, consultar en Supabase
    if (!sDate) {
      try {
        const { data: dbClient } = await supabase
          .from('clients')
          .select('fecha_inicio, fecha_inicio_rutina')
          .eq('id', student.id)
          .maybeSingle();

        if (dbClient) {
          sDate = dbClient.fecha_inicio || dbClient.fecha_inicio_rutina || null;
        }
      } catch (e) {
        console.warn('Error consultando fecha_inicio en clients:', e);
      }
    }

    if (!sDate) {
      sDate = await dataService.getRoutineStartDate(student.id);
    }
    if (!sDate) {
      try {
        const alumnoRaw = localStorage.getItem('alumno_session');
        if (alumnoRaw) {
          const parsed = JSON.parse(alumnoRaw);
          sDate = parsed.fecha_inicio || parsed.fecha_inicio_rutina || null;
        }
      } catch {}
    }
    if (!sDate) {
      sDate = localStorage.getItem(`ec_routine_start_${student.id}`);
    }

    if (sDate) {
      const normalized = String(sDate).split('T')[0];
      setStartDate(normalized);
      student.fecha_inicio = normalized;
      student.fecha_inicio_rutina = normalized;
      setShowStartDateModal(false);

      // Sincronizar alumno_session para que no se pierda al recargar
      try {
        const alumnoRaw = localStorage.getItem('alumno_session');
        if (alumnoRaw) {
          const parsed = JSON.parse(alumnoRaw);
          if (!parsed.fecha_inicio || !parsed.fecha_inicio_rutina) {
            parsed.fecha_inicio = normalized;
            parsed.fecha_inicio_rutina = normalized;
            localStorage.setItem('alumno_session', JSON.stringify(parsed));
          }
        }
      } catch {}
    } else {
      setStartDate(null);
      // Solo mostrar modal si hay una rutina asignada pendiente de inicio
      if (r) {
        setShowStartDateModal(true);
      } else {
        setShowStartDateModal(false);
      }
    }

    // 2. Consulta al historial del alumno para bloqueo diario basado en el tiempo (Bucle Semanal / Microciclo)
    try {
      // Obtener inicio del día actual (local)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const todayDateStr = new Date().toISOString().split('T')[0];

      let logsHoy = [];
      try {
        const { data: entrenamientosDeHoyData, error: errSessions } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('client_id', student.id)
          .gte('created_at', hoy.toISOString());

        if (!errSessions && Array.isArray(entrenamientosDeHoyData)) {
          logsHoy = entrenamientosDeHoyData;
        }
      } catch (errSupabase) {
        console.warn('Error consultando historial de hoy en Supabase:', errSupabase);
      }

      // Cargar sesiones históricas generales (incluye almacenamiento local y remoto)
      const allSessions = await dataService.getTrainingSessionsForClient(student.id);
      setTrainingSessions(allSessions || []);

      // Si por conectividad o caché local existen sesiones de hoy en allSessions, consolidarlas
      if (logsHoy.length === 0 && Array.isArray(allSessions)) {
        logsHoy = allSessions.filter(s => {
          const sDate = (s.fecha || s.created_at || '').split('T')[0];
          return sDate === todayDateStr && (s.completada === true || s.completada === undefined);
        });
      }

      setEntrenamientosDeHoy(logsHoy);

      const todayDone = logsHoy.map(s => s.routine_day_id || s.nombre_dia || s.dia_rutina).filter(Boolean);
      setCompletedSessionsToday(todayDone);
    } catch (e) {
      console.warn('Error cargando sesiones de hoy:', e);
    }
  };

  const handleConfirmStartDate = async () => {
    if (!chosenStartDate) return;
    setIsSavingStartDate(true);
    try {
      // 1. Formato ISO estricto YYYY-MM-DD
      let isoDate;
      try {
        if (typeof chosenStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(chosenStartDate.trim())) {
          isoDate = chosenStartDate.trim();
        } else {
          const d = new Date(chosenStartDate);
          isoDate = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        }
      } catch {
        isoDate = new Date().toISOString().split('T')[0];
      }

      // 2. Actualizar ambas columnas por compatibilidad en Supabase
      const { error } = await supabase
        .from('clients')
        .update({
          fecha_inicio: isoDate,
          fecha_inicio_rutina: isoDate
        })
        .eq('id', student.id);

      // Si falla por columna no existente en schema cache (PGRST204), intentar individualmente
      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
        try {
          await supabase.from('clients').update({ fecha_inicio: isoDate }).eq('id', student.id);
        } catch {}
        try {
          await supabase.from('clients').update({ fecha_inicio_rutina: isoDate }).eq('id', student.id);
        } catch {}
      }

      // 3. Cuando no haya error (o tras guardar), actualizar estado local y cerrar modal de inmediato
      setShowStartDateModal(false);
      setStartDate(isoDate);

      // 4. Actualizar referencias en memoria
      student.fecha_inicio = isoDate;
      student.fecha_inicio_rutina = isoDate;
      setCurrentStudent(prev => prev ? { ...prev, fecha_inicio: isoDate, fecha_inicio_rutina: isoDate } : prev);

      // 5. Persistir en dataService y almacenamiento local para que no vuelva a abrir al recargar
      await dataService.updateRoutineStartDate(student.id, isoDate);

      try {
        localStorage.setItem(`ec_routine_start_${student.id}`, isoDate);
        const alumnoRaw = localStorage.getItem('alumno_session');
        const sessionObj = alumnoRaw ? JSON.parse(alumnoRaw) : (student || {});
        sessionObj.fecha_inicio = isoDate;
        sessionObj.fecha_inicio_rutina = isoDate;
        localStorage.setItem('alumno_session', JSON.stringify(sessionObj));
      } catch (e) {
        console.warn('Error guardando alumno_session:', e);
      }
    } catch (err) {
      console.error('Error guardando fecha de inicio:', err);
      // Garantizar que no quede bloqueado
      setShowStartDateModal(false);
    } finally {
      setIsSavingStartDate(false);
    }
  };

  const hasRoutine = Boolean(routine && routine.dias && routine.dias.length > 0);
  const currentDay = hasRoutine && routine.dias[selectedDayIndex] ? routine.dias[selectedDayIndex] : null;

  // Regla de Negocio: Bucle Semanal o Microciclo.
  // La rutina asignada y sus días NUNCA mutan su estado a completada=true en la tabla de rutinas.
  // El bloqueo es un estado computado dinámicamente según los logs de training_sessions de HOY.
  const isDayCompletedToday = (dia, index) => {
    if (!dia) return false;
    const dayId = dia.id || `dia-${index + 1}`;
    const dayName = (dia.dia || `Día ${index + 1}`).toLowerCase().trim();
    const dayLabel = `día ${index + 1}`;
    const dayWeek = (dia.dia_semana || (dia.dia?.includes('(') ? dia.dia.split('(')[1].split(')')[0] : dia.dia?.split(':')[0]) || '').toLowerCase().trim();

    return (entrenamientosDeHoy || []).some(log => {
      // 1. Coincidencia directa por routine_day_id
      if (log.routine_day_id && (log.routine_day_id === dayId || log.routine_day_id === dia.id)) {
        return true;
      }
      // 2. Coincidencia por nombre o etiqueta del día
      const logName = (log.nombre_dia || log.dia_rutina || '').toLowerCase().trim();
      if (!logName) return false;
      return (
        logName === dayId ||
        logName === dayName ||
        logName === dayLabel ||
        (dayWeek && logName === dayWeek) ||
        (dayName && logName.includes(dayName)) ||
        logName.includes(dayLabel)
      );
    });
  };

  const isCurrentDayDone = Boolean(
    currentDay && isDayCompletedToday(currentDay, selectedDayIndex)
  );

  // Inmutabilidad de Sesiones de Entrenamiento (Read-Only por el día actual)
  const isReadOnly = isCurrentDayDone;

  const toggleSetCompleted = (exerciseId, setIdx, restParam = 90) => {
    if (isReadOnly) return;
    const key = `${exerciseId}-${setIdx}`;
    const willBeDone = !completedSets[key];

    setCompletedSets(prev => ({
      ...prev,
      [key]: willBeDone
    }));

    // Auto-Rest Timer: iniciar automáticamente al marcar la serie como completada
    if (willBeDone) {
      const rawSec = typeof restParam === 'number'
        ? restParam
        : (parseInt(String(restParam || '').replace(/\D/g, ''), 10) || 90);
      const descansoSugerido = rawSec > 0 ? rawSec : 90;
      setRestTimer(descansoSugerido);
      setIsTimerActive(true);
    }
  };

  const handleConfirmFinishWorkout = async () => {
    if (!currentDay || isReadOnly) return;
    setIsFinishingWorkout(true);
    const dayLabel = `Día ${selectedDayIndex + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const dayId = currentDay.id || `dia-${selectedDayIndex + 1}`;
    const studentId = student?.id || currentStudent?.id;

    try {
      // 1. Mapear datos reales ejecutados SERIE POR SERIE para session_exercise_logs
      const exercisesForLog = [];

      (currentDay.ejercicios || []).forEach(item => {
        const totalSets = Math.max(1, parseInt(item.series, 10) || 1);

        for (let sIdx = 0; sIdx < totalSets; sIdx++) {
          const isDone = Boolean(completedSets[`${item.id}-${sIdx}`]);
          
          // Buscar valores específicos ingresados para esta serie
          const setPesoInput = exerciseLogs[`${item.id}_set_${sIdx}_peso`];
          const setRepsInput = exerciseLogs[`${item.id}_set_${sIdx}_reps`];

          // Fallbacks: input específico de serie -> input general -> prescripción del coach
          const actualWeight = (setPesoInput !== undefined && setPesoInput !== '')
            ? setPesoInput
            : ((exerciseLogs[`${item.id}_peso`] !== undefined && exerciseLogs[`${item.id}_peso`] !== '')
              ? exerciseLogs[`${item.id}_peso`]
              : (item.peso_sugerido || 0));

          const actualReps = (setRepsInput !== undefined && setRepsInput !== '')
            ? setRepsInput
            : ((exerciseLogs[`${item.id}_reps`] !== undefined && exerciseLogs[`${item.id}_reps`] !== '')
              ? exerciseLogs[`${item.id}_reps`]
              : (item.repeticiones || 10));

          exercisesForLog.push({
            exercise_name: item.exercise?.nombre || 'Ejercicio',
            prescribed_sets: totalSets,
            prescribed_reps: item.repeticiones,
            prescribed_weight: item.peso_sugerido,
            actual_sets: 1, // 1 serie individual registrada
            actual_reps: actualReps,
            actual_weight: actualWeight,
            set_number: sIdx + 1,
            is_completed: isDone
          });
        }
      });

      // 2. Guardar en session_logs y session_exercise_logs (feedback de cargas)
      const saveRes = await dataService.saveWorkoutSession({
        clientId: studentId,
        comentarios: sessionComments,
        exercises: exercisesForLog
      });

      if (saveRes?.data) {
        setStudentSessionLogs(prev => [saveRes.data, ...prev]);
      }

      // 3. Registrar en training_sessions para preservar estadísticas de asistencia y calendario
      const recorded = await dataService.recordTrainingSession({
        clientId: studentId,
        nombreDia: dayLabel,
        diaRutina: dayLabel,
        dayId: dayId,
        routineDayId: dayId,
        fecha: today,
        completada: true
      });

      if (recorded) {
        setTrainingSessions(prev => [recorded, ...prev]);
        setEntrenamientosDeHoy(prev => [recorded, ...prev]);
      }
      setCompletedSessionsToday(prev => [...prev, dayId, dayLabel, currentDay.dia].filter(Boolean));
      setSessionComments('');
      setShowFinishConfirmModal(false);
      setShowFinishSuccessModal(true);
    } catch (err) {
      console.error('Error al registrar finalización de entreno:', err);
      alert('Hubo un error al registrar el entreno.');
    } finally {
      setIsFinishingWorkout(false);
    }
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const estadoPago = currentStudent.estado_pago || calcularEstadoPago(currentStudent.fecha_vencimiento);
  const configPago = getEstadoPagoConfig(estadoPago);
  const diffDias = diasRestantesParaVencimiento(currentStudent.fecha_vencimiento);

  // Verificación estricta de cuota activa y vigente con normalización local
  const hoyFecha = normalizarFechaLocal(new Date().toISOString().split('T')[0]);
  const vencFecha = normalizarFechaLocal(currentStudent?.fecha_vencimiento);
  const tieneAccesoActivo = Boolean(vencFecha && vencFecha.getTime() >= hoyFecha.getTime());

  const coachPhone = import.meta.env.VITE_COACH_WHATSAPP || bankDetails?.telefono || '5491155550199';
  let cleanCoachPhone = String(coachPhone).replace(/[^0-9]/g, '');
  if (!cleanCoachPhone.startsWith('54') && cleanCoachPhone.length === 10) {
    cleanCoachPhone = `549${cleanCoachPhone}`;
  }

  const whatsappUrl = `https://wa.me/${cleanCoachPhone}?text=Hola%20Esteban,%20soy%20${encodeURIComponent(currentStudent.nombre_completo)}%20(C%C3%B3digo:%20${currentStudent.access_code}).%20Te%20escribo%20por%20mi%20entrenamiento!`;
  const msgComprobante = `¡Hola Esteban! Ya realicé la transferencia de mi cuota de ${currentStudent.plan_actual || 'entrenamiento'}. Te adjunto el comprobante por acá. Alumno: ${currentStudent.nombre_completo}`;
  const comprobanteWhatsAppUrl = `https://wa.me/${cleanCoachPhone}?text=${encodeURIComponent(msgComprobante)}`;

  return (
    <div className="min-h-screen bg-dark-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent text-gray-100 flex flex-col justify-between max-w-md mx-auto relative border-x border-dark-800 shadow-2xl overflow-x-hidden">
      
      {/* HEADER MÓVIL DEL ALUMNO */}
      <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-md border-b border-dark-700/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeSection !== 'home' ? (
            <button
              onClick={() => setActiveSection('home')}
              className="p-1.5 rounded-lg bg-dark-800 text-gray-300 hover:text-white min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <BrandLogo size="sm" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAboutModalOpen(true)}
            title="Acerca de la app / Soporte"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition-all min-h-[38px] min-w-[38px] flex items-center justify-center border border-transparent hover:border-dark-700 active:scale-95"
          >
            <Info className="w-4 h-4 text-brand-light" />
          </button>
          <span className="text-[11px] font-mono font-bold px-2 py-1 rounded bg-brand/20 text-brand-light border border-brand/30">
            {student.access_code}
          </span>
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-dark-800 transition-all min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 space-y-4">
        
        {/* VISTA 1: HOME (PORTAL PRINCIPAL CON 4 ACCESOS) */}
        {activeSection === 'home' && (
          <>
            {/* Banner de Bienvenida con Slogan y Avatar */}
            <div className="relative rounded-2xl bg-gradient-to-br from-brand-dark via-dark-850 to-dark-900 border border-brand/30 p-4 sm:p-5 overflow-hidden shadow-glow-red/20">
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-brand-light bg-brand/20 px-2.5 py-0.5 rounded-full border border-brand/40 mb-1.5">
                    <Flame className="w-3.5 h-3.5" /> Atleta EC
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    ¡Hola, {student.nombre_completo.split(' ')[0]}!
                  </h1>
                  <MotivationalSlogan className="mt-1" />
                </div>
                <ClientAvatar
                  client={student}
                  size="xl"
                  showStatus={true}
                  status={student.estado || 'Activo'}
                  className="shrink-0 border-2 border-brand/60 shadow-glow-red/30"
                />
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
                <span className="truncate max-w-[65%]">🎯 {student.objetivo}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-emerald-400 font-bold">{student.estado || 'Activo'}</span>
                  <button
                    onClick={onLogout}
                    title="Cerrar sesión en este dispositivo"
                    className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 pl-2 border-l border-white/10 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span className="hidden sm:inline">Salir</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ACCESOS PRINCIPALES ESTILO CUADRÍCULA (Mobile-First) */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 px-1">
                Mi Espacio de Entrenamiento
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                
                {/* 1. Mi Rutina */}
                <button
                  onClick={() => setActiveSection('routine')}
                  className="card-dark rounded-2xl p-3.5 sm:p-4 card-dark-hover text-left flex flex-col justify-between min-h-[120px] sm:min-h-[136px] group relative overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand-light group-hover:scale-105 transition-transform shrink-0">
                    <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-brand-light transition-colors line-clamp-1">
                        Mi Rutina
                      </h3>
                      {!hasRoutine && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Próximamente
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                      {hasRoutine ? 'Series, repes y técnica' : 'En planificación'}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute top-3.5 right-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 2. Mi Progreso */}
                <button
                  onClick={() => setActiveSection('progress')}
                  className="card-dark rounded-2xl p-3.5 sm:p-4 card-dark-hover text-left flex flex-col justify-between min-h-[120px] sm:min-h-[136px] group relative overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                      Mi Progreso
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 line-clamp-1">Peso y medidas</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute top-3.5 right-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 3. Mi Plan */}
                <button
                  onClick={() => setActiveSection('plan')}
                  className="card-dark rounded-2xl p-3.5 sm:p-4 card-dark-hover text-left flex flex-col justify-between min-h-[120px] sm:min-h-[136px] group relative overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      Mi Plan
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 line-clamp-1">Vencimiento y cuota</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute top-3.5 right-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 4. Mi Ficha de Salud */}
                <button
                  onClick={() => setActiveSection('salud')}
                  className="card-dark rounded-2xl p-3.5 sm:p-4 card-dark-hover text-left flex flex-col justify-between min-h-[120px] sm:min-h-[136px] group relative overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform shrink-0">
                    <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-red-400 transition-colors line-clamp-1">
                        Ficha Médica
                      </h3>
                      {medicalRecord?.completada ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Al día
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 line-clamp-1">Lesiones y salud</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute top-3.5 right-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

              </div>
            </div>

            {/* ========================================================== */}
            {/* CARD DESTACADA: MI MEMBRESÍA Y VENCIMIENTO (HOME) */}
            {/* ========================================================== */}
            <div 
              onClick={() => setActiveSection('plan')}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4 cursor-pointer hover:border-gray-700 active:scale-[0.99] transition-all"
            >
              {/* Encabezado: Nombre del Plan y Badge de Estado */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand-light shrink-0 shadow-inner">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Mi Membresía
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white truncate">
                      {currentPlan?.nombre || currentStudent.plan_actual || 'Plan Personalizado'}
                    </h3>
                  </div>
                </div>

                {/* Badge de Estado: Verde 'Al día', Naranja 'Por vencer', Rojo 'Vencido' */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide shrink-0 ${configPago.badgeClass}`}>
                  <span className={`w-2 h-2 rounded-full ${configPago.dotClass}`}></span>
                  {configPago.label}
                </span>
              </div>

              {/* Precio que abona por su plan */}
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">
                  Valor mensual del plan
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight mt-0.5">
                  {currentPlan?.precio ? formatearPrecioARS(currentPlan.precio) : '$45.000'}
                  <span className="text-xs sm:text-sm font-bold text-gray-400 ml-1.5 font-sans">
                    / mes
                  </span>
                </p>
              </div>

              {/* Grid de 2 columnas con fechas: Inicio y Vencimiento */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800/90">
                
                {/* Columna Izquierda: Fecha de Inicio */}
                <div className="bg-gray-950/80 rounded-xl p-3 border border-gray-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Fecha de Inicio
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-white block">
                    {formatearFechaPago(currentStudent.fecha_inicio_rutina || currentStudent.creado_el || currentStudent.created_at || '2026-10-15')}
                  </span>
                </div>

                {/* Columna Derecha: Fecha de Vencimiento */}
                <div className="bg-gray-950/80 rounded-xl p-3 border border-gray-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Fecha de Vencimiento
                  </span>
                  <span className={`text-xs sm:text-sm font-extrabold block ${
                    estadoPago === 'al_dia' ? 'text-emerald-400' :
                    estadoPago === 'por_vencer' ? 'text-amber-400' :
                    estadoPago === 'vencido' ? 'text-red-400' : 'text-gray-300'
                  }`}>
                    {currentStudent.fecha_vencimiento ? formatearFechaPago(currentStudent.fecha_vencimiento) : 'Sin definir'}
                  </span>
                </div>

              </div>

              {/* Días restantes (Texto secundario) */}
              <div className="flex items-center justify-between text-xs pt-0.5 text-gray-300">
                <span className="font-semibold text-[11px] sm:text-xs">
                  {currentStudent.fecha_vencimiento ? (
                    diffDias > 0 ? (
                      <span className={diffDias <= 5 ? 'text-amber-400 font-bold' : 'text-gray-300'}>
                        Tu cuota vence en {diffDias} día{diffDias > 1 ? 's' : ''}
                      </span>
                    ) : diffDias === 0 ? (
                      <span className="text-amber-400 font-black">Tu cuota vence hoy</span>
                    ) : (
                      <span className="text-red-400 font-bold">
                        Tu cuota venció hace {Math.abs(diffDias)} día{Math.abs(diffDias) > 1 ? 's' : ''}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-400">Toca para ver datos de pago</span>
                  )}
                </span>
                
                <span className="text-[11px] text-brand-light font-bold flex items-center gap-0.5">
                  Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Barra indicadora inferior */}
              <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${
                configPago.color === 'emerald' ? 'bg-emerald-500' :
                configPago.color === 'amber' ? 'bg-amber-500' :
                configPago.color === 'red' ? 'bg-brand' : 'bg-gray-600'
              }`}></div>
            </div>

            {/* Tarjeta Motivacional */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-dark-900 border border-dark-700/80 text-center space-y-1">
              <p className="text-xs font-bold text-gray-300">
                "No busques motivación todos los días. Construí la disciplina que te lleve cuando no haya ganas."
              </p>
              <p className="text-[11px] text-brand-light font-semibold">— Esteban Correa</p>
            </div>
          </>
        )}

        {/* VISTA 2: MI RUTINA DETALLADA */}
        {activeSection === 'routine' && (
          !medicalRecord?.completada ? (
            /* PANTALLA DE BLOQUEO POR FICHA MÉDICA INCOMPLETA */
            <div className="card-dark rounded-2xl p-6 sm:p-8 text-center space-y-5 border border-red-900/40 shadow-2xl max-w-lg mx-auto my-4 animate-scale">
              <div className="w-16 h-16 rounded-2xl bg-red-950/70 border-2 border-red-500/50 flex items-center justify-center text-brand-light mx-auto shadow-lg shadow-red-950/60">
                <HeartPulse className="w-8 h-8 text-brand-light" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Paso Obligatorio de Salud
                </span>

                <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Ficha Médica Requerida
                </h3>

                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm mx-auto font-medium">
                  Para cuidar tu salud y adaptar los ejercicios a tu anatomía, debes completar tu Ficha Médica Inicial antes de acceder a tu rutina.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMedicalMandatory(true);
                  setShowMedicalModal(true);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-black text-xs uppercase tracking-wider transition-all shadow-glow-red flex items-center justify-center gap-2"
              >
                <HeartPulse className="w-4 h-4" />
                <span>Completar Ficha Médica Ahora</span>
              </button>
            </div>
          ) : !tieneAccesoActivo ? (
            /* PANTALLA DE BLOQUEO (PAYWALL) SI NO TIENE PAGO VIGENTE */
            <div className="card-dark rounded-2xl p-6 sm:p-8 text-center space-y-5 border border-red-900/40 shadow-2xl max-w-lg mx-auto my-4 animate-scale">
              {/* Ícono central de candado con círculo rojo oscuro/borde ámbar */}
              <div className="w-16 h-16 rounded-2xl bg-red-950/70 border-2 border-amber-500/50 flex items-center justify-center text-red-400 mx-auto shadow-lg shadow-red-950/60">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Membresía Requerida
                </span>

                <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Rutina no disponible
                </h3>

                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm mx-auto font-medium">
                  Tu membresía no registra un pago activo o se encuentra vencida. Para acceder a tus entrenamientos, regulariza tu cuota con tu entrenador.
                </p>
              </div>

              {/* Tarjeta con los datos de cobro de Esteban */}
              <div className="bg-dark-900/90 rounded-2xl p-4 border border-dark-750 text-left space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-light" /> Datos de Transferencia
                  </span>
                  <span className="text-xs font-bold text-white">{bankDetails?.banco || 'Mercado Pago'}</span>
                </div>

                {/* Alias */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 block">Alias:</span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 truncate block">
                      {bankDetails?.alias || 'ESTEBAN.TRAINER.MP'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails?.alias, 'alias_paywall')}
                    className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-dark-700 text-xs shrink-0"
                    title="Copiar Alias"
                  >
                    {copiedKey === 'alias_paywall' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* CBU */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 block">CBU:</span>
                    <span className="text-xs font-mono text-gray-300 truncate block">
                      {bankDetails?.cbu || '0000003100012345678901'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails?.cbu, 'cbu_paywall')}
                    className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-dark-700 text-xs shrink-0"
                    title="Copiar CBU"
                  >
                    {copiedKey === 'cbu_paywall' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Titular */}
                <div className="text-[11px] text-gray-400 pt-1 border-t border-dark-800/80 flex justify-between">
                  <span>Titular:</span>
                  <span className="text-white font-medium">{bankDetails?.titular || 'Esteban Correa'}</span>
                </div>
              </div>

              {/* Botón Destacado: Avisar que pagué / Enviar comprobante */}
              <a
                href={comprobanteWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Avisar que pagué / Enviar comprobante</span>
              </a>

              <button
                type="button"
                onClick={() => setActiveSection('home')}
                className="w-full py-2.5 px-4 rounded-xl bg-dark-850 hover:bg-dark-800 text-gray-400 hover:text-white font-semibold text-xs border border-dark-700 transition-all"
              >
                Volver al Menú Principal
              </button>
            </div>
          ) : !hasRoutine ? (
            /* EMPTY STATE AMIGABLE: PLAN EN CONSTRUCCIÓN (SIN SCROLL VERTICAL) */
            <div className="card-dark rounded-2xl p-6 sm:p-8 text-center space-y-4 border border-white/5 shadow-xl max-w-md mx-auto my-6 animate-scale">
              <div className="w-16 h-16 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-light mx-auto shadow-inner">
                <Dumbbell className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-brand/15 text-brand-light border border-brand/30 inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Plan en construcción
                </span>

                <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                  Plan en construcción
                </h3>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto font-medium">
                  Tu entrenador está preparando tu rutina personalizada. Te avisaremos cuando esté lista.
                </p>
              </div>

              {/* Ficha informativa del esquema acordado */}
              <div className="pt-3 border-t border-dark-700/80 text-left bg-dark-900/70 p-3.5 rounded-xl border border-dark-750 space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Tu Esquema Acordado:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Frecuencia:</span>
                    <span className="font-bold text-white">{student.dias_por_semana || 3} días por semana</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Planificación:</span>
                    <span className="font-bold text-white">{student.tipo_planificacion || 'Semanal'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Duración:</span>
                    <span className="font-bold text-white">{student.duracion_sesion_min || 60} min por sesión</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Objetivo:</span>
                    <span className="font-bold text-brand-light truncate block">{student.objetivo || 'Acondicionamiento'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('home')}
                className="w-full py-3 px-4 rounded-xl bg-dark-850 hover:bg-dark-800 text-white font-bold text-xs border border-dark-700 transition-all min-h-[44px]"
              >
                Volver al Menú Principal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-brand" />
                  {routine.nombre}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{routine.objetivo || routine.descripcion || 'Plan personalizado con sobrecarga progresiva'}</p>
              </div>

              {/* Ficha del Esquema Semanal / Mensual del Alumno */}
              <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-700/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Esquema Pactado</span>
                    <p className="font-bold text-white text-xs">
                      Plan {student.tipo_planificacion || 'Semanal'} • {student.dias_por_semana || routine.dias.length} días de entreno
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-brand/15 text-brand-light font-bold text-[11px] border border-brand/20 shrink-0">
                  ⏱️ {student.duracion_sesion_min || 60} min
                </span>
              </div>

            {/* Selector de Días Asignados de la Rutina */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">
                Selecciona el día de entrenamiento:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {routine?.dias?.map((d, index) => {
                  const dayLabel = d.dia_semana || (d.dia.includes('(') ? d.dia.split('(')[1].split(')')[0] : d.dia.split(':')[0]);
                  const isActive = selectedDayIndex === index;
                  const isDoneToday = isDayCompletedToday(d, index);
                  const count = d.ejercicios?.length || 0;
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDayIndex(index)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-brand text-white shadow-glow-red scale-[1.02]'
                          : isDoneToday
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/70'
                            : 'bg-dark-900 text-gray-400 hover:text-white border border-dark-700'
                      }`}
                    >
                      {isDoneToday && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 font-black" />}
                      <span>{dayLabel}</span>
                      {isDoneToday ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/30">
                          Completado hoy
                        </span>
                      ) : (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive 
                            ? 'bg-black/40 text-white' 
                            : 'bg-dark-800 text-zinc-300'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feedback Visual Superior (Banner Informativo de Solo Lectura por Día Completado Hoy) */}
            {isReadOnly && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between gap-3 mb-6 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                  <span>Entrenamiento finalizado. Modo solo lectura por hoy.</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 uppercase tracking-wider shrink-0">
                  Completado por hoy
                </span>
              </div>
            )}

            {/* Nombre y Enfoque del Día Seleccionado */}
            <div className="p-3 rounded-xl bg-dark-900 border border-dark-700 flex items-center justify-between">
              <span className="text-xs font-bold text-brand-light flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-brand" />
                {currentDay?.dia || 'Sesión de Entrenamiento'}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                {currentDay?.ejercicios?.length || 0} ejercicios
              </span>
            </div>

            {/* Lista de Ejercicios del Día o Estado Vacío */}
            {currentDay?.ejercicios && currentDay.ejercicios.length > 0 ? (
              <div className="space-y-3">
                {currentDay.ejercicios.map((item) => (
                  <div
                    key={item.id}
                    className="card-dark rounded-2xl p-4 space-y-3 border border-white/5 shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-xl bg-white p-1 border border-dark-700 shrink-0 flex items-center justify-center overflow-hidden">
                        <StaticGif
                          src={item.exercise?.gif_url || item.exercise?.imagen_url}
                          alt={item.exercise?.nombre || 'Ejercicio'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/20 text-brand-light">
                          {item.exercise.grupo_muscular}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1 break-words">
                          {item.exercise.nombre}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                          {item.exercise.instrucciones}
                        </p>
                      </div>
                    </div>

                    {/* Botón accesible para ver video de técnica y errores a evitar */}
                    <button
                      type="button"
                      onClick={() => setSelectedExerciseForModal(item.exercise)}
                      className="w-full py-2.5 px-3 rounded-xl bg-dark-900 hover:bg-dark-850 text-brand-light hover:text-white border border-brand/30 hover:border-brand/60 transition-all flex items-center justify-between text-xs font-bold shadow-sm active:scale-[0.99] min-h-[44px]"
                    >
                      <span className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 fill-current text-brand" />
                        <span>Ver Técnica / Video & Errores</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-brand" />
                    </button>

                    {/* Series & Carga */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-dark-900 border border-dark-700">
                        <span className="text-[10px] text-gray-400 block">Series x Reps</span>
                        <span className="font-bold text-white">{item.series} x {item.repeticiones}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-900 border border-dark-700">
                        <span className="text-[10px] text-gray-400 block">Carga Sugerida</span>
                        <span className="font-bold text-brand-light">{item.peso_sugerido}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-900 border border-dark-700">
                        <span className="text-[10px] text-gray-400 block">Descanso</span>
                        <span className="font-bold text-white">{item.descanso_seg}s</span>
                      </div>
                    </div>

                    {/* REGISTRO DETALLADO SERIE POR SERIE */}
                    <div className="space-y-2 pt-2 border-t border-dark-700/60">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-300 px-1">
                        <span className="uppercase tracking-wider flex items-center gap-1.5 text-brand-light">
                          <Dumbbell className="w-3.5 h-3.5" />
                          Registro Serie por Serie
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {isReadOnly ? 'Bloqueado (Solo lectura)' : 'Toca "Listo" al terminar cada serie'}
                        </span>
                      </div>

                      {/* Header de columnas */}
                      <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">
                        <div className="col-span-3 text-left pl-1">Serie</div>
                        <div className="col-span-3">Peso (kg)</div>
                        <div className="col-span-3">Reps</div>
                        <div className="col-span-3">Estado</div>
                      </div>

                      {/* Filas independientes por cada serie */}
                      <div className="space-y-2">
                        {Array.from({ length: Math.max(1, parseInt(item.series, 10) || 1) }).map((_, sIdx) => {
                          const isDone = isReadOnly || Boolean(completedSets[`${item.id}-${sIdx}`]);
                          const setPeso = exerciseLogs[`${item.id}_set_${sIdx}_peso`] ?? '';
                          const setReps = exerciseLogs[`${item.id}_set_${sIdx}_reps`] ?? '';

                          return (
                            <div
                              key={sIdx}
                              className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${
                                isDone
                                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                                  : 'bg-dark-900 border-dark-700/80 hover:border-dark-600'
                              }`}
                            >
                              {/* Columna 1: Número de Serie & Objetivo */}
                              <div className="col-span-3 flex items-center gap-1.5 pl-0.5">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                  isDone 
                                    ? 'bg-emerald-500 text-white shadow-sm' 
                                    : 'bg-dark-800 text-gray-300 border border-dark-700'
                                }`}>
                                  {sIdx + 1}
                                </span>
                                <div className="leading-tight min-w-0">
                                  <span className="text-[11px] font-bold text-white block">Serie {sIdx + 1}</span>
                                  <span className="text-[9px] text-gray-500 block truncate" title={`Obj: ${item.repeticiones} reps @ ${item.peso_sugerido || '-'} kg`}>
                                    Obj: {item.repeticiones}r
                                  </span>
                                </div>
                              </div>

                              {/* Columna 2: Input Peso Real (kg) */}
                              <div className="col-span-3">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  disabled={isReadOnly}
                                  value={setPeso}
                                  onChange={(e) => setExerciseLogs(prev => ({
                                    ...prev,
                                    [`${item.id}_set_${sIdx}_peso`]: e.target.value
                                  }))}
                                  placeholder={item.peso_sugerido ? `${item.peso_sugerido}` : 'kg'}
                                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold placeholder-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[38px]"
                                />
                              </div>

                              {/* Columna 3: Input Reps Reales */}
                              <div className="col-span-3">
                                <input
                                  type="number"
                                  min="0"
                                  disabled={isReadOnly}
                                  value={setReps}
                                  onChange={(e) => setExerciseLogs(prev => ({
                                    ...prev,
                                    [`${item.id}_set_${sIdx}_reps`]: e.target.value
                                  }))}
                                  placeholder={item.repeticiones ? `${item.repeticiones}` : 'reps'}
                                  className="w-full bg-dark-950 border border-dark-700 focus:border-brand rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold placeholder-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[38px]"
                                />
                              </div>

                              {/* Columna 4: Botón o Estado Completada */}
                              <div className="col-span-3">
                                <button
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={() => toggleSetCompleted(item.id, sIdx, item.descanso_seg || item.descanso)}
                                  className={`w-full min-h-[38px] px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border select-none ${
                                    isDone
                                      ? isReadOnly
                                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-950/50 active:scale-95'
                                      : isReadOnly
                                        ? 'bg-dark-950/40 text-gray-600 border-dark-800 cursor-not-allowed'
                                        : 'bg-dark-800 hover:bg-dark-750 text-gray-300 border-dark-700 hover:border-gray-500 hover:text-white active:scale-95'
                                  }`}
                                >
                                  <CheckCircle2 className={`w-3.5 h-3.5 ${isDone ? 'text-white' : 'text-gray-500'}`} />
                                  <span>{isDone ? 'Hecha' : 'Listo'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {item.notas && (
                      <p className="text-[11px] text-amber-300/90 italic bg-amber-950/20 p-2 rounded-lg border border-amber-900/30">
                        💡 Nota del Coach: {item.notas}
                      </p>
                    )}
                  </div>
                ))}

                {/* BOTÓN FINALIZAR Y GUARDAR SESIÓN (BLOQUEADO EN MODO SOLO LECTURA POR HOY) */}
                <div className="pt-3">
                  {isReadOnly ? (
                    <button
                      type="button"
                      disabled
                      className="bg-emerald-950/60 border border-emerald-500/30 cursor-not-allowed w-full p-4 rounded-xl text-base sm:text-lg font-bold text-emerald-300 flex items-center justify-center gap-2 shadow-inner select-none transition-all disabled:opacity-80 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span>Completado por hoy</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowFinishConfirmModal(true)}
                      disabled={isFinishingWorkout}
                      className="bg-red-600 hover:bg-red-500 active:scale-[0.98] w-full p-4 rounded-xl text-base sm:text-lg font-bold text-white flex items-center justify-center gap-2 shadow-glow-red hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Flame className="w-6 h-6 text-amber-300" />
                      <span>Finalizar y Guardar Sesión</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-dark rounded-2xl p-8 text-center space-y-2 border border-dashed border-dark-700">
                <Flame className="w-8 h-8 text-brand-light mx-auto" />
                <h3 className="text-sm font-bold text-white">Día de Recuperación o Sin Ejercicios</h3>
                <p className="text-xs text-gray-400">
                  Aprovecha para descansar, hidratarte y respetar los tiempos biológicos de recuperación.
                </p>
              </div>
            )}
          </div>
          )
        )}

        {/* VISTA 3: MI PROGRESO */}
        {activeSection === 'progress' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand" />
              Mi Evolución Física
            </h2>

            {/* Gráfico de Peso */}
            <div className="card-dark rounded-2xl p-4">
              <span className="text-xs font-bold text-gray-300 block mb-2">
                Curva de Peso Corporal (kg)
              </span>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evaluations} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
                    <XAxis dataKey="fecha" stroke="#888" fontSize={10} />
                    <YAxis domain={['auto', 'auto']} stroke="#888" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181f', borderColor: '#272733', borderRadius: '0.5rem', color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="peso" stroke="#e50914" strokeWidth={3} dot={{ fill: '#e50914', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Medidas Históricas */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-300 uppercase px-1">Historial de Medidas</span>
              {evaluations.map((ev) => (
                <div key={ev.id} className="card-dark rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{ev.fecha}</span>
                    <span className="font-mono font-bold text-brand-light">{ev.peso} kg</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-400 pt-1 border-t border-dark-700">
                    <div>Cintura: <strong className="text-gray-200">{ev.cintura} cm</strong></div>
                    <div>Cadera: <strong className="text-gray-200">{ev.cadera} cm</strong></div>
                    <div>Brazo: <strong className="text-gray-200">{ev.brazo} cm</strong></div>
                    <div>Grasa: <strong className="text-amber-400">{ev.porcentaje_grasa}%</strong></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Historial de Entrenamientos & Cargas Reales del Alumno */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-gray-300 uppercase px-1 flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-brand" />
                Mis Entrenamientos & Cargas Reales
              </span>
              
              {studentSessionLogs.length === 0 ? (
                <div className="card-dark rounded-xl p-4 text-center text-xs text-gray-400 border border-dashed border-dark-700">
                  Aún no has registrado sesiones. Cuando completes tu rutina y pulses "Finalizar y Guardar Sesión", verás aquí tus marcas y sensaciones.
                </div>
              ) : (
                studentSessionLogs.map((sess) => {
                  const exList = sess.session_exercise_logs || [];
                  const sessDate = sess.fecha 
                    ? new Date(sess.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
                    : 'Sesión';

                  return (
                    <div key={sess.id} className="card-dark rounded-xl p-3.5 text-xs space-y-2.5">
                      <div className="flex justify-between items-center border-b border-dark-700/60 pb-1.5">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          {sessDate}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold bg-dark-900 px-2 py-0.5 rounded-full border border-dark-700">
                          {exList.length} ejercicios
                        </span>
                      </div>

                      {sess.comentarios_alumno && (
                        <p className="text-[11px] text-brand-light italic bg-brand-950/20 p-2 rounded-lg border border-brand/20">
                          💬 "{sess.comentarios_alumno}"
                        </p>
                      )}

                      <div className="space-y-2 pt-0.5">
                        {(() => {
                          const groupedMap = new Map();
                          exList.forEach((ex) => {
                            const name = ex.exercise_name || 'Ejercicio';
                            if (!groupedMap.has(name)) {
                              groupedMap.set(name, []);
                            }
                            groupedMap.get(name).push(ex);
                          });

                          return Array.from(groupedMap.entries()).map(([exName, setsArr], i) => (
                            <div key={i} className="p-2 rounded-lg bg-dark-900/70 border border-dark-700/60 space-y-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-bold text-white">{exName}</span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {setsArr.length} {setsArr.length === 1 ? 'serie' : 'series'}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {setsArr.map((s, sIndex) => (
                                  <span key={sIndex} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-dark-950 border border-dark-700 text-[10px] text-gray-300 font-mono">
                                    <strong className="text-gray-400">S{sIndex + 1}:</strong>
                                    <span className="text-white font-bold">{s.actual_reps || s.prescribed_reps}r</span>
                                    <span>@</span>
                                    <span className="text-brand-light font-bold">{s.actual_weight || s.prescribed_weight}kg</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VISTA 4: MI PLAN & CUOTAS (TARJETA MI MEMBRESÍA) */}
        {activeSection === 'plan' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand" />
              Mi Membresía & Cuota
            </h2>

            {/* TARJETA PRINCIPAL "MI MEMBRESÍA" */}
            <div className="card-dark rounded-2xl p-5 border border-brand/35 space-y-4 relative overflow-hidden shadow-glow-red/10">
              
              {/* Encabezado del plan */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-light">
                    Membresía Asignada
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    {currentStudent.plan_actual || 'Plan 3x Semanal Personalizado'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Modalidad: {currentStudent.modalidad || 'Presencial'} con seguimiento personalizado
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${configPago.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${configPago.dotClass}`}></span>
                  {configPago.label}
                </span>
              </div>

              {/* Estado de su cuota con fechas y días */}
              <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Valor que abonas:</span>
                  <span className="font-mono font-black text-white text-base">
                    {currentPlan?.precio ? formatearPrecioARS(currentPlan.precio) : '$45.000'}
                    <span className="text-xs text-gray-400 font-sans font-normal ml-1">/ mes</span>
                  </span>
                </div>

                {/* Grid 2 Columnas de Fechas */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dark-800 text-xs">
                  <div className="bg-dark-900 p-2.5 rounded-lg border border-dark-700">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Fecha de Inicio</span>
                    <strong className="text-white block">
                      {formatearFechaPago(currentStudent.fecha_inicio_rutina || currentStudent.creado_el || currentStudent.created_at || '2026-10-15')}
                    </strong>
                  </div>
                  <div className="bg-dark-900 p-2.5 rounded-lg border border-dark-700">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Vencimiento</span>
                    <strong className={`block ${
                      estadoPago === 'al_dia' ? 'text-emerald-400' :
                      estadoPago === 'por_vencer' ? 'text-amber-400' :
                      estadoPago === 'vencido' ? 'text-red-400' : 'text-gray-300'
                    }`}>
                      {currentStudent.fecha_vencimiento ? formatearFechaPago(currentStudent.fecha_vencimiento) : 'Sin definir'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-400">Estado:</span>
                  <strong className="text-white">
                    {currentStudent.fecha_vencimiento ? (
                      estadoPago === 'al_dia' ? (
                        <span className="text-emerald-400">Al día (vence en {diffDias} días)</span>
                      ) : estadoPago === 'por_vencer' ? (
                        <span className="text-amber-400">Por vencer (quedan {diffDias} días)</span>
                      ) : (
                        <span className="text-red-400">Vencida hace {Math.abs(diffDias)} días</span>
                      )
                    ) : (
                      <span className="text-gray-400">Sin fecha asignada</span>
                    )}
                  </strong>
                </div>
              </div>

              {/* BLOQUE CON LOS DATOS DE TRANSFERENCIA DEL ENTRENADOR */}
              <div className="rounded-xl p-4 bg-gradient-to-br from-[#16151c] to-[#0f0e13] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[11px] font-bold uppercase text-gray-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand" />
                    Datos para Transferir
                  </span>
                  <span className="text-[11px] font-extrabold text-white">{bankDetails.banco || 'Mercado Pago'}</span>
                </div>

                <div className="text-xs">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Titular</span>
                  <p className="font-bold text-white text-sm">{bankDetails.titular || 'Esteban Correa'}</p>
                </div>

                {/* Alias */}
                <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">Alias</span>
                    <span className="font-mono font-black text-emerald-400 text-xs sm:text-sm tracking-wide truncate block">
                      {bankDetails.alias || 'ESTEBAN.TRAINER.MP'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails.alias, 'alias')}
                    className="p-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all text-xs flex items-center gap-1.5 shrink-0 active:scale-95"
                    title="Copiar Alias"
                  >
                    {copiedKey === 'alias' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="font-bold">{copiedKey === 'alias' ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* CBU */}
                <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">CBU / CVU</span>
                    <span className="font-mono font-semibold text-gray-200 text-xs truncate block">
                      {bankDetails.cbu || '0000003100012345678901'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails.cbu, 'cbu')}
                    className="p-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all text-xs flex items-center gap-1.5 shrink-0 active:scale-95"
                    title="Copiar CBU"
                  >
                    {copiedKey === 'cbu' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="font-bold">{copiedKey === 'cbu' ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* BOTÓN: AVISAR QUE PAGUÉ / ENVIAR COMPROBANTE */}
              <a
                href={comprobanteWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Avisar que pagué / Enviar comprobante</span>
              </a>

            </div>

            {/* RECIBOS DE PAGO DEL ALUMNO */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-gray-300 uppercase px-1 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-gray-400" />
                Recibos de Pago
              </span>
              {payments.length === 0 ? (
                <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-center text-xs text-gray-500">
                  No tienes recibos de pago registrados aún
                </div>
              ) : (
                payments.map(p => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-dark-900 border border-dark-700 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">{p.plan_nombre}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatearFechaPago(p.fecha_pago || p.created_at)} • Vto: {formatearFechaPago(p.fecha_vencimiento)} • {p.metodo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white text-sm">${Number(p.monto).toLocaleString('es-AR')}</p>
                      <span className="text-[10px] font-bold text-emerald-400">Aprobado</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VISTA 5: MI FICHA DE SALUD */}
        {activeSection === 'salud' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-red-500" />
                  Mi Ficha de Salud
                </h2>
                <p className="text-xs text-gray-400">
                  Historial de lesiones, dolores articulares y condiciones médicas.
                </p>
              </div>
            </div>

            <MedicalRecordViewOnly
              record={medicalRecord}
              isStudentView={true}
              onOpenEdit={() => {
                setIsMedicalMandatory(false);
                setShowMedicalModal(true);
              }}
            />
          </div>
        )}

      </main>

      {/* FOOTER DEL PORTAL MÓVIL */}
      <footer className="bg-dark-900 border-t border-dark-800 p-5 text-center space-y-3">
        <p className="text-xs tracking-[0.25em] font-extrabold text-gray-300 uppercase select-none">
          DISCIPLINA • CONSTANCIA • RESULTADOS
        </p>
        <p className="text-[10px] text-gray-500">
          Esteban Correa Personal Trainer • Plataforma Móvil
        </p>

        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAboutModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-dark-700 text-[11px] font-semibold transition-all active:scale-95 shadow-sm"
          >
            <Info className="w-3.5 h-3.5 text-brand" />
            <span>Acerca de la app / Soporte</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión en este dispositivo"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/40 text-[11px] font-semibold transition-all active:scale-95 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </footer>

      {/* Modal Técnico con Reproductor de Video y Errores Comunes */}
      <ExerciseTechniqueModal
        exercise={selectedExerciseForModal}
        isOpen={Boolean(selectedExerciseForModal)}
        onClose={() => setSelectedExerciseForModal(null)}
        canEdit={false}
      />

      {/* 1. Modal Bloqueante: Fecha de Inicio de Rutina */}
      {showStartDateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-brand/40 shadow-2xl p-6 text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-light mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">
                ¡Hola {student?.nombre_completo?.split(' ')[0]}!
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Tienes una nueva rutina asignada por tu coach. ¿Qué día vas a comenzar?
              </p>
            </div>

            <div className="text-left space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-gray-400">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={chosenStartDate}
                onChange={(e) => setChosenStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-dark-700 text-white font-semibold text-sm focus:outline-none focus:border-brand"
              />
            </div>

            <button
              type="button"
              disabled={isSavingStartDate || !chosenStartDate}
              onClick={handleConfirmStartDate}
              className="w-full py-3.5 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow-red"
            >
              {isSavingStartDate ? 'Guardando...' : 'Confirmar y Comenzar'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal Confirmación: Finalizar Entreno & Guardar Sesión con Feedback */}
      {showFinishConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-dark-700 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Flame className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">¿Finalizar y guardar sesión?</h3>
              <p className="text-xs text-gray-400">
                Se registrará tu entrenamiento de {currentDay?.dia || `Día ${selectedDayIndex + 1}`} con los pesos, repeticiones y series ejecutadas.
              </p>
            </div>

            {/* Campo opcional de comentarios / feedback para el coach */}
            <div className="text-left space-y-1">
              <label className="block text-[11px] font-semibold text-gray-300">
                Feedback para tu Coach (opcional):
              </label>
              <textarea
                rows="3"
                value={sessionComments}
                onChange={(e) => setSessionComments(e.target.value)}
                placeholder="¿Cómo te sentiste? Sensaciones, RPE, molestias o marcas alcanzadas..."
                className="w-full bg-dark-950 border border-dark-700 focus:border-brand rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirmModal(false)}
                className="py-3 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 font-bold text-xs transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isFinishingWorkout}
                onClick={handleConfirmFinishWorkout}
                className="py-3 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-black text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-glow-red"
              >
                {isFinishingWorkout ? 'Guardando...' : 'Finalizar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Celebración: Entreno Completado */}
      {showFinishSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-emerald-500/40 shadow-2xl p-6 text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">¡Excelente trabajo!</h3>
              <p className="text-xs text-emerald-300 font-medium leading-relaxed">
                Entreno completado con éxito. ¡Sigue así con esa constancia y disciplina!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFinishSuccessModal(false)}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-950/50"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Modal Acerca de la app / Soporte */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Modal Onboarding Ficha Médica */}
      <MedicalRecordModal
        isOpen={showMedicalModal}
        onClose={() => {
          if (!isMedicalMandatory) {
            setShowMedicalModal(false);
          }
        }}
        clientId={student.id}
        existingRecord={medicalRecord}
        isMandatory={isMedicalMandatory}
        onSaved={(newRec) => {
          setMedicalRecord(newRec);
          setIsMedicalMandatory(false);
          setShowMedicalModal(false);
        }}
      />

      {/* 4. COMPONENTE FLOTANTE DE CRONÓMETRO (FLOATING PILL) */}
      {isTimerActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white border border-gray-700 shadow-2xl px-6 py-3 rounded-full flex items-center gap-3 z-50 animate-bounce-short">
          <Timer className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
          <span className="font-mono text-lg font-bold">
            {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => setRestTimer(prev => prev + 15)}
            className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Sumar 15 segundos"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={() => {
              setIsTimerActive(false);
              setRestTimer(0);
            }}
            className="ml-2 text-gray-400 hover:text-white transition-colors"
            title="Cerrar temporizador"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
