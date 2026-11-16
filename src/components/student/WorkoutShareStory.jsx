import React, { forwardRef } from 'react';
import { Dumbbell, Flame, Trophy, Calendar, Zap, CheckCircle2 } from 'lucide-react';
import BodyMuscleHighlighter, { extractActiveMuscleGroups } from './BodyMuscleHighlighter';

const InstagramIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

/**
 * Tarjeta Social Media formato Instagram Story (1080 × 1920 px, 9:16).
 * Diseñada con estética Spotify Wrapped / Apple Fitness para ser convertida a PNG con html-to-image.
 */
const WorkoutShareStory = forwardRef(({ workoutData = {} }, ref) => {
  const safeData = workoutData || {};
  const {
    studentName = 'Atleta',
    routineName = 'Rutina de Fuerza',
    dayName = 'Día 1',
    weekNumber = null,
    exercises = [],
    totalSets = 0,
    completedExercisesCount = 0,
    totalExercisesCount = 0,
    totalVolumeKg = 0,
    totalReps = 0
  } = safeData;

  // Extraer grupos musculares activos para pintar en el mapa anatómico
  const activeMuscles = extractActiveMuscleGroups(exercises);

  // Formato de fecha actual en español
  const dateFormatted = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Formatear volumen en kg (con separador de miles)
  const formattedVolume = Math.round(totalVolumeKg).toLocaleString('es-AR');

  // Mapear etiquetas legibles de músculos trabajados
  const muscleLabelsMap = {
    pecho: 'PECHO',
    espalda: 'ESPALDA',
    hombros: 'HOMBROS',
    biceps: 'BÍCEPS',
    triceps: 'TRÍCEPS',
    core: 'CORE / ABDOMEN',
    cuadriceps: 'CUÁDRICEPS',
    isquios: 'ISQUIOS',
    gluteos: 'GLÚTEOS',
    gemelos: 'GEMELOS'
  };

  const activeMuscleLabels = activeMuscles
    .map(m => muscleLabelsMap[m] || m.toUpperCase())
    .slice(0, 6);

  return (
    <div
      ref={ref}
      style={{
        width: '1080px',
        height: '1920px',
        minWidth: '1080px',
        minHeight: '1920px',
        maxWidth: '1080px',
        maxHeight: '1920px',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
      className="relative bg-[#09090b] text-white flex flex-col justify-between overflow-hidden p-16 select-none"
    >
      {/* Luces y degradados ambientales de fondo (Glow radial premium) */}
      <div className="absolute top-[-10%] right-[-10%] w-[850px] h-[850px] rounded-full bg-red-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-15%] w-[800px] h-[800px] rounded-full bg-rose-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-15%] w-[600px] h-[600px] rounded-full bg-orange-600/10 blur-[140px] pointer-events-none" />

      {/* Marca de agua sutil de fondo */}
      <div className="absolute right-[-40px] top-[45%] -translate-y-1/2 text-[260px] font-black text-white/[0.015] tracking-tighter select-none rotate-90 pointer-events-none">
        ESTEBAN CORREA
      </div>

      {/* ========================================================================= */}
      {/* 1. HEADER SUPERIOR: BRANDING & TITULAR MOTIVACIONAL */}
      {/* ========================================================================= */}
      <header className="relative z-10 flex flex-col gap-6">
        {/* Barra superior de coach y fecha */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Dumbbell className="w-9 h-9 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-wider uppercase text-white">
                Esteban Correa
              </h2>
              <p className="text-sm font-semibold tracking-widest text-red-400 uppercase">
                Personal Trainer & Performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full backdrop-blur-md">
            <Calendar className="w-5 h-5 text-red-400" />
            <span className="text-base font-medium text-gray-300 capitalize">
              {dateFormatted}
            </span>
          </div>
        </div>

        {/* Badge y Gran Titular Spotify Wrapped Style */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-base font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-red-600/25 mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <span>Entrenamiento Completado</span>
          </div>

          <h1 className="text-6xl font-black tracking-tight leading-[1.08] uppercase bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            {dayName}
          </h1>

          <p className="text-2xl font-medium text-gray-400 mt-2 flex items-center gap-3">
            <span className="text-red-400 font-bold">●</span>
            <span>{routineName}</span>
            {weekNumber && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-gray-300">Semana {weekNumber}</span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CENTRO-ARRIBA: 3 TARJETAS DE MÉTRICAS GIGANTES (APPLE FITNESS STYLE) */}
      {/* ========================================================================= */}
      <section className="relative z-10 grid grid-cols-3 gap-6 my-2">
        {/* Métrica 1: Ejercicios */}
        <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 p-7 flex flex-col justify-between backdrop-blur-xl">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="text-6xl font-black tracking-tight text-white leading-none">
              {completedExercisesCount || exercises.length}
            </div>
            <div className="text-sm font-bold tracking-widest uppercase text-gray-400 mt-3">
              Ejercicios
            </div>
          </div>
        </div>

        {/* Métrica 2: Series */}
        <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 p-7 flex flex-col justify-between backdrop-blur-xl">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="text-6xl font-black tracking-tight text-white leading-none">
              {totalSets}
            </div>
            <div className="text-sm font-bold tracking-widest uppercase text-gray-400 mt-3">
              Series Totales
            </div>
          </div>
        </div>

        {/* Métrica 3: Volumen en Kg o Reps */}
        <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-red-500/30 p-7 flex flex-col justify-between backdrop-blur-xl bg-red-950/20">
          <div className="w-12 h-12 rounded-xl bg-red-500/30 border border-red-500/50 flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
            <Flame className="w-6 h-6 text-red-400" />
          </div>
          <div>
            {totalVolumeKg > 0 ? (
              <>
                <div className="text-5xl font-black tracking-tight text-white leading-none">
                  {formattedVolume}
                  <span className="text-2xl font-bold text-red-400 ml-1">kg</span>
                </div>
                <div className="text-sm font-bold tracking-widest uppercase text-gray-400 mt-3">
                  Volumen Total
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl font-black tracking-tight text-white leading-none">
                  {totalReps || 150}
                </div>
                <div className="text-sm font-bold tracking-widest uppercase text-gray-400 mt-3">
                  Reps Totales
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CENTRO: MAPA ANATÓMICO CON MÚSCULOS RESALTADOS */}
      {/* ========================================================================= */}
      <section className="relative z-10 flex flex-col items-center justify-center bg-gradient-to-b from-white/[0.04] to-white/[0.01] rounded-3xl border border-white/10 p-6 backdrop-blur-xl">
        <div className="w-full flex items-center justify-between px-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-300">
              Músculos Estimulados
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" /> Activo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#27272a] border border-[#3f3f46]" /> Descanso
            </span>
          </div>
        </div>

        {/* Silueta Humana Frontal y Dorsal */}
        <div className="w-full max-w-[560px] h-[440px] flex items-center justify-center my-2">
          <BodyMuscleHighlighter
            activeMuscles={activeMuscles}
            accentColor="#ef4444"
            inactiveColor="#27272a"
            glow={true}
            className="w-full h-full"
          />
        </div>

        {/* Chips de grupos musculares destacados */}
        {activeMuscleLabels.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {activeMuscleLabels.map((lbl, idx) => (
              <span
                key={idx}
                className="bg-red-500/15 border border-red-500/30 text-red-300 font-black text-xs uppercase px-4 py-1.5 rounded-full shadow-sm"
              >
                {lbl}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. INFERIOR: RESUMEN MINIMALISTA DE EJERCICIOS REALIZADOS */}
      {/* ========================================================================= */}
      <section className="relative z-10 flex flex-col gap-3">
        <div className="text-xs font-black uppercase tracking-widest text-gray-400 px-1">
          Ejercicios de la Sesión
        </div>

        {/* Tags minimalistas de ejercicios (solo nombres limpios) */}
        <div className="flex flex-wrap gap-2.5">
          {exercises.slice(0, 8).map((ex, idx) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 hover:border-red-500/30 text-gray-200 font-semibold text-sm px-4 py-2.5 rounded-xl backdrop-blur-md flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>{ex.name}</span>
            </div>
          ))}
          {exercises.length > 8 && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 font-bold text-sm px-4 py-2.5 rounded-xl">
              +{exercises.length - 8} más
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FOOTER: ATLETA & INSTAGRAM DEL COACH */}
      {/* ========================================================================= */}
      <footer className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between">
        {/* Atleta */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dark-700 to-dark-800 border border-white/10 flex items-center justify-center font-black text-white text-lg">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-gray-400">
              Atleta
            </div>
            <div className="text-xl font-black text-white">
              {studentName}
            </div>
          </div>
        </div>

        {/* Instagram del Coach */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-red-600/20 via-pink-600/20 to-purple-600/20 border border-red-500/30 px-6 py-3 rounded-2xl backdrop-blur-md shadow-lg">
          <InstagramIcon className="w-6 h-6 text-red-400" />
          <div className="text-right">
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-400">
              Seguinos en Instagram
            </div>
            <div className="text-base font-black text-white tracking-wide">
              @estebancorrea.trainer
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
});

WorkoutShareStory.displayName = 'WorkoutShareStory';

export default WorkoutShareStory;
