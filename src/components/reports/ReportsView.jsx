import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Dumbbell, 
  DollarSign, 
  Calendar, 
  Download, 
  CheckCircle2, 
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { dataService } from '../../services/dataService';

export default function ReportsView() {
  const [metrics, setMetrics] = useState(null);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [weeklyActivity, setWeeklyActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [met, cli, pay, act] = await Promise.all([
          dataService.getDashboardMetrics(),
          dataService.getClients(),
          dataService.getPayments(),
          dataService.getWeeklyActivity()
        ]);
        setMetrics(met);
        setClients(cli || []);
        setPayments(pay || []);
        setWeeklyActivity(act);
      } catch (e) {
        console.error('Error cargando informes:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const activeClients = clients.filter(c => (c.estado || 'Activo').toLowerCase() === 'activo');
  const totalActivos = activeClients.length;

  // Distribución real por modalidad
  const modalityCounts = activeClients.reduce((acc, c) => {
    const mod = (c.modalidad || 'Presencial').toLowerCase();
    if (mod.includes('presencial')) acc.presencial = (acc.presencial || 0) + 1;
    else if (mod.includes('online') || mod.includes('distancia')) acc.online = (acc.online || 0) + 1;
    else acc.personalizado = (acc.personalizado || 0) + 1;
    return acc;
  }, { presencial: 0, online: 0, personalizado: 0 });

  const modalityData = totalActivos > 0 ? [
    { name: 'Presencial', value: Math.round((modalityCounts.presencial / totalActivos) * 100), count: modalityCounts.presencial, color: '#e50914' },
    { name: 'Online / Distancia', value: Math.round((modalityCounts.online / totalActivos) * 100), count: modalityCounts.online, color: '#3b82f6' },
    { name: 'Personalizado', value: Math.round((modalityCounts.personalizado / totalActivos) * 100), count: modalityCounts.personalizado, color: '#10b981' }
  ].filter(m => m.count > 0) : [];

  const monthlyIncome = metrics?.monthlyIncome || [];
  const adherencia = weeklyActivity?.adherencia;
  const totalProgramadosSemana = weeklyActivity?.totalProgramados || 0;
  const totalAsistenciasSemana = weeklyActivity?.totalAsistencias || 0;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand" />
            Informes & Estadísticas del Rendimiento
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Análisis de retención, volumen de entrenamiento y facturación basado en registros reales de Supabase.
          </p>
        </div>

        <button 
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 text-gray-200 border border-dark-700 text-xs font-bold transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4 text-brand-light" />
          <span>Exportar Informe</span>
        </button>
      </div>

      {/* 3 Tarjetas de Resumen Ejecutivo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dark rounded-2xl p-5">
          <span className="text-xs uppercase font-bold text-gray-400">Adherencia Semanal Real</span>
          <p className="text-3xl font-black text-white mt-2">
            {adherencia !== null && adherencia !== undefined ? `${adherencia}%` : 'Sin datos'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalAsistenciasSemana} asistencias de {totalProgramadosSemana} turnos programados
          </p>
        </div>

        <div className="card-dark rounded-2xl p-5">
          <span className="text-xs uppercase font-bold text-gray-400">Alumnos Activos</span>
          <p className="text-3xl font-black text-white mt-2">{totalActivos}</p>
          <p className="text-xs text-gray-400 mt-1">
            Total en seguimiento físico activo
          </p>
        </div>

        <div className="card-dark rounded-2xl p-5">
          <span className="text-xs uppercase font-bold text-gray-400">Total Cobros Asentados</span>
          <p className="text-3xl font-black text-brand-light mt-2">{payments.length}</p>
          <p className="text-xs text-gray-400 mt-1">Registros en client_payments</p>
        </div>
      </div>

      {/* Gráficos de Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 card-dark rounded-2xl p-5">
          <h2 className="text-base font-bold text-white mb-1">Crecimiento de Facturación (Últimos 6 meses)</h2>
          <p className="text-xs text-gray-400 mb-4">Ingresos reales acumulados en ARS desde client_payments</p>
          <div className="h-64 w-full">
            {monthlyIncome.length === 0 || monthlyIncome.every(m => m.total === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                Sin registros de facturación suficientes para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyIncome}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
                  <XAxis dataKey="mes" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString('es-AR')}`, 'Total']}
                    contentStyle={{ backgroundColor: '#18181f', borderColor: '#272733', borderRadius: '0.75rem', color: '#fff' }}
                  />
                  <Bar dataKey="total" fill="#e50914" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 card-dark rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Distribución por Modalidad</h2>
            <p className="text-xs text-gray-400 mb-4">Proporción de alumnos según modalidad</p>
            <div className="h-44 w-full flex items-center justify-center">
              {modalityData.length === 0 ? (
                <p className="text-xs text-gray-500">Sin alumnos registrados</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={modalityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                      {modalityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181f', borderColor: '#272733', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-dark-700">
            {modalityData.map(item => (
              <div key={item.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name} ({item.count})
                </span>
                <span className="font-bold text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
