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
import { MONTHLY_INCOME_DATA, WEEKLY_CHART_DATA } from '../../data/mockData';

export default function ReportsView() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    dataService.getDashboardMetrics().then(setMetrics);
  }, []);

  const modalityData = [
    { name: 'Presencial', value: 72, color: '#e50914' },
    { name: 'Online', value: 24, color: '#3b82f6' },
    { name: 'Híbrido', value: 4, color: '#10b981' }
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand" />
            Informes & Estadísticas del Rendimiento
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Análisis de retención, volumen de entrenamiento y facturación trimestral.
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

      {/* 3 Tarjetas de Resumen Ejecutivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dark rounded-2xl p-5">
          <span className="text-xs uppercase font-bold text-gray-400">Tasa de Asistencia Efectiva</span>
          <p className="text-3xl font-black text-white mt-2">94.8%</p>
          <p className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" /> +2.4% vs mes anterior
          </p>
        </div>

        <div className="card-dark rounded-2xl p-5">
          <span className="text-xs uppercase font-bold text-gray-400">Retención de Alumnos</span>
          <p className="text-3xl font-black text-white mt-2">91.2%</p>
          <p className="text-xs text-gray-400 mt-1">Promedio de permanencia: 6.8 meses</p>
        </div>

        <div className="card-dark rounded-2xl p-5">
          <span className="text-xs uppercase font-bold text-gray-400">Sesiones Completadas (Mes)</span>
          <p className="text-3xl font-black text-brand-light mt-2">312</p>
          <p className="text-xs text-gray-400 mt-1">48 atletas activos</p>
        </div>
      </div>

      {/* Gráficos de Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 card-dark rounded-2xl p-5">
          <h2 className="text-base font-bold text-white mb-1">Crecimiento de Facturación Semestral</h2>
          <p className="text-xs text-gray-400 mb-4">Ingresos brutos acumulados en ARS</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_INCOME_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
                <XAxis dataKey="mes" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip
                  formatter={(val) => [`$${val.toLocaleString('es-AR')}`, 'Total']}
                  contentStyle={{ backgroundColor: '#18181f', borderColor: '#272733', borderRadius: '0.75rem', color: '#fff' }}
                />
                <Bar dataKey="total" fill="#e50914" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 card-dark rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Distribución por Modalidad</h2>
            <p className="text-xs text-gray-400 mb-4">Presencial vs Online</p>
            <div className="h-44 w-full flex items-center justify-center">
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
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-dark-700">
            {modalityData.map(item => (
              <div key={item.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name}
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
