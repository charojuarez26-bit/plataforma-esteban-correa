import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Users, 
  Wallet, 
  Receipt,
  Download,
  CreditCard,
  Building2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X
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
  Cell, 
  Legend 
} from 'recharts';
import { supabase, withAuthRetry } from '../../lib/supabaseClient';
import { dataService } from '../../services/dataService';
import { 
  calcularEstadoPago, 
  diasRestantesParaVencimiento, 
  formatearFechaPago
} from '../../utils/paymentUtils';
import ClientAvatar from '../common/ClientAvatar';

// Formateador estándar de moneda argentina ARS
const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

export const formatARS = (amount) => {
  const num = parseFloat(amount) || 0;
  return currencyFormatter.format(num);
};

// Paleta deportiva acorde a la estética dark de Esteban Correa Trainer
const COLORS = {
  red: '#ef4444',       // Rojo deportivo principal
  redDark: '#b91c1c',
  emerald: '#10b981',   // Verde esmeralda para transferencias / al día
  blue: '#3b82f6',      // Azul cian para modalidades online / distancia
  amber: '#f59e0b',     // Ámbar para por vencer / efectivo
  zinc: '#71717a',      // Gris / plata
  darkZinc: '#27272a'
};

export default function FinancesView() {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros de fecha
  const [rangePreset, setRangePreset] = useState('Este mes'); // 'Esta semana' | 'Este mes' | 'Últimos 3 meses' | 'Todo el año' | 'personalizado'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Búsqueda en la tabla de historial
  const [searchQuery, setSearchQuery] = useState('');

  // Estado para modal de confirmación de anulación de cobro
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Cargar datos iniciales
  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // A. Consultar client_payments cruzando con clients
      const { data: pagosData, error: pagosErr } = await withAuthRetry(() =>
        supabase
          .from('client_payments')
          .select(`
            id,
            client_id,
            monto,
            fecha_pago,
            metodo_pago,
            periodo_desde,
            periodo_hasta,
            fecha_vencimiento,
            notas,
            clients (
              id,
              nombre_completo,
              plan_id,
              plan_actual,
              fecha_vencimiento,
              estado,
              modalidad
            )
          `)
          .order('fecha_pago', { ascending: false })
      );

      if (pagosErr) {
        console.warn('[FinancesView] Error al consultar client_payments:', pagosErr);
      }

      // B. Consultar todos los clientes activos y planes
      const [allClients, plansRes] = await Promise.all([
        dataService.getClients(),
        withAuthRetry(() => supabase.from('membership_plans').select('*'))
      ]);

      // Filtrar clientes plantilla de los pagos y de la lista de clientes
      const validClients = (allClients || []).filter(c => {
        const nombre = (c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`).toLowerCase();
        return c.id !== '00000000-0000-0000-0000-000000000000' && !nombre.includes('plantilla') && !c.es_plantilla && !c.is_template;
      });
      setClients(validClients);

      if (plansRes?.data && plansRes.data.length > 0) {
        setMembershipPlans(plansRes.data);
      } else {
        setMembershipPlans([]);
      }

      // Normalizar pagos para visualización fluida
      const normalizedPayments = (pagosData || []).map(p => {
        const clientObj = p.clients || {};
        const alumnoNombre = clientObj.nombre_completo || 'Alumno';
        const planNombre = p.notas || clientObj.plan_actual || 'Sin plan asignado';
        const metodo = p.metodo_pago || 'Transferencia';
        const vto = p.fecha_vencimiento || p.periodo_hasta || clientObj.fecha_vencimiento || null;

        return {
          id: p.id,
          client_id: p.client_id,
          alumno_nombre: alumnoNombre,
          monto: parseFloat(p.monto) || 0,
          fecha_pago: p.fecha_pago || '',
          metodo: metodo,
          plan_nombre: planNombre,
          fecha_vencimiento: vto,
          notas: p.notas || '-',
          rawClient: clientObj
        };
      });

      setPayments(normalizedPayments);
    } catch (err) {
      console.error('[FinancesView] Excepción cargando datos financieros:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  // 2. Manejo de Presets de Rango de Fecha
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (rangePreset === 'Esta semana') {
      const d = new Date(now);
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      setDateFrom(monday.toISOString().split('T')[0]);
      setDateTo(sunday.toISOString().split('T')[0]);
    } else if (rangePreset === 'Este mes') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);

      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (rangePreset === 'Últimos 3 meses') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (rangePreset === 'Todo el año') {
      const y = now.getFullYear();
      setDateFrom(`${y}-01-01`);
      setDateTo(`${y}-12-31`);
    }
  }, [rangePreset]);

  // Manejo cuando el usuario edita manualmente los inputs de fecha
  const handleCustomDateChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
    setRangePreset('personalizado');
  };

  // 3. Pagos Filtrados por Rango de Fechas
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!p.fecha_pago) return false;
      if (dateFrom && p.fecha_pago < dateFrom) return false;
      if (dateTo && p.fecha_pago > dateTo) return false;
      return true;
    });
  }, [payments, dateFrom, dateTo]);

  // Función para anular/eliminar cobro erróneo y revertir estado/vencimiento del alumno
  const handleConfirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsDeletingPayment(true);
    const { id: pagoId, client_id: clientId, alumno_nombre: alumnoNombre, monto } = paymentToDelete;

    try {
      // 1. Eliminar el registro en Supabase
      const { error: delErr } = await supabase
        .from('client_payments')
        .delete()
        .eq('id', pagoId);

      if (delErr) throw delErr;

      // 2. Buscar el último pago restante de ese alumno en client_payments
      const { data: remainingPays, error: remErr } = await supabase
        .from('client_payments')
        .select('id, fecha_pago, fecha_vencimiento, periodo_hasta')
        .eq('client_id', clientId)
        .order('fecha_pago', { ascending: false })
        .limit(1);

      if (remErr) {
        console.warn('[FinancesView] Error consultando pagos restantes:', remErr);
      }

      let newVencimiento = null;
      let newEstadoPago = 'vencido';

      if (remainingPays && remainingPays.length > 0) {
        // 3. Si existe un pago anterior: actualiza con la fecha de ese pago anterior
        const lastPay = remainingPays[0];
        newVencimiento = lastPay.fecha_vencimiento || lastPay.periodo_hasta || lastPay.fecha_pago;
        newEstadoPago = calcularEstadoPago(newVencimiento);
      } else {
        // 4. Si no quedan más pagos para ese alumno: fecha_vencimiento = null y estado_pago = 'vencido'
        newVencimiento = null;
        newEstadoPago = 'vencido';
      }

      // Actualizar en clients
      await dataService.updateClient(clientId, {
        fecha_vencimiento: newVencimiento,
        estado_pago: newEstadoPago
      });

      // 5. Recalcular de inmediato métricas filtrando el registro del estado local
      setPayments(prev => prev.filter(p => p.id !== pagoId));
      setClients(prev => prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            fecha_vencimiento: newVencimiento,
            estado_pago: newEstadoPago
          };
        }
        return c;
      }));

      showToast(`Cobro de ${formatARS(monto)} de ${alumnoNombre} anulado. Vencimiento revertido.`);
      setPaymentToDelete(null);
    } catch (err) {
      console.error('[FinancesView] Error anulando cobro:', err);
      showToast('No se pudo anular el cobro: ' + (err.message || 'Error de base de datos'), true);
    } finally {
      setIsDeletingPayment(false);
    }
  };

  // 4. Obtener el último importe real registrado para un alumno
  const getLastClientPaymentAmount = (clientId) => {
    if (!clientId) return 0;
    const clientPay = payments.find(p => p.client_id === clientId && p.monto > 0);
    return clientPay ? clientPay.monto : 0;
  };

  // 5. CÁLCULO DE KPIS
  const kpis = useMemo(() => {
    // A. Ingresos del Período Filtrado
    const totalPeriodo = filteredPayments.reduce((acc, p) => acc + (p.monto || 0), 0);

    // B. Ingresos Esta Semana (Lunes a Domingo actual en tiempo real)
    const now = new Date();
    const d = new Date(now);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const monStr = monday.toISOString().split('T')[0];
    const sunStr = sunday.toISOString().split('T')[0];

    const totalEstaSemana = payments
      .filter(p => p.fecha_pago >= monStr && p.fecha_pago <= sunStr)
      .reduce((acc, p) => acc + (p.monto || 0), 0);

    // C. Proyección Mensual basada en los últimos cobros reales de cada alumno activo
    const activeClients = clients.filter(c => (c.estado || 'Activo').toLowerCase() === 'activo');
    const proyeccionMensual = activeClients.reduce((acc, c) => {
      return acc + getLastClientPaymentAmount(c.id);
    }, 0);

    // D. Por Cobrar / Vencido (Monto de cuota habitual de alumnos con cuota vencida o por vencer)
    const porCobrarVencido = activeClients.reduce((acc, c) => {
      const estado = calcularEstadoPago(c);
      if (estado === 'vencido' || estado === 'por_vencer' || estado === 'pendiente') {
        return acc + getLastClientPaymentAmount(c.id);
      }
      return acc;
    }, 0);

    return {
      totalPeriodo,
      totalEstaSemana,
      proyeccionMensual,
      porCobrarVencido,
      activeClientsCount: activeClients.length
    };
  }, [filteredPayments, payments, clients]);

  // 6. DATOS PARA GRÁFICOS

  // Gráfico 1: Evolución de Ingresos (Barras Cronológicas agrupadas)
  const chartEvolucion = useMemo(() => {
    if (filteredPayments.length === 0) {
      return [];
    }

    // Agrupar por mes o por fecha si el rango es corto
    const isYearOrQuarter = rangePreset === 'Todo el año' || rangePreset === 'Últimos 3 meses';

    if (isYearOrQuarter) {
      const monthMap = {};
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      filteredPayments.forEach(p => {
        if (!p.fecha_pago) return;
        const [year, month] = p.fecha_pago.split('-');
        const key = `${monthNames[parseInt(month, 10) - 1]} ${year.slice(2)}`;
        monthMap[key] = (monthMap[key] || 0) + p.monto;
      });

      return Object.entries(monthMap).map(([periodo, ingresos]) => ({ periodo, ingresos }));
    }

    // Agrupación por días o semanas
    const dayMap = {};
    filteredPayments.slice().reverse().forEach(p => {
      const key = p.fecha_pago.slice(5); // MM-DD
      dayMap[key] = (dayMap[key] || 0) + p.monto;
    });

    return Object.entries(dayMap).map(([periodo, ingresos]) => ({ periodo, ingresos }));
  }, [filteredPayments, rangePreset]);

  // Gráfico 2: Torta / Donut por Tipo de Plan (Presencial, Personalizado, A distancia)
  const chartPlanes = useMemo(() => {
    let presencial = 0;
    let personalizado = 0;
    let distancia = 0;
    let otros = 0;

    filteredPayments.forEach(p => {
      const plan = (p.plan_nombre || '').toLowerCase();
      if (plan.includes('presencial')) {
        presencial += p.monto;
      } else if (plan.includes('personalizado')) {
        personalizado += p.monto;
      } else if (plan.includes('distancia') || plan.includes('online')) {
        distancia += p.monto;
      } else {
        otros += p.monto;
      }
    });

    // Si aún no hay pagos en el período, calcular distribución según cobros habituales de alumnos activos
    if (presencial === 0 && personalizado === 0 && distancia === 0 && otros === 0) {
      clients.forEach(c => {
        const plan = (c.plan_actual || '').toLowerCase();
        const price = getLastClientPaymentAmount(c.id);
        if (price > 0) {
          if (plan.includes('presencial')) presencial += price;
          else if (plan.includes('personalizado')) personalizado += price;
          else if (plan.includes('distancia') || plan.includes('online')) distancia += price;
          else otros += price;
        }
      });
    }

    const total = presencial + personalizado + distancia + otros;
    if (total === 0) return [];

    return [
      { name: 'Presencial', value: presencial, color: COLORS.red },
      { name: 'Personalizado', value: personalizado, color: COLORS.emerald },
      { name: 'A distancia', value: distancia, color: COLORS.blue },
      ...(otros > 0 ? [{ name: 'Otros', value: otros, color: COLORS.amber }] : [])
    ].filter(item => item.value > 0);
  }, [filteredPayments, clients]);

  // Gráfico 3: Distribución por Método de Pago (Efectivo vs Transferencia / MP)
  const chartMetodos = useMemo(() => {
    let transferencia = 0;
    let efectivo = 0;
    let otros = 0;

    filteredPayments.forEach(p => {
      const met = (p.metodo || '').toLowerCase();
      if (met.includes('transf') || met.includes('mercado') || met.includes('mp')) {
        transferencia += p.monto;
      } else if (met.includes('efectivo')) {
        efectivo += p.monto;
      } else {
        otros += p.monto;
      }
    });

    const total = transferencia + efectivo + otros;
    if (total === 0) {
      return [
        { name: 'Transferencia / MP', value: 1, color: COLORS.emerald, displayValue: 0 },
        { name: 'Efectivo', value: 0, color: COLORS.amber, displayValue: 0 }
      ];
    }

    return [
      { name: 'Transferencia / MP', value: transferencia, color: COLORS.emerald, displayValue: transferencia },
      { name: 'Efectivo', value: efectivo, color: COLORS.amber, displayValue: efectivo },
      ...(otros > 0 ? [{ name: 'Otros', value: otros, color: COLORS.blue, displayValue: otros }] : [])
    ].filter(i => i.value > 0);
  }, [filteredPayments]);

  // 7. PANEL DE PRÓXIMOS VENCIMIENTOS (Próximos 10 días)
  const proximosVencimientos = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return clients
      .filter(c => {
        if (!c.fecha_vencimiento) return false;
        if ((c.estado || '').toLowerCase() === 'inactivo') return false;

        const diffDias = diasRestantesParaVencimiento(c.fecha_vencimiento);
        // Mostrar los que vencen en los próximos 10 días o los que vencieron recientemente (últimos 3 días)
        return diffDias !== null && diffDias <= 10 && diffDias >= -3;
      })
      .map(c => {
        const diffDias = diasRestantesParaVencimiento(c.fecha_vencimiento);
        const valorCuota = getPriceForPlan(c.plan_actual);
        return {
          id: c.id,
          nombre_completo: c.nombre_completo,
          plan_actual: c.plan_actual || 'Presencial',
          fecha_vencimiento: c.fecha_vencimiento,
          diffDias,
          valorCuota,
          client: c
        };
      })
      .sort((a, b) => a.diffDias - b.diffDias);
  }, [clients]);

  // 8. Historial Filtrado con Búsqueda Rápida
  const searchedPayments = useMemo(() => {
    if (!searchQuery.trim()) return filteredPayments;
    const q = searchQuery.toLowerCase();
    return filteredPayments.filter(p => 
      p.alumno_nombre.toLowerCase().includes(q) ||
      p.plan_nombre.toLowerCase().includes(q) ||
      p.metodo.toLowerCase().includes(q) ||
      (p.notas && p.notas.toLowerCase().includes(q))
    );
  }, [filteredPayments, searchQuery]);

  return (
    <div className="space-y-6 pb-24 md:pb-8 text-gray-100">
      
      {/* ========================================================== */}
      {/* 1. ENCABEZADO Y ACCIONES RÁPIDAS */}
      {/* ========================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-950/50">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
                Módulo de Finanzas
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Control de ingresos, proyecciones teóricas y gestión de cobros en tiempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              loadFinancialData();
            }}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700 text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Recargar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-light ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white text-xs font-bold shadow-glow-red transition-all flex items-center gap-2 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Balance</span>
            <span className="sm:hidden">Exportar</span>
          </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 2. BARRA DE FILTROS SUPERIOR */}
      {/* ========================================================== */}
      <div className="card-dark rounded-2xl p-4 border border-[#1f1e24] space-y-3.5 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Selector de Presets de Rango */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-brand" /> Período:
            </span>
            {['Esta semana', 'Este mes', 'Últimos 3 meses', 'Todo el año'].map((preset) => (
              <button
                key={preset}
                onClick={() => setRangePreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  rangePreset === preset
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-950/40'
                    : 'bg-dark-850 hover:bg-dark-800 text-gray-400 hover:text-gray-200 border border-dark-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Inputs de Fecha Personalizados */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-700 px-3 py-1.5 rounded-xl">
              <span className="text-gray-400 font-semibold">Desde:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleCustomDateChange(e.target.value, dateTo)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-700 px-3 py-1.5 rounded-xl">
              <span className="text-gray-400 font-semibold">Hasta:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleCustomDateChange(dateFrom, e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 3. TARJETAS KPI (Métricas en tiempo real) */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Ingresos del Período */}
        <div className="card-dark rounded-2xl p-5 border border-[#1f1e24] relative overflow-hidden group hover:border-red-900/50 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos del Período</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-brand">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
            {formatARS(kpis.totalPeriodo)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="text-emerald-400 font-bold">{filteredPayments.length} cobros</span>
            <span>en el rango filtrado</span>
          </div>
        </div>

        {/* KPI 2: Ingresos Esta Semana */}
        <div className="card-dark rounded-2xl p-5 border border-[#1f1e24] relative overflow-hidden group hover:border-emerald-900/50 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos Esta Semana</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
            {formatARS(kpis.totalEstaSemana)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="text-emerald-400 font-bold">Lun - Dom</span>
            <span>semana en curso</span>
          </div>
        </div>

        {/* KPI 3: Proyección Mensual Teórica */}
        <div className="card-dark rounded-2xl p-5 border border-[#1f1e24] relative overflow-hidden group hover:border-blue-900/50 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Proyección Mensual</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
            {formatARS(kpis.proyeccionMensual)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="text-blue-400 font-bold">{kpis.activeClientsCount} activos</span>
            <span>potencial si abonan todos</span>
          </div>
        </div>

        {/* KPI 4: Por Cobrar / Vencido */}
        <div className="card-dark rounded-2xl p-5 border border-[#1f1e24] relative overflow-hidden group hover:border-amber-900/50 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Por Cobrar / Vencido</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-amber-400 tracking-tight">
            {formatARS(kpis.porCobrarVencido)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="text-amber-400 font-bold">Cuotas pendientes</span>
            <span>por vencer o vencidas</span>
          </div>
        </div>

      </div>

      {/* ========================================================== */}
      {/* 4. ÁREA DE GRÁFICOS ANALÍTICOS (Recharts) */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfico 1: Evolución de Ingresos (Barras) - Columna 7 */}
        <div className="lg:col-span-7 card-dark rounded-2xl p-5 sm:p-6 border border-[#1f1e24] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand" />
                Evolución de Ingresos
              </h2>
              <p className="text-xs text-gray-400">Recaudación acumulada según el período filtrado</p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-brand-light border border-red-500/20">
              {rangePreset}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartEvolucion} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                  dataKey="periodo" 
                  stroke="#71717a" 
                  fontSize={11}
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(239, 68, 68, 0.08)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#121217] border border-dark-700 p-2.5 rounded-xl shadow-xl text-xs">
                          <p className="text-gray-400 font-bold mb-1">{label}</p>
                          <p className="text-white font-black text-sm">
                            {formatARS(payload[0].value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="ingresos" 
                  fill={COLORS.red} 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2 y 3: Torta / Donut Distribuciones - Columna 5 */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          
          {/* Distribución por Tipo de Plan */}
          <div className="card-dark rounded-2xl p-5 border border-[#1f1e24] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-brand-light" />
                Ingresos por Plan
              </h3>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Proporción</span>
            </div>

            <div className="h-44 w-full relative flex items-center justify-center">
              {chartPlanes.length === 0 ? (
                <p className="text-xs text-gray-500">Sin datos de planes</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartPlanes}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartPlanes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          return (
                            <div className="bg-[#121217] border border-dark-700 p-2 rounded-xl text-xs">
                              <span className="font-bold text-gray-300">{item.name}: </span>
                              <span className="font-black text-white">{formatARS(item.value)}</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Leyenda de Planes */}
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2 border-t border-dark-800 text-[11px]">
              {chartPlanes.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-gray-300 font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribución por Método de Pago */}
          <div className="card-dark rounded-2xl p-5 border border-[#1f1e24] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Métodos de Pago
              </h3>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Transferencia vs Efectivo</span>
            </div>

            <div className="space-y-3 pt-2">
              {chartMetodos.map((m) => {
                const total = chartMetodos.reduce((a, b) => a + (b.displayValue || 0), 0) || 1;
                const percent = Math.round(((m.displayValue || 0) / total) * 100);

                return (
                  <div key={m.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-300">{m.name}</span>
                      <span className="font-bold text-white">{formatARS(m.displayValue || 0)} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%`, backgroundColor: m.color }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================== */}
      {/* 5. PANEL DE PRÓXIMOS VENCIMIENTOS (Informativo - 10 Días) */}
      {/* ========================================================== */}
      <div className="card-dark rounded-2xl border border-[#1f1e24] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#24222a] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Próximos Vencimientos (Próximos 10 días)
            </h2>
            <p className="text-xs text-gray-400">
              Alumnos con fecha de corte cercana que requieren renovación de cuota.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {proximosVencimientos.length} alertas
          </span>
        </div>

        {proximosVencimientos.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            No hay cuotas programadas para vencer en los próximos 10 días. Todos los alumnos están al día.
          </div>
        ) : (
          <div className="divide-y divide-[#1f1e24] max-h-72 overflow-y-auto">
            {proximosVencimientos.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-dark-850/40 transition-colors">
                <div className="flex items-center gap-3">
                  <ClientAvatar client={item.client} size="sm" rounded="rounded-full" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.nombre_completo}</h4>
                    <span className="text-xs text-gray-400">{item.plan_actual}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Vencimiento:</span>
                    <span className="font-semibold text-white">
                      {formatearFechaPago(item.fecha_vencimiento, { extendida: true })}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-gray-400 block text-[11px]">Valor de Cuota:</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {formatARS(item.valorCuota)}
                    </span>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.diffDias <= 0
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : item.diffDias <= 3
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {item.diffDias < 0 ? `Venció hace ${Math.abs(item.diffDias)}d` : item.diffDias === 0 ? 'Vence hoy' : `En ${item.diffDias} días`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 6. TABLA DETALLADA DE HISTORIAL DE COBROS */}
      {/* ========================================================== */}
      <div className="card-dark rounded-2xl border border-[#1f1e24] overflow-hidden">
        
        {/* Cabecera de la tabla y barra de búsqueda */}
        <div className="p-4 sm:p-5 border-b border-[#24222a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand" />
              Historial Detallado de Recaudación
            </h2>
            <p className="text-xs text-gray-400">
              Registros históricos sincronizados con la tabla client_payments de Supabase.
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por alumno, plan..."
              className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Tabla responsive con scroll horizontal */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e0d11] text-gray-400 uppercase text-[10px] tracking-wider border-b border-dark-700/80">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">Modalidad / Plan</th>
                <th className="py-3 px-4 font-right">Monto ($)</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Notas / Detalle</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1e24] text-gray-300">
              {searchedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 text-xs">
                    No se encontraron pagos registrados en este período.
                  </td>
                </tr>
              ) : (
                searchedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#15141b]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-300 whitespace-nowrap">
                      {formatearFechaPago(p.fecha_pago)}
                    </td>
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {p.alumno_nombre}
                    </td>
                    <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-dark-900 border border-dark-700 text-[11px] font-semibold text-gray-300">
                        {p.plan_nombre}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-emerald-400 whitespace-nowrap">
                      {formatARS(p.monto)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        (p.metodo || '').toLowerCase().includes('efectivo')
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {p.metodo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 max-w-[200px] truncate">
                      {p.notas}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPaymentToDelete(p)}
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-all border border-red-500/20 active:scale-95 inline-flex items-center gap-1 text-[11px]"
                        title="Anular cobro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Anular</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de la tabla con totalizador */}
        {searchedPayments.length > 0 && (
          <div className="p-4 bg-[#0e0d11] border-t border-[#1f1e24] flex items-center justify-between text-xs text-gray-400">
            <span>Mostrando {searchedPayments.length} registros</span>
            <span className="font-bold text-white">
              Total acumulado: <span className="text-emerald-400 font-mono font-black">{formatARS(searchedPayments.reduce((a, b) => a + b.monto, 0))}</span>
            </span>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 7. MODAL DE CONFIRMACIÓN: ANULAR COBRO */}
      {/* ========================================================== */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-dark-900 border border-red-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-white">Confirmar Anulación de Cobro</h3>
                <p className="text-xs text-gray-400 mt-0.5">Esta acción es destructiva e impactará en el balance de caja.</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white bg-dark-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-700 text-xs text-gray-300 leading-relaxed space-y-2">
              <p>
                ¿Estás seguro de anular este cobro de <strong className="text-emerald-400 font-mono font-black">{formatARS(paymentToDelete.monto)}</strong> de <strong className="text-white">{paymentToDelete.alumno_nombre}</strong>?
              </p>
              <p className="text-[11px] text-amber-300/90 border-t border-dark-800 pt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                Esta acción descontará el monto de la caja y revertirá la fecha de vencimiento del alumno al cobro anterior.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingPayment}
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white bg-dark-800 text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPayment}
                onClick={handleConfirmDeletePayment}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-glow-red disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingPayment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Anulando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Anulación</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Flotante */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 ${
          toastMessage.isError 
            ? 'bg-red-600 text-white border-red-400/40' 
            : 'bg-emerald-600 text-white border-emerald-400/40'
        }`}>
          {toastMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
}
