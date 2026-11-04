import React, { useState, useEffect } from 'react';
import BrandLogo from '../common/BrandLogo';
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
  AlertTriangle
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
import ExerciseTechniqueModal from '../exercises/ExerciseTechniqueModal';
import ClientAvatar from '../common/ClientAvatar';

export default function StudentPortal({ student, onLogout }) {
  const [activeSection, setActiveSection] = useState('home'); // 'home' | 'routine' | 'progress' | 'plan'
  const [routine, setRoutine] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState({});
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState(null);

  useEffect(() => {
    loadStudentData();
  }, [student]);

  const loadStudentData = async () => {
    if (!student) return;
    const r = await dataService.getRoutineForClient(student.id);
    const ev = await dataService.getEvaluations(student.id);
    const p = await dataService.getPayments();
    const studentPayments = p.filter(item => item.client_id === student.id || item.client_name === student.nombre_completo);

    setRoutine(r);
    setEvaluations(ev);
    setPayments(studentPayments);
  };

  const toggleSetCompleted = (exerciseId, setIdx) => {
    const key = `${exerciseId}-${setIdx}`;
    setCompletedSets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const hasRoutine = Boolean(routine && routine.dias && routine.dias.length > 0);
  const currentDay = hasRoutine && routine.dias[selectedDayIndex] ? routine.dias[selectedDayIndex] : null;

  const coachPhone = import.meta.env.VITE_COACH_WHATSAPP || '5491155550199';
  const whatsappUrl = `https://wa.me/${coachPhone}?text=Hola%20Esteban,%20soy%20${encodeURIComponent(student.nombre_completo)}%20(C%C3%B3digo:%20${student.access_code}).%20Te%20escribo%20por%20mi%20entrenamiento!`;

  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 flex flex-col justify-between max-w-md mx-auto relative border-x border-dark-800 shadow-2xl overflow-x-hidden">
      
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
          <span className="text-[11px] font-mono font-bold px-2 py-1 rounded bg-brand/20 text-brand-light border border-brand/30">
            {student.access_code}
          </span>
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-dark-800 transition-all min-h-[38px] min-w-[38px] flex items-center justify-center"
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
                  <p className="font-script text-2xl sm:text-3xl text-red-500 font-bold mt-1 tracking-wide drop-shadow-[0_2px_10px_rgba(239,68,68,0.4)]">
                    "Construí tu mejor versión"
                  </p>
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
                <span className="truncate max-w-[75%]">🎯 {student.objetivo}</span>
                <span className="text-emerald-400 font-bold shrink-0">{student.estado || 'Activo'}</span>
              </div>
            </div>

            {/* 4 ACCESOS PRINCIPALES ESTILO CUADRÍCULA (Mobile-First) */}
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

                {/* 4. Contacto WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="card-dark rounded-2xl p-3.5 sm:p-4 card-dark-hover text-left flex flex-col justify-between min-h-[120px] sm:min-h-[136px] group relative overflow-hidden bg-gradient-to-br from-dark-850 to-emerald-950/20 border-emerald-800/40 active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      Contacto Coach
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 line-clamp-1">Chat con Esteban</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 absolute top-3.5 right-3.5" />
                </a>

              </div>
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
          !hasRoutine ? (
            /* EMPTY STATE MOTIVACIONAL SI EL ENTRENADOR AÚN NO ASIGNÓ RUTINA */
            <div className="card-dark rounded-2xl p-6 sm:p-8 text-center space-y-5 border border-white/5 shadow-xl max-w-lg mx-auto my-4 animate-scale">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Rutina en Preparación
                </span>

                <h3 className="text-lg sm:text-xl font-black text-white mt-2">
                  ¡Hola, {student.nombre_completo.split(' ')[0]}!
                </h3>

                <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto font-medium">
                  Tu entrenador está planificando tu rutina personalizada. ¡Muy pronto estará disponible aquí!
                </p>
              </div>

              {/* Ficha informativa del esquema acordado */}
              <div className="pt-4 border-t border-dark-700/80 text-left bg-dark-900/70 p-4 rounded-xl border border-dark-750 space-y-2">
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
                  const count = d.ejercicios?.length || 0;
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDayIndex(index)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-brand text-white shadow-glow-red scale-[1.02]'
                          : 'bg-dark-900 text-gray-400 hover:text-white border border-dark-700'
                      }`}
                    >
                      <span>{dayLabel}</span>
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
                      <img
                        src={item.exercise.imagen_url}
                        alt={item.exercise.nombre}
                        className="w-16 h-16 rounded-xl object-cover border border-dark-700 shrink-0"
                      />
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

                    {/* Checklist interactivo de series con área de toque táctil de 44px */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase font-bold text-gray-300">
                          Marcar series completadas:
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Toca al terminar cada serie
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Array.from({ length: item.series }).map((_, sIdx) => {
                          const isDone = completedSets[`${item.id}-${sIdx}`];
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => toggleSetCompleted(item.id, sIdx)}
                              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border select-none active:scale-95 ${
                                isDone
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50'
                                  : 'bg-dark-900 text-gray-300 border-dark-700 hover:border-gray-500 hover:text-white'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                isDone ? 'bg-white text-emerald-700 border-white font-black' : 'border-gray-500'
                              }`}>
                                {isDone ? '✓' : ''}
                              </span>
                              <span>Serie {sIdx + 1}</span>
                            </button>
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
          </div>
        )}

        {/* VISTA 4: MI PLAN & CUOTAS */}
        {activeSection === 'plan' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand" />
              Mi Plan de Entrenamiento
            </h2>

            <div className="card-dark rounded-2xl p-5 border-brand/30 space-y-3">
              <span className="text-[10px] font-bold uppercase text-brand-light">Plan Activo</span>
              <h3 className="text-lg font-black text-white">{student.plan_actual || 'Plan 4x Semanal Personalizado'}</h3>
              <p className="text-xs text-gray-400">Modalidad: {student.modalidad} con seguimiento biométrico</p>

              <div className="pt-2 flex items-center justify-between border-t border-dark-700">
                <span className="text-xs text-gray-400">Estado de Cuenta:</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Cuota al Día
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-300 uppercase px-1">Recibos de Pago</span>
              {payments.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-dark-900 border border-dark-700 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-white">{p.plan_nombre}</p>
                    <p className="text-[11px] text-gray-400">Vto: {p.fecha_vencimiento} • {p.metodo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-white">${p.monto.toLocaleString('es-AR')}</p>
                    <span className="text-[10px] font-bold text-emerald-400">Aprobado</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* FOOTER DEL PORTAL MÓVIL */}
      <footer className="bg-dark-900 border-t border-dark-800 p-5 text-center">
        <p className="text-xs tracking-[0.25em] font-extrabold text-gray-300 uppercase select-none">
          DISCIPLINA • CONSTANCIA • RESULTADOS
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          Esteban Correa Personal Trainer • Plataforma Móvil
        </p>
      </footer>

      {/* Modal Técnico con Reproductor de Video y Errores Comunes */}
      <ExerciseTechniqueModal
        exercise={selectedExerciseForModal}
        isOpen={Boolean(selectedExerciseForModal)}
        onClose={() => setSelectedExerciseForModal(null)}
        canEdit={false}
      />

    </div>
  );
}
