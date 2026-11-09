import React, { useState, useEffect } from 'react';
import RegisterPaymentModal from './RegisterPaymentModal';
import EditClientModal from '../clients/EditClientModal';
import { 
  CreditCard, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  MessageCircle, 
  Calendar, 
  Building2, 
  Copy, 
  Check, 
  Edit3, 
  Pencil,
  Trash2, 
  ArrowUpRight, 
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  Receipt,
  User,
  Lock
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { 
  calcularEstadoPago, 
  getEstadoPagoConfig, 
  calcularDiasParaVencer,
  diasRestantesParaVencimiento, 
  formatearFechaPago, 
  calcularNuevaFechaVencimiento,
  generarEnlaceWhatsAppCobro,
  DEFAULT_BANK_DETAILS,
  DEFAULT_PLANS
} from '../../utils/paymentUtils';
import ClientAvatar from '../common/ClientAvatar';

export default function PaymentsView() {
  const [activeTab, setActiveTab] = useState('alumnos'); // 'alumnos' | 'configuracion' | 'recibos'
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState('Todos'); // 'Todos' | 'por_vencer' | 'vencido' | 'al_dia' | 'sin_plan'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Editar Alumno Unificado
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);

  // Configuración Bancaria
  const [bankDetails, setBankDetails] = useState(DEFAULT_BANK_DETAILS);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Planes de Entrenamiento
  const [trainingPlans, setTrainingPlans] = useState(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    nombre: '',
    precio: '',
    dias_vigencia: 30,
    descripcion: ''
  });

  // Modal Registrar Cobro
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    client_id: '',
    plan_nombre: '',
    monto: '',
    metodo: 'Transferencia',
    dias_vigencia: 30,
    fecha_pago: new Date().toISOString().split('T')[0]
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [cliList, payList] = await Promise.all([
        dataService.getClients(),
        dataService.getPayments()
      ]);

      const banks = dataService.getBankDetails();
      const plans = dataService.getTrainingPlans();

      setClients(cliList || []);
      setPayments(payList || []);
      setBankDetails(banks);
      setTrainingPlans(plans);
    } catch (err) {
      console.error('Error cargando datos de pagos:', err);
      showToast('Error cargando información de pagos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Copiar al portapapeles
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copiado: ${text}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Guardar Datos Bancarios
  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    setIsSavingBank(true);
    try {
      const saved = await dataService.saveBankDetails(bankDetails);
      setBankDetails(saved);
      showToast('Datos bancarios guardados correctamente');
    } catch (err) {
      showToast('Error al guardar datos bancarios', 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  // Crear o Editar Plan
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!newPlanForm.nombre || !newPlanForm.precio) {
      showToast('Completa el nombre y el precio del plan', 'error');
      return;
    }

    setIsSavingPlan(true);
    try {
      let updatedPlans;
      if (editingPlan) {
        updatedPlans = trainingPlans.map(p => 
          p.id === editingPlan.id 
            ? { ...editingPlan, ...newPlanForm, precio: parseFloat(newPlanForm.precio), dias_vigencia: parseInt(newPlanForm.dias_vigencia, 10) || 30 }
            : p
        );
        showToast('Plan actualizado correctamente');
      } else {
        const newPlan = {
          id: `plan-${Date.now()}`,
          nombre: newPlanForm.nombre.trim(),
          precio: parseFloat(newPlanForm.precio) || 0,
          dias_vigencia: parseInt(newPlanForm.dias_vigencia, 10) || 30,
          descripcion: newPlanForm.descripcion.trim()
        };
        updatedPlans = [...trainingPlans, newPlan];
        showToast('Nuevo plan creado con éxito');
      }

      setTrainingPlans(updatedPlans);
      await dataService.saveTrainingPlans(updatedPlans);
      setEditingPlan(null);
      setNewPlanForm({ nombre: '', precio: '', dias_vigencia: 30, descripcion: '' });
    } catch (err) {
      console.error('Error guardando plan:', err);
      showToast('Error al guardar el plan de entrenamiento', 'error');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleEditPlanClick = (plan) => {
    setEditingPlan(plan);
    setNewPlanForm({
      nombre: plan.nombre,
      precio: plan.precio,
      dias_vigencia: plan.dias_vigencia || 30,
      descripcion: plan.descripcion || ''
    });
  };

  const handleDeletePlan = (planId) => {
    if (trainingPlans.length <= 1) {
      showToast('Debes mantener al menos un plan activo', 'error');
      return;
    }
    const updated = trainingPlans.filter(p => p.id !== planId);
    setTrainingPlans(updated);
    dataService.saveTrainingPlans(updated);
    showToast('Plan eliminado');
  };

  // Abrir Modal de Cobro para un Alumno
  const handleOpenPaymentModal = (client = null) => {
    const target = client || clients[0];
    if (!target) return;

    // Buscar plan coincidente o primer plan por defecto
    const currentPlan = trainingPlans.find(p => p.nombre === target.plan_actual) || trainingPlans[0];

    setSelectedClientForPayment(target);
    setPaymentForm({
      client_id: target.id,
      plan_nombre: target.plan_actual || currentPlan?.nombre || 'Plan 3x Semanal Personalizado',
      monto: currentPlan?.precio || '38000',
      metodo: 'Transferencia',
      dias_vigencia: currentPlan?.dias_vigencia || 30,
      fecha_pago: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  // Al cambiar el plan en el modal de cobro
  const handlePlanSelectChange = (planNombre) => {
    const foundPlan = trainingPlans.find(p => p.nombre === planNombre);
    setPaymentForm(prev => ({
      ...prev,
      plan_nombre: planNombre,
      monto: foundPlan ? String(foundPlan.precio) : prev.monto,
      dias_vigencia: foundPlan ? foundPlan.dias_vigencia : 30
    }));
  };

  // Confirmar y Registrar Cobro
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.client_id || !paymentForm.monto) {
      showToast('Selecciona un alumno e ingresa el monto', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const result = await dataService.recordClientPayment({
        clientId: paymentForm.client_id,
        planNombre: paymentForm.plan_nombre,
        monto: parseFloat(paymentForm.monto),
        metodo: paymentForm.metodo,
        diasVigencia: parseInt(paymentForm.dias_vigencia, 10) || 30,
        fechaPago: paymentForm.fecha_pago
      });

      // Actualizar estado local de clients de inmediato
      setClients(prev => prev.map(c => {
        if (c.id === paymentForm.client_id) {
          return {
            ...c,
            fecha_vencimiento: result.nuevaFechaVencimiento,
            plan_actual: paymentForm.plan_nombre,
            estado_pago: 'al_dia'
          };
        }
        return c;
      }));

      // Agregar a lista de pagos
      setPayments(prev => [result.payment, ...prev]);

      setIsPaymentModalOpen(false);
      showToast(`¡Cobro registrado! Nueva cuota al día hasta el ${formatearFechaPago(result.nuevaFechaVencimiento)}`);
    } catch (err) {
      console.error('Error al registrar cobro:', err);
      showToast('No se pudo registrar el cobro: ' + (err.message || 'Error de red'), 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Cálculos de métricas globales
  const countAlDia = clients.filter(c => (c.estado_pago || calcularEstadoPago(c.fecha_vencimiento)) === 'al_dia').length;
  const countPorVencer = clients.filter(c => (c.estado_pago || calcularEstadoPago(c.fecha_vencimiento)) === 'por_vencer').length;
  const countVencido = clients.filter(c => (c.estado_pago || calcularEstadoPago(c.fecha_vencimiento)) === 'vencido').length;
  const countSinPlan = clients.filter(c => (c.estado_pago || calcularEstadoPago(c.fecha_vencimiento)) === 'sin_plan').length;

  // Filtrado de alumnos
  const filteredClients = clients.filter(c => {
    const estado = c.estado_pago || calcularEstadoPago(c.fecha_vencimiento);
    const matchesFilter = filterState === 'Todos' || estado === filterState;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (c.nombre_completo || '').toLowerCase().includes(query) ||
      (c.access_code || '').toLowerCase().includes(query) ||
      (c.telefono || '').includes(query);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-12 animate-in fade-in duration-300">
      
      {/* TOAST FLOTANTE */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-bold border transition-all animate-in slide-in-from-bottom-5 ${
          toast.type === 'error'
            ? 'bg-red-950/90 text-red-200 border-red-500/40'
            : 'bg-[#18171d] text-emerald-300 border-emerald-500/40 shadow-glow-emerald'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-light shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-wide">
              Planes & Control de Pagos
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gestión de cuotas por vencer, registro de cobros, planes y datos de transferencia bancaria.
          </p>
        </div>

        <button
          onClick={() => handleOpenPaymentModal()}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Cobro</span>
        </button>
      </div>

      {/* TARJETAS RESUMEN DE VENCIMIENTOS (COMPACTAS EN MOBILE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        
        {/* 1. Al Día */}
        <div 
          onClick={() => { setActiveTab('alumnos'); setFilterState('al_dia'); }}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-900/90 border border-gray-800 card-dark-hover relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 leading-tight">Cuotas Al Día</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400 mt-2">
            {countAlDia}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">Alumnos al día</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* 2. Por Vencer */}
        <div 
          onClick={() => { setActiveTab('alumnos'); setFilterState('por_vencer'); }}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-900/90 border border-gray-800 card-dark-hover relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 leading-tight">Por Vencer</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-amber-400 mt-2">
            {countPorVencer}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">Vencen en 5 días</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        {/* 3. Vencidos */}
        <div 
          onClick={() => { setActiveTab('alumnos'); setFilterState('vencido'); }}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-900/90 border border-gray-800 card-dark-hover relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 leading-tight">Cuotas Vencidas</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-brand-light mt-2">
            {countVencido}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">Requieren aviso</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand"></div>
        </div>

        {/* 4. Total Alumnos */}
        <div 
          onClick={() => { setActiveTab('alumnos'); setFilterState('Todos'); }}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-900/90 border border-gray-800 card-dark-hover relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 leading-tight">Total Alumnos</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
            {clients.length}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 leading-tight mt-0.5">{countSinPlan} sin plan</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
        </div>

      </div>

      {/* SELECTOR DE PESTAÑAS RESPONSIVO CON SLIDER HORIZONTAL */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-gray-800 pb-2 px-1 sm:px-0 -mx-4 sm:mx-0 px-4 sm:px-0">
        <button
          onClick={() => setActiveTab('alumnos')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'alumnos'
              ? 'bg-gray-800 text-white shadow-sm border border-gray-700 font-bold'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>Cobros de Alumnos</span>
          {(countPorVencer > 0 || countVencido > 0) && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-600/20 text-red-400 border border-red-500/30 ml-1.5">
              {countPorVencer + countVencido}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('configuracion')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'configuracion'
              ? 'bg-gray-800 text-white shadow-sm border border-gray-700 font-bold'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Configuración de Planes & Datos Bancarios</span>
        </button>

        <button
          onClick={() => setActiveTab('recibos')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'recibos'
              ? 'bg-gray-800 text-white shadow-sm border border-gray-700 font-bold'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>Historial de Cobros</span>
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-700 text-gray-300 ml-1">
            {payments.length}
          </span>
        </button>
      </div>

      {/* ========================================================== */}
      {/* PESTAÑA A: LISTADO DE COBROS DE ALUMNOS */}
      {/* ========================================================== */}
      {activeTab === 'alumnos' && (
        <div className="space-y-4">
          
          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand"
              />
            </div>

            {/* Filtros de estado */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'Todos', label: 'Todos' },
                { id: 'por_vencer', label: `Por Vencer (${countPorVencer})`, color: 'text-amber-400' },
                { id: 'vencido', label: `Vencidos (${countVencido})`, color: 'text-red-400' },
                { id: 'al_dia', label: `Al Día (${countAlDia})`, color: 'text-emerald-400' },
                { id: 'sin_plan', label: 'Sin Plan' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterState(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    filterState === f.id
                      ? 'bg-brand text-white border-brand shadow-sm'
                      : 'bg-dark-900 text-gray-400 hover:text-white border-dark-700'
                  }`}
                >
                  <span className={filterState === f.id ? 'text-white' : f.color}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TABLA DE ALUMNOS Y COBROS */}
          <div className="card-dark rounded-2xl overflow-hidden border border-[#1f1e24]">
            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
                <p className="text-xs">Cargando estado de alumnos y cuotas...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <CreditCard className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-bold text-gray-300">No se encontraron alumnos con ese criterio</p>
                <p className="text-xs text-gray-500">Prueba cambiando el filtro o la búsqueda.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse block sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="border-b border-[#232229] bg-[#121116] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Alumno</th>
                      <th className="py-3.5 px-4">Plan Actual</th>
                      <th className="py-3.5 px-4">Fecha de Vencimiento</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1d24] text-xs sm:text-sm block sm:table-row-group">
                    {filteredClients.map(client => {
                      const estado = client.estado_pago || calcularEstadoPago(client.fecha_vencimiento);
                      const config = getEstadoPagoConfig(estado);
                      const diffDias = diasRestantesParaVencimiento(client.fecha_vencimiento);
                      const waLink = generarEnlaceWhatsAppCobro({
                        telefono: client.telefono,
                        nombre: client.nombre_completo,
                        plan: client.plan_actual,
                        fechaVencimiento: client.fecha_vencimiento,
                        estado: estado,
                        datosBancarios: bankDetails
                      });

                      return (
                        <tr
                          key={client.id}
                          className="flex flex-col sm:table-row border-b border-gray-800/50 p-4 sm:p-0 gap-3 sm:gap-0 hover:bg-[#18171e]/70 transition-colors"
                        >
                          
                          {/* 1. Alumno (en móvil incluye avatar, nombre, modalidad y badge de estado) */}
                          <td className="flex flex-col sm:table-cell p-0 sm:py-3.5 sm:px-4">
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <ClientAvatar client={client} size="md" />
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate text-sm sm:text-base">{client.nombre_completo}</p>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                    <span>{client.modalidad || 'Presencial'}</span>
                                    {client.telefono && (
                                      <>
                                        <span>•</span>
                                        <span>{client.telefono}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Badge de estado en móvil (cabecera de la tarjeta) */}
                              <div className="sm:hidden shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
                                  {config.label}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Plan Actual */}
                          <td className="flex items-center justify-between sm:table-cell p-0 sm:py-3.5 sm:px-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:hidden">Plan:</span>
                            <span className="font-semibold text-gray-200 text-xs sm:text-sm">
                              {client.plan_actual || 'Plan 3x Semanal Personalizado'}
                            </span>
                          </td>

                          {/* 3. Fecha Vencimiento */}
                          <td className="flex items-center justify-between sm:table-cell p-0 sm:py-3.5 sm:px-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:hidden">Vencimiento:</span>
                            {client.fecha_vencimiento ? (
                              <div className="text-right sm:text-left">
                                <p className="font-bold text-white text-xs sm:text-sm">
                                  {formatearFechaPago(client.fecha_vencimiento, { extendida: true })}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {diffDias === 0 && <span className="text-amber-400 font-bold">Vence hoy</span>}
                                  {diffDias > 0 && <span>Quedan {diffDias} día{diffDias > 1 ? 's' : ''}</span>}
                                  {diffDias < 0 && <span className="text-red-400 font-medium">Venció hace {Math.abs(diffDias)} día{Math.abs(diffDias) > 1 ? 's' : ''}</span>}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs italic">Sin fecha asignada</span>
                            )}
                          </td>

                          {/* 4. Estado (Badge en Desktop) */}
                          <td className="hidden sm:table-cell py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
                              {config.label}
                            </span>
                          </td>

                          {/* 5. Acciones */}
                          <td className="flex flex-col sm:table-cell w-full sm:w-auto p-0 sm:py-3.5 sm:px-4 sm:text-right pt-2 sm:pt-3.5 border-t border-gray-800/50 sm:border-0 mt-1 sm:mt-0">
                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
                              
                              {/* Botón WhatsApp */}
                              {waLink ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-h-[38px] px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 text-xs font-bold shrink-0"
                                  title={`Enviar recordatorio por WhatsApp a ${client.nombre_completo}`}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span className="inline sm:hidden xl:inline">WhatsApp</span>
                                </a>
                              ) : (
                                <button
                                  onClick={() => showToast('El alumno no tiene teléfono registrado', 'error')}
                                  className="min-h-[38px] p-2 sm:px-3 rounded-xl bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed text-xs flex items-center justify-center shrink-0"
                                  title="Sin teléfono registrado"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Botón Editar Alumno (Modal Único) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setClientToEdit(client);
                                  setIsEditModalOpen(true);
                                }}
                                className="min-h-[38px] px-2.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0"
                                title={`Editar alumno ${client.nombre_completo}`}
                              >
                                <Pencil className="w-3.5 h-3.5 text-brand-light" />
                                <span className="hidden xl:inline">Editar</span>
                              </button>

                              {/* Botón Registrar Cobro según regla de 3 días de vencimiento */}
                              <div className="flex-1 sm:flex-initial">
                                {(() => {
                                  const diasRestantes = calcularDiasParaVencer(client.fecha_vencimiento);
                                  const sinVencimientoOExpirado = !client.fecha_vencimiento || diasRestantes < 0;
                                  const porVencerHabilitado = diasRestantes >= 0 && diasRestantes <= 3;

                                  if (diasRestantes > 3) {
                                    return (
                                      <button
                                        type="button"
                                        disabled
                                        className="w-full sm:w-auto min-h-[38px] bg-gray-800/60 text-gray-400 border border-gray-800 cursor-not-allowed px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 opacity-80"
                                        title={`Cuota al día. Vence el ${formatearFechaPago(client.fecha_vencimiento, { extendida: true })} (quedan ${diasRestantes} días)`}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                                        <span className="truncate">Al día (vence en {diasRestantes} d)</span>
                                      </button>
                                    );
                                  }

                                  if (porVencerHabilitado) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPaymentModal(client)}
                                        className="w-full sm:w-auto min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                                        title={`Cuota por vencer el ${formatearFechaPago(client.fecha_vencimiento, { extendida: true })}`}
                                      >
                                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span>Cobrar (Vence en {diasRestantes} d)</span>
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentModal(client)}
                                      className="w-full sm:w-auto min-h-[38px] px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs transition-all shadow-glow-red flex items-center justify-center gap-1.5 active:scale-95"
                                      title="Registrar cobro de cuota"
                                    >
                                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                      <span>Registrar Cobro</span>
                                    </button>
                                  );
                                })()}
                              </div>

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA B: CONFIGURACIÓN DE PLANES Y DATOS BANCARIOS */}
      {/* ========================================================== */}
      {activeTab === 'configuracion' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SECCIÓN 1: DATOS BANCARIOS DE ESTEBAN CORREA (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-4 sm:p-6 rounded-2xl bg-gray-900 border border-gray-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-brand shrink-0" />
                    Datos de Cobro Bancario
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Se muestran automáticamente a tus alumnos en su app para que te transfieran.
                  </p>
                </div>
              </div>

              {/* TARJETA VISUAL BANCARIA ESTILO PRO */}
              <div className="p-3.5 sm:p-5 rounded-xl bg-gradient-to-br from-gray-800/70 to-gray-900/90 border border-gray-700/60 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl group-hover:bg-brand/20 transition-all pointer-events-none"></div>

                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-light">Esteban Correa</span>
                    <p className="text-sm font-extrabold text-white">{bankDetails.banco || 'Mercado Pago'}</p>
                  </div>
                  <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 shrink-0" />
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-gray-400">Titular de Cuenta</span>
                    <p className="text-xs sm:text-sm font-bold text-white">{bankDetails.titular || 'Esteban Correa'}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-black/40 p-2.5 sm:p-3 rounded-xl border border-white/5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase text-gray-400 block">Alias para Transferir</span>
                      <span className="font-mono text-xs sm:text-sm font-black text-emerald-400 tracking-wider break-all sm:break-normal block">
                        {bankDetails.alias || 'ESTEBAN.TRAINER.MP'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails.alias, 'alias_preview')}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-gray-300 hover:text-white shrink-0"
                      title="Copiar Alias"
                    >
                      {copiedKey === 'alias_preview' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-black/40 p-2.5 sm:p-3 rounded-xl border border-white/5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase text-gray-400 block">CBU / CVU</span>
                      <span className="font-mono text-xs sm:text-sm font-semibold text-gray-200 tracking-wider break-all sm:break-normal block">
                        {bankDetails.cbu || '0000003100012345678901'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails.cbu, 'cbu_preview')}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-gray-300 hover:text-white shrink-0"
                      title="Copiar CBU"
                    >
                      {copiedKey === 'cbu_preview' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* FORMULARIO EDITAR DATOS BANCARIOS */}
              <form onSubmit={handleSaveBankDetails} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-gray-400">Titular de Cuenta</label>
                  <input
                    type="text"
                    value={bankDetails.titular}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, titular: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand font-semibold"
                    placeholder="Ej. Esteban Correa"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-400">Banco / Entidad</label>
                    <input
                      type="text"
                      value={bankDetails.banco}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, banco: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand font-semibold"
                      placeholder="Ej. Mercado Pago"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-400">Alias</label>
                    <input
                      type="text"
                      value={bankDetails.alias}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, alias: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-emerald-400 focus:outline-none focus:border-brand font-mono font-bold"
                      placeholder="ESTEBAN.TRAINER.MP"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-gray-400">CBU / CVU (22 dígitos)</label>
                  <input
                    type="text"
                    value={bankDetails.cbu}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, cbu: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand font-mono font-semibold"
                    placeholder="0000003100012345678901"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-gray-400">Teléfono WhatsApp para Comprobantes</label>
                  <input
                    type="text"
                    value={bankDetails.telefono}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand font-semibold"
                    placeholder="+54 9 11 2345-6789"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="w-full mt-2 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wider transition-all shadow-glow-red disabled:opacity-50"
                >
                  {isSavingBank ? 'Guardando...' : 'Guardar Datos Bancarios'}
                </button>
              </form>
            </div>
          </div>

          {/* SECCIÓN 2: GESTIÓN DE PLANES DE ENTRENAMIENTO (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Formulario Crear/Editar Plan */}
            <div className="card-dark rounded-2xl p-5 border border-[#24222a] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-brand" />
                    {editingPlan ? 'Editar Plan de Entrenamiento' : 'Crear Nuevo Plan de Entrenamiento'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Define la oferta de planes, precios en ARS y los días de vigencia de cada cuota.
                  </p>
                </div>
                {editingPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlan(null);
                      setNewPlanForm({ nombre: '', precio: '', dias_vigencia: 30, descripcion: '' });
                    }}
                    className="text-xs text-gray-400 hover:text-white underline"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePlan} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-400">Nombre del Plan</label>
                    <input
                      type="text"
                      value={newPlanForm.nombre}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand font-semibold"
                      placeholder="Ej. Plan 3x Semanal Personalizado"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-400">Precio (ARS)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        value={newPlanForm.precio}
                        onChange={(e) => setNewPlanForm(prev => ({ ...prev, precio: e.target.value }))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand font-bold"
                        placeholder="38000"
                        required
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-bold uppercase text-gray-400">Días de Vigencia</label>
                    <input
                      type="number"
                      value={newPlanForm.dias_vigencia}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, dias_vigencia: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand font-semibold"
                      placeholder="30"
                      required
                      min="1"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-gray-400">Descripción / Frecuencia</label>
                    <input
                      type="text"
                      value={newPlanForm.descripcion}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs sm:text-sm text-white focus:outline-none focus:border-brand"
                      placeholder="Ej. 3 sesiones semanales con seguimiento antropométrico"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wider transition-all shadow-glow-red flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSavingPlan ? 'Guardando...' : (editingPlan ? 'Guardar Cambios del Plan' : 'Agregar Plan')}</span>
                </button>
              </form>
            </div>

            {/* Listado de Planes Activos */}
            <div className="card-dark rounded-2xl p-5 border border-[#24222a] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Planes Disponibles ({trainingPlans.length})
              </h3>

              <div className="space-y-2.5">
                {trainingPlans.map(plan => (
                  <div 
                    key={plan.id}
                    className="p-4 rounded-xl bg-dark-900 border border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-600 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{plan.nombre}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/15 text-brand-light border border-brand/30">
                          {plan.dias_vigencia || 30} días
                        </span>
                      </div>
                      {plan.descripcion && (
                        <p className="text-xs text-gray-400 mt-1">{plan.descripcion}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className="text-base font-black text-white">
                        ${Number(plan.precio).toLocaleString('es-AR')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditPlanClick(plan)}
                          className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white transition-all"
                          title="Editar Plan"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-all border border-red-500/20"
                          title="Eliminar Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA C: HISTORIAL DE RECIBOS Y COBROS */}
      {/* ========================================================== */}
      {activeTab === 'recibos' && (
        <div className="card-dark rounded-2xl overflow-hidden border border-[#1f1e24]">
          <div className="p-4 sm:p-5 border-b border-[#24222a] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand" />
                Historial de Cobros Registrados
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Comprobantes de pago cargados en el sistema con método y fecha de vencimiento.
              </p>
            </div>
            <span className="text-xs font-bold text-gray-400 bg-dark-900 px-3 py-1 rounded-xl border border-dark-700">
              Total: {payments.length} recibos
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Receipt className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-sm font-bold text-gray-300">Aún no hay cobros registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#232229] bg-[#121116] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Alumno</th>
                    <th className="py-3 px-4">Plan Cobrado</th>
                    <th className="py-3 px-4">Monto</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4">Fecha Pago</th>
                    <th className="py-3 px-4">Vencimiento Otorgado</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1d24]">
                  {payments.map(p => {
                    const client = clients.find(c => c.id === p.client_id);
                    const alumnoNombre = client?.nombre_completo || p.client_name || p.client?.nombre_completo || 'Alumno';

                    return (
                      <tr key={p.id} className="hover:bg-[#18171e]/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{alumnoNombre}</td>
                        <td className="py-3 px-4 text-gray-300">{p.plan_nombre}</td>
                        <td className="py-3 px-4 font-mono font-extrabold text-white">${Number(p.monto).toLocaleString('es-AR')}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-dark-900 border border-dark-700 text-xs text-gray-300">
                            {p.metodo || 'Transferencia'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{formatearFechaPago(p.fecha_pago || p.created_at)}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-400">{formatearFechaPago(p.fecha_vencimiento, { extendida: true })}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Asentado</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL RÁPIDO: REGISTRAR COBRO */}
      {/* ========================================================== */}
      <RegisterPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        initialClient={selectedClientForPayment}
        clients={clients}
        trainingPlans={trainingPlans}
        onPaymentSuccess={(result) => {
          setClients(prev => prev.map(c => {
            if (c.id === result.payment.client_id) {
              return {
                ...c,
                fecha_vencimiento: result.nuevaFechaVencimiento,
                plan_actual: result.payment.plan_nombre,
                estado_pago: 'al_dia'
              };
            }
            return c;
          }));
          setPayments(prev => [result.payment, ...prev]);
          setIsPaymentModalOpen(false);
          showToast(`¡Cobro registrado! Nueva cuota al día hasta el ${formatearFechaPago(result.nuevaFechaVencimiento)}`);
        }}
      />

      {/* ========================================================== */}
      {/* MODAL EDITAR ALUMNO (UNIFICADO)                            */}
      {/* ========================================================== */}
      {isEditModalOpen && clientToEdit && (
        <EditClientModal
          isOpen={isEditModalOpen}
          clienteAEditar={clientToEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setClientToEdit(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setClientToEdit(null);
            loadAllData();
            showToast('Alumno actualizado correctamente');
          }}
        />
      )}

    </div>
  );
}

