import { MotivationalSlogan } from '../common/BrandLogo';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Dumbbell, 
  ClipboardCheck, 
  AlertTriangle, 
  UserPlus, 
  CalendarPlus, 
  Calendar,
  Activity, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { dataService } from '../../services/dataService';
import ClientAvatar from '../common/ClientAvatar';

export default function DashboardView({ onNavigate, onOpenNewClientModal, onNavigateToClient }) {
  const [metrics, setMetrics] = useState({
    activeClients: 0,
    todayWorkouts: 0,
    pendingEvaluations: 0,
    expiringPlans: 0,
    weeklyChart: [],
    clientsList: [],
    paymentsList: []
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState({
    chart: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(dia => ({ dia, programados: 0, asistencias: 0 })),
    totalProgramados: 0,
    totalAsistencias: 0,
    adherencia: null
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Actividad semanal real: al montar y cada vez que la pestaña vuelve a estar visible
  useEffect(() => {
    let alive = true;
    const refreshWeekly = async () => {
      try {
        const result = await dataService.getWeeklyActivity();
        if (alive) setWeekly(result);
      } catch (err) {
        console.error('Error cargando actividad semanal:', err);
      }
    };
    refreshWeekly();
    const onVisible = () => { if (document.visibilityState === 'visible') refreshWeekly(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const weeklyMaxValue = Math.max(0, ...weekly.chart.map(d => Math.max(d.programados, d.asistencias)));
  const yAxisMax = Math.max(5, Math.ceil(weeklyMaxValue * 1.2));
  const adherenceTone = weekly.adherencia === null
    ? 'bg-dark-800 text-gray-400 border-dark-700'
    : weekly.adherencia >= 80
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : weekly.adherencia >= 50
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : 'bg-red-500/15 text-red-400 border-red-500/30';

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dataService.getDashboardMetrics();
      const apts = await dataService.getAppointments();
      setMetrics(data);
      setAppointments(apts.slice(0, 4));
    } catch (err) {
      console.error('Error cargando métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* BANNER SUPERIOR CON SLOGAN */}
      <div className="relative rounded-2xl bg-gradient-to-r from-dark-850 via-dark-900 to-dark-850 border border-dark-700/80 p-5 sm:p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-brand/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              Bienvenido, Esteban Correa
            </h1>
            <MotivationalSlogan className="mt-1" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('agenda')}
              className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-700 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-brand-light" />
              <span>Ver Agenda</span>
            </button>
            <button
              onClick={onOpenNewClientModal}
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs sm:text-sm font-bold shadow-glow-red transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Alumno</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. CUATRO TARJETAS DE MÉTRICAS SUPERIORES (CONECTADAS A SUPABASE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Métrica 1: Alumnos Activos (SELECT FROM clients) */}
        <div className="card-dark rounded-2xl p-5 card-dark-hover relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Alumnos Activos
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand-light group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-display font-black text-white">
              {metrics.activeClients}
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              Registrados
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Alumnos registrados</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand to-brand-dark"></div>
        </div>

        {/* Métrica 2: Entrenamientos Hoy */}
        <div className="card-dark rounded-2xl p-5 card-dark-hover relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Entrenamientos Hoy
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Dumbbell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-display font-black text-white">
              {metrics.todayWorkouts}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              Turnos confirmados
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Presenciales y Online</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
        </div>

        {/* Métrica 3: Evaluaciones Pendientes (SELECT FROM evaluations) */}
        <div className="card-dark rounded-2xl p-5 card-dark-hover relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Evaluaciones Pendientes
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-display font-black text-white">
              {metrics.pendingEvaluations}
            </span>
            <span className="text-xs font-semibold text-amber-400">
              Control físico
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Control antropométrico mensual</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        {/* Métrica 4: Planes por Vencer (SELECT FROM clients y cuotas) */}
        <div 
          onClick={() => onNavigate && onNavigate('finanzas')}
          className="card-dark rounded-2xl p-5 card-dark-hover relative overflow-hidden group cursor-pointer"
          title="Ver Planes y Pagos de alumnos"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Planes por Vencer
            </span>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-display font-black text-brand-light">
              {metrics.expiringPlans}
            </span>
            <span className="text-xs font-semibold text-amber-400">
              {metrics.expiringPlans === 1 ? '1 cuota a gestionar' : `${metrics.expiringPlans} cuotas a gestionar`}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Alumnos por vencer o con cuota vencida</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand"></div>
        </div>

      </div>

      {/* 2. BARRA DE ACCESOS RÁPIDOS */}
      <div className="card-dark rounded-2xl p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-brand-light" />
          Accesos Rápidos del Entrenador
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={onOpenNewClientModal}
            className="flex items-center gap-3 p-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700/80 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-brand-light">Nuevo Alumno</span>
              <span className="text-[10px] text-gray-400">Generar código</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('rutinas')}
            className="flex items-center gap-3 p-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700/80 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-blue-400">Crear Rutina</span>
              <span className="text-[10px] text-gray-400">Series y pesos</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('agenda')}
            className="flex items-center gap-3 p-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700/80 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400">Registrar Sesión</span>
              <span className="text-[10px] text-gray-400">Asignar turno</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('evaluaciones')}
            className="flex items-center gap-3 p-3 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700/80 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-purple-400">Ver Progreso</span>
              <span className="text-[10px] text-gray-400">Pesaje y medidas</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. GRÁFICO SEMANAL & ÚLTIMOS CLIENTES / COBROS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico Semanal: Entrenamientos vs Asistencias */}
        <div className="lg:col-span-2 card-dark rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand" />
                Resumen Semanal de Actividad
              </h2>
              <p className="text-xs text-gray-400">Sesiones programadas vs Asistencia efectiva por día</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${adherenceTone}`}>
              {weekly.adherencia === null ? 'Sin datos' : `${weekly.adherencia}% Adherencia`}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekly.chart}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
                <XAxis dataKey="dia" stroke="#888" fontSize={12} tickLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} allowDecimals={false} domain={[0, yAxisMax]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181f',
                    borderColor: '#272733',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="programados" 
                  name="Programados" 
                  fill="#3a3a4c" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="asistencias" 
                  name="Asistencias Reales" 
                  fill="#e50914" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Turnos Próximos de Hoy */}
        <div className="card-dark rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-light" />
                Turnos de Hoy
              </h2>
              <button
                onClick={() => onNavigate('agenda')}
                className="text-xs text-brand-light hover:underline font-semibold"
              >
                Ver todos
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Agenda del día confirmada</p>

            <div className="space-y-2.5">
              {appointments.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-dark-700/80 rounded-xl p-4 bg-dark-900/40">
                  <Calendar className="w-7 h-7 text-gray-500 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-semibold text-gray-300">Sin turnos para hoy</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Agenda citas desde el módulo de turnos</p>
                </div>
              ) : (
                appointments.map((apt) => {
                  const aptClient = (metrics.clientsList || []).find(c => c.id === apt.client_id || c.nombre_completo === apt.client_name);
                  return (
                    <div
                      key={apt.id}
                      onClick={() => onNavigateToClient ? onNavigateToClient(apt.client_id) : onNavigate('clientes')}
                      className="p-3 rounded-xl bg-dark-900 border border-dark-700/70 hover:border-brand/40 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-1.5 self-stretch rounded-full shrink-0 ${
                          apt.tipo === 'Presencial' ? 'bg-brand' : 'bg-blue-500'
                        }`} />
                        <ClientAvatar
                          client={aptClient}
                          name={apt.client_name}
                          size="sm"
                          rounded="rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-brand-light transition-colors truncate max-w-[130px]">
                            {apt.client_name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {apt.fecha_hora_inicio.split('T')[1].slice(0, 5)} hs • {apt.tipo}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        {apt.estado}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('clientes')}
            className="w-full mt-4 py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-bold text-gray-200 border border-dark-700 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Gestionar Alumnos</span>
            <ChevronRight className="w-3.5 h-3.5 text-brand" />
          </button>
        </div>

      </div>

    </div>
  );
}
