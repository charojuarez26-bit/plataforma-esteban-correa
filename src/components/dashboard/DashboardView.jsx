import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Dumbbell, 
  ClipboardCheck, 
  AlertTriangle, 
  UserPlus, 
  CalendarPlus, 
  Activity, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Flame,
  Cloud,
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
import { isSupabaseConfigured } from '../../lib/supabase';
import ClientAvatar from '../common/ClientAvatar';

export default function DashboardView({ onNavigate, onOpenNewClientModal, onNavigateToClient }) {
  const [metrics, setMetrics] = useState({
    activeClients: 48,
    todayWorkouts: 12,
    pendingEvaluations: 3,
    expiringPlans: 5,
    weeklyChart: [],
    clientsList: [],
    paymentsList: []
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

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
      
      {/* BANNER SUPERIOR CON SLOGAN Y ESTADO SUPABASE */}
      <div className="relative rounded-2xl bg-gradient-to-r from-dark-850 via-dark-900 to-dark-850 border border-dark-700/80 p-5 sm:p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-brand/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/20 text-brand-light border border-brand/30">
                <Flame className="w-3.5 h-3.5" /> Temporada 2026
              </span>
              {isSupabaseConfigured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Cloud className="w-3 h-3" /> Supabase Conectado
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              Bienvenido, Esteban Correa
            </h1>
            <p className="font-script text-xl sm:text-2xl text-red-500 font-bold mt-1 tracking-wide drop-shadow-[0_2px_8px_rgba(239,68,68,0.35)]">
              "Construí tu mejor versión"
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('calendar')}
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
              <span>Nuevo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. CUATRO TARJETAS DE MÉTRICAS SUPERIORES (CONECTADAS A SUPABASE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Métrica 1: Clientes Activos (SELECT FROM clients) */}
        <div className="card-dark rounded-2xl p-5 card-dark-hover relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Clientes Activos
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand-light group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-display font-black text-white">
              {metrics.activeClients}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> +8% este mes
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Base de alumnos en Supabase</p>
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

        {/* Métrica 4: Planes por Vencer (SELECT FROM payments) */}
        <div className="card-dark rounded-2xl p-5 card-dark-hover relative overflow-hidden group">
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
            <span className="text-xs font-semibold text-red-400">
              Pendientes
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Control de cobros y cuotas</p>
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
              <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-brand-light">Nuevo Cliente</span>
              <span className="text-[10px] text-gray-400">Generar código</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('exercises')}
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
            onClick={() => onNavigate('calendar')}
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
            onClick={() => onNavigate('progress')}
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
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              96% Adherencia
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.weeklyChart}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
                <XAxis dataKey="dia" stroke="#888" fontSize={12} tickLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} />
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
                onClick={() => onNavigate('calendar')}
                className="text-xs text-brand-light hover:underline font-semibold"
              >
                Ver todos
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Agenda del día confirmada</p>

            <div className="space-y-2.5">
              {appointments.map((apt) => {
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
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('clientes')}
            className="w-full mt-4 py-2.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-bold text-gray-200 border border-dark-700 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Gestionar Alumnos en Supabase</span>
            <ChevronRight className="w-3.5 h-3.5 text-brand" />
          </button>
        </div>

      </div>

    </div>
  );
}
