import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Lock, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Sparkles, 
  CheckCircle2, 
  User 
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { 
  calcularDiasParaVencer, 
  formatearFechaPago, 
  calcularNuevaFechaVencimiento, 
  DEFAULT_PLANS 
} from '../../utils/paymentUtils';
import ClientAvatar from '../common/ClientAvatar';

export default function RegisterPaymentModal({
  isOpen,
  onClose,
  initialClient = null,
  initialClientId = null,
  initialPlanId = null,
  clients = [],
  trainingPlans = [],
  onPaymentSuccess = null,
  title = null
}) {
  const [availableClients, setAvailableClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    client_id: '',
    plan_nombre: '',
    monto: '',
    metodo: 'Transferencia',
    dias_vigencia: 30,
    fecha_pago: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Inicializar lista de alumnos y planes disponibles
  useEffect(() => {
    let active = true;

    const initData = async () => {
      // Filtrar siempre plantilla general
      const filterRealClients = (list) => {
        return (list || []).filter(c => {
          if (!c) return false;
          if (c.id === '00000000-0000-0000-0000-000000000000') return false;
          const nombre = (c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`).toLowerCase();
          return !nombre.includes('plantilla') && !c.es_plantilla;
        });
      };

      let finalClients = filterRealClients(clients);
      if (finalClients.length === 0) {
        try {
          const fetched = await dataService.getClients();
          finalClients = filterRealClients(fetched);
        } catch (e) {
          console.warn('[RegisterPaymentModal] Error cargando clients:', e);
        }
      }

      let finalPlans = trainingPlans && trainingPlans.length > 0 ? trainingPlans : [];
      if (finalPlans.length === 0) {
        try {
          finalPlans = dataService.getTrainingPlans() || DEFAULT_PLANS;
        } catch {
          finalPlans = DEFAULT_PLANS;
        }
      }

      if (!active) return;
      setAvailableClients(finalClients);
      setPlans(finalPlans);
    };

    if (isOpen) {
      initData();
    }

    return () => {
      active = false;
    };
  }, [isOpen, clients, trainingPlans]);

  // 2. Sincronizar formulario con initialClient o selección
  useEffect(() => {
    if (!isOpen) return;

    // Determinar alumno objetivo
    let target = initialClient;
    if (!target && initialClientId && availableClients.length > 0) {
      target = availableClients.find(c => c.id === initialClientId);
    }
    if (!target && availableClients.length > 0) {
      target = availableClients[0];
    }

    setSelectedClient(target || null);

    // Determinar plan inicial
    const currentPlans = plans.length > 0 ? plans : DEFAULT_PLANS;
    let matchedPlan = null;
    if (initialPlanId) {
      matchedPlan = currentPlans.find(p => p.id === initialPlanId || p.nombre === initialPlanId);
    }
    if (!matchedPlan && target?.plan_actual) {
      matchedPlan = currentPlans.find(p => p.nombre === target.plan_actual);
    }
    if (!matchedPlan) {
      matchedPlan = currentPlans[0];
    }

    const defaultPrice = matchedPlan?.precio || 38000;
    const defaultDias = matchedPlan?.dias_vigencia || 30;
    const defaultPlanNombre = target?.plan_actual || matchedPlan?.nombre || 'Plan 3x Semanal Personalizado';

    setPaymentForm({
      client_id: target?.id || '',
      plan_nombre: defaultPlanNombre,
      monto: String(defaultPrice),
      metodo: 'Transferencia',
      dias_vigencia: defaultDias,
      fecha_pago: new Date().toISOString().split('T')[0]
    });
    setErrorMessage('');
  }, [isOpen, initialClient, initialClientId, initialPlanId, availableClients, plans]);

  if (!isOpen) return null;

  // Manejar cambio de alumno en el selector
  const handleClientChange = (clientId) => {
    const found = availableClients.find(c => c.id === clientId);
    setSelectedClient(found || null);

    // Buscar plan que coincida con el plan_actual del alumno
    const currentPlans = plans.length > 0 ? plans : DEFAULT_PLANS;
    const matchedPlan = currentPlans.find(p => p.nombre === found?.plan_actual) || currentPlans[0];

    setPaymentForm(prev => ({
      ...prev,
      client_id: clientId,
      plan_nombre: found?.plan_actual || matchedPlan?.nombre || prev.plan_nombre,
      monto: matchedPlan ? String(matchedPlan.precio) : prev.monto,
      dias_vigencia: matchedPlan ? (matchedPlan.dias_vigencia || 30) : prev.dias_vigencia
    }));
  };

  // Manejar cambio de plan de entrenamiento
  const handlePlanChange = (planNombre) => {
    const currentPlans = plans.length > 0 ? plans : DEFAULT_PLANS;
    const found = currentPlans.find(p => p.nombre === planNombre);

    setPaymentForm(prev => ({
      ...prev,
      plan_nombre: planNombre,
      monto: found ? String(found.precio) : prev.monto,
      dias_vigencia: found ? (found.dias_vigencia || 30) : 30
    }));
  };

  // Regla de negocio de 3 días para vencimiento
  const diasRestantes = calcularDiasParaVencer(selectedClient?.fecha_vencimiento);
  const esPrimerCobro = !selectedClient?.fecha_vencimiento;
  const noHabilitado = !esPrimerCobro && diasRestantes > 3;

  const nuevaFechaCalculada = calcularNuevaFechaVencimiento(
    selectedClient?.fecha_vencimiento,
    paymentForm.dias_vigencia
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!paymentForm.client_id) {
      setErrorMessage('Selecciona un alumno.');
      return;
    }

    if (!paymentForm.monto || parseFloat(paymentForm.monto) <= 0) {
      setErrorMessage('Ingresa un monto válido.');
      return;
    }

    if (noHabilitado) {
      setErrorMessage(`El alumno ya tiene cuota vigente (faltan ${diasRestantes} días). El cobro se habilitará 3 días antes del vencimiento.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dataService.recordClientPayment({
        clientId: paymentForm.client_id,
        planNombre: paymentForm.plan_nombre,
        monto: parseFloat(paymentForm.monto),
        metodo: paymentForm.metodo,
        diasVigencia: parseInt(paymentForm.dias_vigencia, 10) || 30,
        fechaPago: paymentForm.fecha_pago
      });

      if (onPaymentSuccess) {
        await onPaymentSuccess({
          ...result,
          client: selectedClient,
          esPrimerCobro
        });
      }

      onClose();
    } catch (err) {
      console.error('[RegisterPaymentModal] Error al registrar cobro:', err);
      setErrorMessage(err.message || 'Error inesperado al registrar el cobro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = title || (esPrimerCobro ? 'Registrar Primer Cobro' : 'Registrar Cobro de Cuota');
  const modalSubtitle = esPrimerCobro 
    ? 'Habilita el acceso inicial del alumno a su portal y rutinas'
    : 'Actualiza automáticamente el vencimiento y estado a "Al día"';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="pb-3 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              esPrimerCobro 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-brand/15 border-brand/30 text-brand-light'
            }`}>
              {esPrimerCobro ? <Sparkles className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                {modalTitle}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-gray-400">
                {modalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-xs transition-colors"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Tarjeta del alumno si viene preseleccionado */}
        {selectedClient && (
          <div className="mt-3 p-2.5 rounded-xl bg-dark-950/80 border border-dark-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ClientAvatar
                client={selectedClient}
                size="sm"
                className="shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {selectedClient.nombre_completo}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono">
                  {selectedClient.access_code ? `Código: ${selectedClient.access_code}` : selectedClient.telefono || 'Sin código'}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              {esPrimerCobro ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  ⚠️ Sin cuota activa
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  Vence: {formatearFechaPago(selectedClient.fecha_vencimiento)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-2 text-[11px] text-red-300 bg-red-950/50 border border-red-800/40 rounded-lg p-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Form: Ultra-compact 2 Columnas */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
          
          {/* Fila 1: Alumno y Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Alumno a Cobrar *
              </label>
              <select
                value={paymentForm.client_id}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={Boolean(initialClient)}
                className="w-full py-1.5 px-3 text-xs sm:text-sm rounded-lg bg-gray-800/80 border border-gray-700 text-white font-semibold focus:outline-none focus:border-brand disabled:opacity-75 disabled:cursor-not-allowed"
                required
              >
                <option value="">Selecciona alumno...</option>
                {availableClients.map(c => {
                  const dias = calcularDiasParaVencer(c.fecha_vencimiento);
                  const bloq = dias > 3;
                  const labelVenc = !c.fecha_vencimiento 
                    ? '(Sin cuota activa)' 
                    : bloq 
                      ? `(Al día - faltan ${dias} d)` 
                      : `(Por vencer - ${dias} d)`;
                  return (
                    <option 
                      key={c.id} 
                      value={c.id}
                      disabled={bloq && c.id !== initialClient?.id}
                      className={bloq ? 'text-gray-500 bg-gray-900' : 'text-white'}
                    >
                      {c.nombre_completo} {labelVenc}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Plan de Entrenamiento *
              </label>
              <select
                value={paymentForm.plan_nombre}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full py-1.5 px-3 text-xs sm:text-sm rounded-lg bg-gray-800/80 border border-gray-700 text-white font-semibold focus:outline-none focus:border-brand"
                required
              >
                {(plans.length > 0 ? plans : DEFAULT_PLANS).map(p => (
                  <option key={p.id || p.nombre} value={p.nombre}>
                    {p.nombre} (${Number(p.precio).toLocaleString('es-AR')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 2: Monto y Medio de Pago */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Monto (ARS) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  value={paymentForm.monto}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, monto: e.target.value }))}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-gray-800/80 border border-gray-700 text-white font-mono font-bold focus:outline-none focus:border-brand"
                  placeholder="38000"
                  required
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Medio de Pago
              </label>
              <select
                value={paymentForm.metodo}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, metodo: e.target.value }))}
                className="w-full py-1.5 px-3 text-xs sm:text-sm rounded-lg bg-gray-800/80 border border-gray-700 text-white font-medium focus:outline-none focus:border-brand"
              >
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="MercadoPago">Mercado Pago</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>

          {/* Fila 3: Días de Vigencia y Fecha Pago */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Días de Vigencia
              </label>
              <input
                type="number"
                value={paymentForm.dias_vigencia}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, dias_vigencia: e.target.value }))}
                className="w-full py-1.5 px-3 text-xs sm:text-sm rounded-lg bg-gray-800/80 border border-gray-700 text-white font-semibold focus:outline-none focus:border-brand"
                placeholder="30"
                min="1"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                Fecha del Cobro
              </label>
              <input
                type="date"
                value={paymentForm.fecha_pago}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, fecha_pago: e.target.value }))}
                className="w-full py-1.5 px-3 text-xs sm:text-sm rounded-lg bg-gray-800/80 border border-gray-700 text-white font-medium focus:outline-none focus:border-brand"
                required
              />
            </div>
          </div>

          {/* Banner dinámico de estado / vencimiento */}
          {noHabilitado ? (
            <div className="text-[11px] text-amber-300 bg-amber-950/50 border border-amber-600/50 rounded-lg p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                ⚠️ La cuota vence el <b>{formatearFechaPago(selectedClient.fecha_vencimiento, { extendida: true })}</b> (faltan {diasRestantes} días). El cobro se habilitará automáticamente 3 días antes de esa fecha.
              </span>
            </div>
          ) : esPrimerCobro ? (
            <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primer cobro • Acceso activo hasta:</span>
              </span>
              <span className="font-bold text-emerald-200">
                {formatearFechaPago(nuevaFechaCalculada, { extendida: true })}
              </span>
            </div>
          ) : (
            <div className="text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span>Nueva fecha de vencimiento:</span>
              <span className="font-bold text-cyan-200">
                {formatearFechaPago(nuevaFechaCalculada, { extendida: true })}
              </span>
            </div>
          )}

          {/* Advertencia de inmutabilidad */}
          <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 px-1">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>Registro permanente e inmutable una vez confirmado.</span>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 text-xs font-semibold transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || noHabilitado}
              className={`px-4 py-1.5 rounded-lg text-white font-bold text-xs uppercase tracking-wide transition-all shadow-glow-red flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                esPrimerCobro 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50' 
                  : 'bg-brand hover:bg-brand-dark'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  {esPrimerCobro ? <Sparkles className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                  <span>{esPrimerCobro ? 'Registrar Primer Cobro' : 'Registrar Cobro'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
