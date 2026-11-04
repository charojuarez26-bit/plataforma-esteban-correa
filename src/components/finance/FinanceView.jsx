import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ArrowUpRight,
  Filter,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { dataService } from '../../services/dataService';
import { MONTHLY_INCOME_DATA } from '../../data/mockData';

export default function FinanceView() {
  const [payments, setPayments] = useState([]);
  const [filterState, setFilterState] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState([]);

  // Formulario nuevo cobro
  const [formData, setFormData] = useState({
    client_id: '',
    plan_nombre: 'Plan 4x Semanal Personalizado',
    monto: '45000',
    fecha_vencimiento: '2026-12-10',
    metodo: 'Transferencia',
    estado: 'Pagado'
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const list = await dataService.getPayments();
    const cliList = await dataService.getClients();
    setPayments(list);
    setClients(cliList);
    if (cliList.length > 0 && !formData.client_id) {
      setFormData(prev => ({ ...prev, client_id: cliList[0].id }));
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formData.client_id);
    const created = await dataService.addPayment({
      client_id: formData.client_id,
      client_name: client?.nombre_completo || 'Alumno',
      plan_nombre: formData.plan_nombre,
      monto: parseFloat(formData.monto),
      fecha_vencimiento: formData.fecha_vencimiento,
      metodo: formData.metodo,
      estado: formData.estado
    });

    setPayments([created, ...payments]);
    setIsModalOpen(false);
  };

  const filteredPayments = payments.filter(p => 
    filterState === 'Todos' || p.estado === filterState
  );

  const totalIncome = payments
    .filter(p => p.estado === 'Pagado')
    .reduce((sum, p) => sum + p.monto, 0);

  const pendingIncome = payments
    .filter(p => p.estado === 'Pendiente')
    .reduce((sum, p) => sum + p.monto, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand" />
            Finanzas & Control de Cuotas
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Control de cobros mensuales, medios de pago y seguimiento de morosidad.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Cobro</span>
        </button>
      </div>

      {/* TARJETAS RESUMEN FINANCIERO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="card-dark rounded-2xl p-5 relative overflow-hidden">
          <span className="text-xs font-semibold uppercase text-gray-400">Ingresos Totales (Mes)</span>
          <p className="text-3xl font-black text-white mt-3">
            ${totalIncome.toLocaleString('es-AR')}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <ArrowUpRight className="w-4 h-4" />
            <span>+14.2% respecto al mes anterior</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        <div className="card-dark rounded-2xl p-5 relative overflow-hidden">
          <span className="text-xs font-semibold uppercase text-gray-400">Cobros Pendientes</span>
          <p className="text-3xl font-black text-amber-400 mt-3">
            ${pendingIncome.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            3 planes por vencer esta semana
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        <div className="card-dark rounded-2xl p-5 relative overflow-hidden">
          <span className="text-xs font-semibold uppercase text-gray-400">Ticket Promedio por Alumno</span>
          <p className="text-3xl font-black text-brand-light mt-3">
            $38.500
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Planes 3x y 4x semanales
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand"></div>
        </div>

      </div>

      {/* GRÁFICO DE FACTURACIÓN MENSUAL */}
      <div className="card-dark rounded-2xl p-5">
        <h2 className="text-base font-bold text-white mb-1">
          Evolución de Facturación Mensual (ARS)
        </h2>
        <p className="text-xs text-gray-400 mb-4">Crecimiento sostenido del centro de entrenamiento</p>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MONTHLY_INCOME_DATA}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
              <XAxis dataKey="mes" stroke="#888" fontSize={12} tickLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} />
              <Tooltip
                formatter={(value) => [`$${value.toLocaleString('es-AR')}`, 'Facturación']}
                contentStyle={{
                  backgroundColor: '#18181f',
                  borderColor: '#272733',
                  borderRadius: '0.75rem',
                  color: '#fff'
                }}
              />
              <Bar dataKey="total" fill="#e50914" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLA DE PAGOS RECIENTES */}
      <div className="card-dark rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">
            Historial de Pagos & Cuotas
          </h2>

          <div className="flex gap-2">
            {['Todos', 'Pagado', 'Pendiente', 'Vencido'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterState === st
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-dark-900 text-gray-400 hover:text-white border border-dark-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-dark-900 text-gray-400 uppercase text-[10px] border-b border-dark-700">
              <tr>
                <th className="py-3 px-3">Alumno</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Monto</th>
                <th className="py-3 px-3">Vencimiento</th>
                <th className="py-3 px-3">Método</th>
                <th className="py-3 px-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/60 text-gray-300">
              {filteredPayments.map((p) => {
                const isPaid = p.estado === 'Pagado';
                const isPending = p.estado === 'Pendiente';
                return (
                  <tr key={p.id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">{p.client_name}</td>
                    <td className="py-3 px-3">{p.plan_nombre}</td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      ${p.monto.toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 px-3 text-gray-400">{p.fecha_vencimiento}</td>
                    <td className="py-3 px-3">{p.metodo}</td>
                    <td className="py-3 px-3">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Pagado
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                          Vencido
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR COBRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[92vh] sm:max-h-[85vh] flex flex-col p-5 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand" />
                Registrar Cobro de Plan
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3 pb-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Alumno</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Nombre del Plan</label>
                  <input
                    type="text"
                    required
                    value={formData.plan_nombre}
                    onChange={(e) => setFormData({ ...formData, plan_nombre: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Monto ($)</label>
                    <input
                      type="number"
                      required
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Método</label>
                    <select
                      value={formData.metodo}
                      onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="MercadoPago">MercadoPago</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Fecha Vencimiento</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    >
                      <option value="Pagado">Pagado</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-dark-700/80 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-dark-800 hover:text-white border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red min-h-[44px]"
                >
                  Guardar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
