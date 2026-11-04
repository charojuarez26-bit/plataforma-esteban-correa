import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Scale, 
  Ruler, 
  Plus, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  Award
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

export default function ProgressView() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nueva medición
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso: '',
    porcentaje_grasa: '',
    cintura: '',
    cadera: '',
    brazo: '',
    muslo: '',
    notas: ''
  });

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadEvaluations(selectedClientId);
    }
  }, [selectedClientId]);

  const loadInitial = async () => {
    const cliList = await dataService.getClients();
    setClients(cliList);
    if (cliList.length > 0) {
      setSelectedClientId(cliList[0].id);
      loadEvaluations(cliList[0].id);
    }
  };

  const loadEvaluations = async (cId) => {
    const list = await dataService.getEvaluations(cId);
    setEvaluations(list);
  };

  const handleCreateEvaluation = async (e) => {
    e.preventDefault();
    if (!formData.peso) return;

    await dataService.addEvaluation({
      ...formData,
      client_id: selectedClientId,
      peso: parseFloat(formData.peso),
      porcentaje_grasa: parseFloat(formData.porcentaje_grasa || 0),
      cintura: parseFloat(formData.cintura || 0),
      cadera: parseFloat(formData.cadera || 0),
      brazo: parseFloat(formData.brazo || 0),
      muslo: parseFloat(formData.muslo || 0)
    });

    setIsModalOpen(false);
    loadEvaluations(selectedClientId);
  };

  const currentClient = clients.find(c => c.id === selectedClientId);

  // Cálculos de variación
  const firstEval = evaluations.length > 0 ? evaluations[0] : null;
  const lastEval = evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

  const weightDelta = firstEval && lastEval ? (lastEval.peso - firstEval.peso).toFixed(1) : 0;
  const waistDelta = firstEval && lastEval ? (lastEval.cintura - firstEval.cintura).toFixed(1) : 0;
  const armDelta = firstEval && lastEval ? (lastEval.brazo - firstEval.brazo).toFixed(1) : 0;
  const fatDelta = firstEval && lastEval ? (lastEval.porcentaje_grasa - firstEval.porcentaje_grasa).toFixed(1) : 0;

  const renderDelta = (diff, isReductionGood = true) => {
    if (diff === null || diff === undefined || isNaN(diff)) return null;
    const num = Number(diff);
    if (num === 0) return <span className="text-[10px] text-gray-500 font-semibold ml-1">(= 0 cm)</span>;

    const isPositive = num > 0;
    const isGood = isReductionGood ? !isPositive : isPositive;
    const colorClass = isGood ? 'text-emerald-400' : 'text-red-400';
    const arrow = isPositive ? '▲' : '▼';
    const sign = isPositive ? '+' : '';

    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${colorClass} ml-1`}>
        <span>{arrow}</span>
        <span>{sign}{diff} cm</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* HEADER & SELECTOR DE CLIENTE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand" />
            Seguimiento Antropométrico & Físico
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Control biométrico, pliegues cutáneos y variaciones en centímetros.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre_completo} ({c.access_code})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Medición</span>
          </button>
        </div>
      </div>

      {/* TARJETAS RESUMEN DE VARIACIONES (+/-) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="card-dark rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">Peso Corporal</span>
            <Scale className="w-4 h-4 text-brand-light" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {lastEval?.peso || 0} <span className="text-xs text-gray-400 font-normal">kg</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs font-bold">
            {weightDelta <= 0 ? (
              <span className="text-emerald-400 flex items-center">
                <ArrowDownRight className="w-4 h-4" /> {weightDelta} kg
              </span>
            ) : (
              <span className="text-blue-400 flex items-center">
                <ArrowUpRight className="w-4 h-4" /> +{weightDelta} kg
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-normal">acumulado</span>
          </div>
        </div>

        <div className="card-dark rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">Cintura</span>
            <Ruler className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {lastEval?.cintura || 0} <span className="text-xs text-gray-400 font-normal">cm</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs font-bold">
            <span className="text-emerald-400 flex items-center">
              <ArrowDownRight className="w-4 h-4" /> {waistDelta} cm
            </span>
            <span className="text-[10px] text-gray-400 font-normal">reducción</span>
          </div>
        </div>

        <div className="card-dark rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">Brazo (Bíceps)</span>
            <Ruler className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {lastEval?.brazo || 0} <span className="text-xs text-gray-400 font-normal">cm</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs font-bold">
            <span className="text-blue-400 flex items-center">
              <ArrowUpRight className="w-4 h-4" /> +{armDelta} cm
            </span>
            <span className="text-[10px] text-gray-400 font-normal">hipertrofia</span>
          </div>
        </div>

        <div className="card-dark rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">% Grasa Estimado</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {lastEval?.porcentaje_grasa || 0} <span className="text-xs text-gray-400 font-normal">%</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs font-bold">
            <span className="text-emerald-400 flex items-center">
              <ArrowDownRight className="w-4 h-4" /> {fatDelta}%
            </span>
            <span className="text-[10px] text-gray-400 font-normal">mejora</span>
          </div>
        </div>

      </div>

      {/* GRÁFICO DE EVOLUCIÓN DE PESO */}
      <div className="card-dark rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-light" />
              Evolución Temporal del Peso (kg) - {currentClient?.nombre_completo}
            </h2>
            <p className="text-xs text-gray-400">Curva de descenso de peso y composición</p>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={evaluations}
              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#272733" />
              <XAxis dataKey="fecha" stroke="#888" fontSize={11} tickLine={false} />
              <YAxis domain={['auto', 'auto']} stroke="#888" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181f',
                  borderColor: '#272733',
                  borderRadius: '0.75rem',
                  color: '#fff'
                }}
              />
              <Line
                type="monotone"
                dataKey="peso"
                name="Peso (kg)"
                stroke="#e50914"
                strokeWidth={3}
                dot={{ fill: '#e50914', r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLA DE MEDIDAS CON VARIACIÓN (+/- CM) */}
      <div className="card-dark rounded-2xl p-5">
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Ruler className="w-4 h-4 text-brand-light" />
          Historial Antropométrico Detallado
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-dark-900 text-gray-400 uppercase text-[10px] border-b border-dark-700">
              <tr>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Peso (kg)</th>
                <th className="py-3 px-3">Cintura</th>
                <th className="py-3 px-3">Cadera</th>
                <th className="py-3 px-3">Brazo</th>
                <th className="py-3 px-3">Muslo</th>
                <th className="py-3 px-3">% Grasa</th>
                <th className="py-3 px-3">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/60 text-gray-300">
              {evaluations.map((ev, index) => {
                const prev = index > 0 ? evaluations[index - 1] : null;
                const cDiff = prev ? (ev.cintura - prev.cintura).toFixed(1) : null;
                const hDiff = prev ? (ev.cadera - prev.cadera).toFixed(1) : null;
                const bDiff = prev ? (ev.brazo - prev.brazo).toFixed(1) : null;
                const mDiff = prev ? (ev.muslo - prev.muslo).toFixed(1) : null;

                return (
                  <tr key={ev.id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{ev.fecha}</td>
                    <td className="py-3 px-3 font-bold text-brand-light">{ev.peso} kg</td>
                    <td className="py-3 px-3">
                      <span>{ev.cintura} cm</span>
                      {renderDelta(cDiff, true)}
                    </td>
                    <td className="py-3 px-3">
                      <span>{ev.cadera} cm</span>
                      {renderDelta(hDiff, true)}
                    </td>
                    <td className="py-3 px-3">
                      <span>{ev.brazo} cm</span>
                      {renderDelta(bDiff, false)}
                    </td>
                    <td className="py-3 px-3">
                      <span>{ev.muslo} cm</span>
                      {renderDelta(mDiff, false)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-amber-400">{ev.porcentaje_grasa}%</td>
                    <td className="py-3 px-3 text-gray-400 truncate max-w-[200px]">{ev.notas || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVA EVALUACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand" />
                  Nueva Medición Física
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Registra los datos para calcular automáticamente las variaciones (+/-).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvaluation} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3 pb-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="81.5"
                      value={formData.peso}
                      onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Cintura</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="86"
                      value={formData.cintura}
                      onChange={(e) => setFormData({ ...formData, cintura: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Cadera</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="100"
                      value={formData.cadera}
                      onChange={(e) => setFormData({ ...formData, cadera: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Brazo</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="38"
                      value={formData.brazo}
                      onChange={(e) => setFormData({ ...formData, brazo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Muslo</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="62"
                      value={formData.muslo}
                      onChange={(e) => setFormData({ ...formData, muslo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white min-h-[38px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">Notas y Sensaciones</label>
                  <textarea
                    rows="2"
                    placeholder="Observaciones de fuerza, descanso y vascularización..."
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white"
                  ></textarea>
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
                  Guardar Medición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
