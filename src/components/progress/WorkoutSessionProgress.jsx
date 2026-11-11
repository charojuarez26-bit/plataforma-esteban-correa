import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Dumbbell, 
  Calendar, 
  MessageSquare, 
  Flame, 
  Activity, 
  CheckCircle2, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Layers,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { dataService } from '../../services/dataService';

// Formatea masas en kg con separador de miles y máx. 1 decimal (sin ceros sobrantes)
const fmtKg = (value) => {
  const num = Number(value);
  if (!isFinite(num)) return '0';
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
};

export default function WorkoutSessionProgress({ clientId, clientName }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [chartMetric, setChartMetric] = useState('peso'); // 'peso' | 'volumen'

  useEffect(() => {
    if (clientId) {
      loadSessions(clientId);
    } else {
      setSessions([]);
    }
  }, [clientId]);

  const loadSessions = async (cId) => {
    setIsLoading(true);
    try {
      const logs = await dataService.getClientSessionLogs(cId);
      setSessions(logs);
    } catch (err) {
      console.error('Error cargando historial de sesiones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Extraer lista única de ejercicios con conteo de registros
  const uniqueExercises = useMemo(() => {
    const map = new Map();
    sessions.forEach(session => {
      (session.session_exercise_logs || []).forEach(log => {
        const name = (log.exercise_name || '').trim();
        if (name) {
          map.set(name, (map.get(name) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [sessions]);

  // Auto-seleccionar primer ejercicio si no hay uno seleccionado o cambió
  useEffect(() => {
    if (uniqueExercises.length > 0) {
      const exists = uniqueExercises.some(e => e.name === selectedExercise);
      if (!selectedExercise || !exists) {
        setSelectedExercise(uniqueExercises[0].name);
      }
    } else {
      setSelectedExercise('');
    }
  }, [uniqueExercises, selectedExercise]);

  // Formateadores de fecha y hora
  const formatSessionDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  const formatSessionTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' hs';
    } catch {
      return '';
    }
  };

  // Datos para el gráfico de progresión temporal del ejercicio seleccionado
  const chartData = useMemo(() => {
    if (!selectedExercise || sessions.length === 0) return [];

    const points = [];
    // Ordenar de más antiguo a más reciente para el eje X
    const chronologicalSessions = [...sessions].reverse();

    chronologicalSessions.forEach(session => {
      const matchingLogs = (session.session_exercise_logs || []).filter(
        l => (l.exercise_name || '').toLowerCase().trim() === selectedExercise.toLowerCase().trim()
      );

      if (matchingLogs.length > 0) {
        // Carga máxima real ejecutada en esta sesión
        const maxActualWeight = Math.max(...matchingLogs.map(l => parseFloat(l.actual_weight) || 0));
        const maxPrescribedWeight = Math.max(...matchingLogs.map(l => parseFloat(l.prescribed_weight) || 0));
        
        // Volumen total acumulado en esta sesión para este ejercicio
        const sessionExVolume = matchingLogs.reduce((acc, l) => {
          const sets = parseInt(l.actual_sets, 10) || 1;
          const reps = parseInt(l.actual_reps, 10) || 0;
          const weight = parseFloat(l.actual_weight) || 0;
          return acc + (sets * reps * weight);
        }, 0);

        const totalSets = matchingLogs.reduce((acc, l) => acc + (parseInt(l.actual_sets, 10) || 1), 0);
        const totalReps = matchingLogs.reduce((acc, l) => acc + (parseInt(l.actual_reps, 10) || 0), 0);

        const dateObj = new Date(session.fecha);
        const dateLabel = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
          : 'Sesión';

        points.push({
          rawDate: session.fecha,
          fecha: dateLabel,
          fechaCompleta: formatSessionDate(session.fecha),
          peso_real: maxActualWeight,
          peso_prescrito: maxPrescribedWeight,
          series: totalSets,
          reps: totalReps,
          setsDetail: matchingLogs.map((l, idx) => ({
            set: idx + 1,
            reps: l.actual_reps,
            weight: l.actual_weight
          })),
          volumen: sessionExVolume,
          // Métrica activa para el gráfico
          valor: chartMetric === 'peso' ? maxActualWeight : sessionExVolume
        });
      }
    });

    return points;
  }, [sessions, selectedExercise, chartMetric]);

  // Cálculos estadísticos del ejercicio seleccionado
  const firstPoint = chartData.length > 0 ? chartData[0] : null;
  const lastPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const maxWeight = chartData.length > 0 ? Math.max(...chartData.map(p => p.peso_real)) : 0;
  const maxVolume = chartData.length > 0 ? Math.max(...chartData.map(p => p.volumen)) : 0;
  const weightDelta = firstPoint && lastPoint ? (lastPoint.peso_real - firstPoint.peso_real) : 0;
  const percentDelta = firstPoint && firstPoint.peso_real > 0 
    ? ((weightDelta / firstPoint.peso_real) * 100).toFixed(1) 
    : 0;

  // Volumen total acumulado de todas las sesiones
  const totalVolumeAllSessions = useMemo(() => {
    return sessions.reduce((acc, sess) => {
      const sessVol = (sess.session_exercise_logs || []).reduce((sAcc, l) => {
        const sets = parseInt(l.actual_sets, 10) || 0;
        const reps = parseInt(l.actual_reps, 10) || 0;
        const weight = parseFloat(l.actual_weight) || 0;
        return sAcc + (sets * reps * weight);
      }, 0);
      return acc + sessVol;
    }, 0);
  }, [sessions]);

  // Tooltip personalizado para el gráfico Recharts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-900 border border-dark-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-dark-700/80 pb-1 font-bold text-white">
            <span>{data.fechaCompleta}</span>
            <span className="text-[10px] text-gray-400 font-mono">{data.series} {data.series === 1 ? 'serie' : 'series'}</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Carga Máxima:</span>
              <span className="font-bold text-brand-light">{fmtKg(data.peso_real)} kg</span>
            </div>
            {data.peso_prescrito > 0 && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500">Prescrito:</span>
                <span className="text-gray-400">{fmtKg(data.peso_prescrito)} kg</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-dark-700/60">
              <span className="text-gray-400">Volumen Sesión:</span>
              <span className="font-semibold text-emerald-400">{fmtKg(data.volumen)} kg</span>
            </div>

            {/* Detalle serie por serie en el tooltip si hay registros individuales */}
            {data.setsDetail && data.setsDetail.length > 0 && (
              <div className="pt-1.5 border-t border-dark-800 space-y-1">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Detalle por serie:</span>
                <div className="flex flex-wrap gap-1">
                  {data.setsDetail.map((s, idx) => (
                    <span key={idx} className="text-[10px] bg-dark-950 px-1.5 py-0.5 rounded border border-dark-700 font-mono text-gray-300">
                      S{s.set}: <strong className="text-white">{s.reps}r</strong>@{s.weight}kg
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="card-dark rounded-2xl p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-brand animate-spin mx-auto" />
        <p className="text-sm text-gray-400">Cargando historial de entrenamientos y cargas...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="card-dark rounded-2xl p-10 text-center space-y-4 border border-dashed border-dark-700">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mx-auto">
          <Dumbbell className="w-7 h-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-white">Sin sesiones de entrenamiento registradas</h3>
          <p className="text-xs text-gray-400">
            {clientName 
              ? `${clientName} aún no ha finalizado ni guardado sesiones desde su portal de alumno.`
              : 'El alumno seleccionado aún no ha registrado sesiones de entrenamiento.'}
          </p>
          <p className="text-[11px] text-gray-500 pt-1">
            En cuanto el alumno complete su rutina y pulse "Finalizar y Guardar Sesión", verás aquí sus comentarios, cargas reales y gráficos de sobrecarga progresiva.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 md:pb-8 w-full overflow-hidden">
      
      {/* 1. TARJETAS RESUMEN DE RENDIMIENTO REAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="card-dark rounded-2xl p-3 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs text-gray-400 font-semibold uppercase truncate">Sesiones</span>
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5 sm:mt-2 truncate">
            {sessions.length}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 truncate">
            Última: {formatSessionDate(sessions[0]?.fecha)}
          </p>
        </div>

        <div className="card-dark rounded-2xl p-3 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs text-gray-400 font-semibold uppercase truncate">Volumen Total</span>
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5 sm:mt-2 truncate">
            {fmtKg(totalVolumeAllSessions)} <span className="text-xs text-gray-400 font-normal">kg</span>
          </p>
          <p className="text-[10px] text-emerald-400 mt-1 font-semibold truncate">
            Peso × repeticiones acumulado
          </p>
        </div>

        <div className="card-dark rounded-2xl p-3 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs text-gray-400 font-semibold uppercase truncate">Ejercicios</span>
            <Layers className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5 sm:mt-2 truncate">
            {uniqueExercises.length}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 truncate">
            Con carga real
          </p>
        </div>

        <div className="card-dark rounded-2xl p-3 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs text-gray-400 font-semibold uppercase truncate">Carga Máx (PR)</span>
            <Award className="w-4 h-4 text-brand-light shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5 sm:mt-2 truncate">
            {fmtKg(maxWeight)} <span className="text-xs text-gray-400 font-normal">kg</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1 truncate" title={selectedExercise}>
            En {selectedExercise || 'ejercicio'}
          </p>
        </div>

      </div>

      {/* 2. DASHBOARD GRÁFICO DE SOBRECARGA PROGRESIVA */}
      {uniqueExercises.length > 0 && (
        <div className="card-dark rounded-2xl p-4 sm:p-5 space-y-4 w-full overflow-hidden">
          
          {/* Header del gráfico y selectores */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-700/80">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-brand shrink-0" />
                <span>Evolución de Cargas & Volumen por Ejercicio</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                Seguimiento de la sobrecarga progresiva y rendimiento real sesión a sesión.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* Selector de Ejercicio */}
              <div className="relative w-full sm:w-auto">
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="w-full sm:w-auto h-11 sm:h-9 bg-dark-900 border border-dark-700 rounded-xl px-3 text-xs font-bold text-white focus:outline-none focus:border-brand"
                >
                  {uniqueExercises.map(ex => (
                    <option key={ex.name} value={ex.name}>
                      {ex.name} ({ex.count} sesiones)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Métrica: Carga vs Volumen */}
              <div className="flex items-center justify-center bg-dark-900 border border-dark-700 rounded-xl p-0.5 h-11 sm:h-9 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setChartMetric('peso')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    chartMetric === 'peso'
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Carga (kg)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('volumen')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    chartMetric === 'volumen'
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Volumen (kg)
                </button>
              </div>
            </div>
          </div>

          {/* Estadísticas de variación en el ejercicio */}
          {chartData.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Carga Inicial:</span>
                <span className="font-bold text-white">{fmtKg(firstPoint?.peso_real)} kg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Carga Actual:</span>
                <span className="font-bold text-brand-light">{fmtKg(lastPoint?.peso_real)} kg</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Variación:</span>
                {weightDelta > 0 ? (
                  <span className="inline-flex items-center text-emerald-400 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{fmtKg(weightDelta)} kg (+{percentDelta}%)
                  </span>
                ) : weightDelta < 0 ? (
                  <span className="inline-flex items-center text-red-400 font-bold">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {fmtKg(weightDelta)} kg ({percentDelta}%)
                  </span>
                ) : (
                  <span className="text-gray-400 font-semibold">= 0 kg</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Máx Volumen Sesión:</span>
                <span className="font-bold text-emerald-400">{fmtKg(maxVolume)} kg</span>
              </div>
            </div>
          )}

          {/* Gráfico Recharts AreaChart */}
          <div className="h-64 sm:h-80 w-full overflow-hidden pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
                <XAxis dataKey="fecha" stroke="#888" fontSize={10} tickLine={false} />
                <YAxis 
                  stroke="#888" 
                  fontSize={10} 
                  tickLine={false} 
                  domain={['auto', 'auto']}
                  unit=" kg"
                  tickFormatter={(v) => fmtKg(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name={chartMetric === 'peso' ? 'Carga (kg)' : 'Volumen (kg)'}
                  stroke="#ef4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBrand)"
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. HISTORIAL DETALLADO DE SESIONES CON COMENTARIOS DEL ALUMNO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              Historial Detallado de Sesiones & Feedback
            </h3>
            <p className="text-xs text-gray-400">
              Desglose de cada entrenamiento finalizado, comentarios del alumno y comparativa con lo prescrito.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-400 bg-dark-900 border border-dark-700 px-3 py-1 rounded-xl">
            {sessions.length} sesiones
          </span>
        </div>

        <div className="space-y-4">
          {sessions.map((session) => {
            const exLogs = session.session_exercise_logs || [];
            const sessionTotalVolume = exLogs.reduce((acc, l) => {
              const sets = parseInt(l.actual_sets, 10) || 0;
              const reps = parseInt(l.actual_reps, 10) || 0;
              const weight = parseFloat(l.actual_weight) || 0;
              return acc + (sets * reps * weight);
            }, 0);

            return (
              <div 
                key={session.id} 
                className="card-dark rounded-2xl p-5 border border-dark-700/80 hover:border-dark-600 transition-all space-y-4"
              >
                {/* Cabecera de la sesión */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-dark-700/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{formatSessionDate(session.fecha)}</span>
                        <span className="text-xs font-normal text-gray-400">({formatSessionTime(session.fecha)})</span>
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {exLogs.length} ejercicios registrados en esta sesión
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{fmtKg(sessionTotalVolume)} kg volumen</span>
                    </span>
                  </div>
                </div>

                {/* Comentarios del alumno al finalizar la sesión */}
                {session.comentarios_alumno ? (
                  <div className="bg-brand-950/30 border border-brand/30 rounded-xl p-3.5 flex items-start gap-3 shadow-inner">
                    <MessageSquare className="w-4 h-4 text-brand-light shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-brand-light tracking-wider block">
                        Feedback / Sensaciones del Alumno:
                      </span>
                      <p className="text-xs text-gray-200 italic font-medium leading-relaxed">
                        "{session.comentarios_alumno}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 italic px-1">
                    Sin comentarios adicionales registrados por el alumno al finalizar.
                  </p>
                )}

                {/* Tabla de desglose de ejercicios serie por serie */}
                {exLogs.length > 0 && (() => {
                  const groupedMap = new Map();
                  exLogs.forEach((log) => {
                    const name = log.exercise_name || 'Ejercicio';
                    if (!groupedMap.has(name)) {
                      groupedMap.set(name, []);
                    }
                    groupedMap.get(name).push(log);
                  });

                  return (
                    <div className="space-y-2">
                      <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
                        <table className="w-full text-xs text-left min-w-[580px]">
                          <thead className="bg-dark-900/90 text-gray-400 uppercase text-[10px] border-b border-dark-700">
                            <tr>
                              <th className="py-2.5 px-3">Ejercicio</th>
                              <th className="py-2.5 px-3">Prescrito (Coach)</th>
                              <th className="py-2.5 px-3">Detalle Serie por Serie (Alumno)</th>
                              <th className="py-2.5 px-3 text-center">Carga Máx</th>
                              <th className="py-2.5 px-3 text-right">Volumen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-700/50 text-gray-300">
                            {Array.from(groupedMap.entries()).map(([exName, setsList], idx) => {
                              const firstLog = setsList[0];
                              const pSets = firstLog.prescribed_sets ?? '-';
                              const pReps = firstLog.prescribed_reps ?? '-';
                              const pWeight = firstLog.prescribed_weight ?? '-';

                              const maxWeight = Math.max(...setsList.map(s => parseFloat(s.actual_weight) || 0));
                              const pWNum = parseFloat(pWeight);
                              const hasWeightDiff = !isNaN(maxWeight) && !isNaN(pWNum) && pWNum > 0;
                              const diff = hasWeightDiff ? (maxWeight - pWNum) : 0;

                              const exTotalVolume = setsList.reduce((acc, s) => {
                                const setsCount = parseInt(s.actual_sets, 10) || 1;
                                const repsCount = parseInt(s.actual_reps, 10) || 0;
                                const w = parseFloat(s.actual_weight) || 0;
                                return acc + (setsCount * repsCount * w);
                              }, 0);

                              return (
                                <tr key={idx} className="hover:bg-dark-800/40 transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-white">
                                    <span>{exName}</span>
                                    <span className="text-[10px] text-gray-400 font-normal block">
                                      {setsList.length} {setsList.length === 1 ? 'serie registrada' : 'series registradas'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                                    {pSets} x {pReps} @ <span className="text-gray-300 font-bold">{pWeight} kg</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex flex-wrap gap-1.5 py-0.5">
                                      {setsList.map((s, sIdx) => {
                                        const sWeight = s.actual_weight ?? s.prescribed_weight;
                                        const sReps = s.actual_reps ?? s.prescribed_reps;
                                        const isHigher = parseFloat(sWeight) > pWNum;
                                        return (
                                          <span 
                                            key={sIdx} 
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono border ${
                                              isHigher 
                                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                                : 'bg-dark-900 border-dark-700 text-gray-200'
                                            }`}
                                          >
                                            <span className="text-gray-400 font-bold">S{sIdx + 1}:</span>
                                            <strong className="text-white">{sReps}r</strong>
                                            <span>@</span>
                                            <strong className={isHigher ? 'text-emerald-400' : 'text-brand-light'}>{sWeight}kg</strong>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <span className="font-bold text-white block">{fmtKg(maxWeight)} kg</span>
                                    {hasWeightDiff && (
                                      diff > 0 ? (
                                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-400">
                                          +{fmtKg(diff)} kg
                                        </span>
                                      ) : diff < 0 ? (
                                        <span className="inline-flex items-center text-[10px] font-bold text-amber-400">
                                          {fmtKg(diff)} kg
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-500">= Obj</span>
                                      )
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-200 whitespace-nowrap">
                                    {exTotalVolume > 0 ? `${fmtKg(exTotalVolume)} kg` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
