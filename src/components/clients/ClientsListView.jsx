import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  Sparkles, 
  Filter, 
  Dumbbell, 
  Target, 
  CreditCard,
  DollarSign,
  MessageSquare,
  AlertCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import ClientAvatar from '../common/ClientAvatar';
import { formatearFechaPago } from '../../utils/paymentUtils';

export default function ClientsListView({ 
  clients, 
  onSelectClient, 
  isNewClientModalOpen, 
  onOpenModal, 
  onEditClient,
  onDeleteClient,
  onRegisterPayment,
  onCloseModal, 
  onCreateClient 
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos'); // 'Todos' | 'Activo' | 'Inactivo'
  const [viewStyle, setViewStyle] = useState('grid'); // 'grid' | 'table'

  // Formulario nuevo cliente
  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    edad: '',
    altura: '',
    modalidad: 'Presencial',
    objetivo: '',
    plan_actual: 'Plan 4x Semanal Personalizado',
    notas: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre_completo || !formData.telefono) return;

    onCreateClient(formData);
    setFormData({
      nombre_completo: '',
      telefono: '',
      email: '',
      edad: '',
      altura: '',
      modalidad: 'Presencial',
      objetivo: '',
      plan_actual: 'Plan 4x Semanal Personalizado',
      notas: ''
    });
  };

  // Generador sugerido de código de acceso
  const previewInitials = formData.nombre_completo
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'EC';

  const filteredClients = clients.filter((c) => {
    if (!c) return false;
    if (c.id === '00000000-0000-0000-0000-000000000000') return false;
    const fullName = (c.nombre_completo || '').toLowerCase();
    if (fullName.includes('plantilla') || c.es_plantilla) return false;

    const matchesSearch = 
      fullName.includes(search.toLowerCase()) ||
      (c.access_code && c.access_code.toLowerCase().includes(search.toLowerCase())) ||
      (c.objetivo && c.objetivo.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = 
      filterStatus === 'Todos' || 
      (filterStatus === 'Activo' && c.estado === 'Activo') ||
      (filterStatus === 'Inactivo' && (c.estado === 'Inactivo' || c.estado === 'Pausado'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* 1. BARRA SUPERIOR CON ACCIONES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand" />
            Directorio de Alumnos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Base de datos sincronizada con Supabase • {clients.length} alumnos registrados
          </p>
        </div>

        <button
          onClick={onOpenModal}
          className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Nuevo Alumno</span>
        </button>
      </div>

      {/* 2. FILTROS Y BUSCADOR (Visible si hay alumnos o para buscar) */}
      {clients.length > 0 && (
        <div className="card-dark rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Buscador por Nombre, Código u Objetivo */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, código de acceso (ej: MG-4821) u objetivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 pl-10 focus:outline-none focus:border-brand"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          </div>

          {/* Filtros por Estado */}
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-dark-900 border border-dark-700 rounded-xl text-xs font-semibold">
              {['Todos', 'Activo', 'Inactivo'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterStatus === st
                      ? 'bg-brand text-white shadow-sm font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Toggle Grid / Tabla */}
            <div className="hidden sm:flex p-1 bg-dark-900 border border-dark-700 rounded-xl text-xs">
              <button
                onClick={() => setViewStyle('grid')}
                className={`px-2.5 py-1.5 rounded-lg ${viewStyle === 'grid' ? 'bg-dark-800 text-white font-bold' : 'text-gray-400'}`}
                title="Vista en Cuadrícula"
              >
                Tarjetas
              </button>
              <button
                onClick={() => setViewStyle('table')}
                className={`px-2.5 py-1.5 rounded-lg ${viewStyle === 'table' ? 'bg-dark-800 text-white font-bold' : 'text-gray-400'}`}
                title="Vista en Tabla"
              >
                Tabla
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 3. MANEJO DE ESTADO VACÍO (EMPTY STATE DE LA TABLA CLIENTS) */}
      {clients.length === 0 ? (
        <div className="card-dark rounded-2xl p-10 sm:p-16 text-center space-y-4 border border-white/5 shadow-xl max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 text-brand flex items-center justify-center mx-auto shadow-lg shadow-brand/10">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Aún no tienes alumnos registrados.
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
              Haz clic en '+ Nuevo Alumno' para comenzar a cargar tu base de alumnos.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenModal}
              className="px-5 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Alumno</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* VISTA EN CUADRÍCULA (GRID DE CLIENTES) */}
          {viewStyle === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const cleanPhone = (client.telefono || '').replace(/[^0-9]/g, '');
                return (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="card-dark rounded-2xl p-5 card-dark-hover cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden transition-all duration-200 border border-white/5 hover:border-brand/40 shadow-lg"
                  >
                    {/* Badge de estado en la esquina superior derecha */}
                    <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex flex-col items-end gap-1.5 z-10">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-colors ${
                          client.estado === 'Activo'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {client.estado || 'Activo'}
                      </span>
                      {!client.fecha_vencimiento ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1">
                          <span>⚠️</span> Sin cuota activa
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-dark-900/90 text-zinc-300 border border-dark-700 shadow-sm">
                          Vence: {formatearFechaPago(client.fecha_vencimiento)}
                        </span>
                      )}
                    </div>

                    <div>
                      {/* Fila superior: Foto fija + Datos personales con espacio holgado */}
                      <div className="flex items-start gap-4 pr-18 sm:pr-20">
                        {/* Foto de perfil fija con iniciales dinámicas y estado */}
                        <ClientAvatar
                          client={client}
                          size="xl"
                          showStatus={true}
                          status={client.estado}
                          className="group-hover:scale-105 transition-transform"
                        />

                        {/* Contenedor flexible para nombre y teléfono sin truncamientos forzados */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className="font-bold text-lg text-white leading-tight break-words whitespace-normal group-hover:text-brand-light transition-colors">
                            {client.nombre_completo}
                          </h3>

                          {/* Teléfono prolijo en una sola línea con enlace directo a WhatsApp */}
                          <div className="mt-2">
                            <a
                              href={`https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(client.nombre_completo)}!`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-zinc-400 hover:text-emerald-400 transition-colors group/tel"
                              title="Abrir chat de WhatsApp"
                            >
                              <span className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover/tel:bg-emerald-500 group-hover/tel:text-white transition-colors shrink-0">
                                <Phone className="w-3 h-3" />
                              </span>
                              <span className="font-medium tracking-tight hover:underline">
                                {client.telefono || 'Sin teléfono'}
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Objetivo y Plan */}
                      <div className="mt-4 space-y-2.5 pt-3.5 border-t border-dark-700/60">
                        {/* Objetivo */}
                        <div className="flex items-start gap-2 text-zinc-300">
                          <Target className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                          <span className="text-xs text-zinc-300 leading-snug font-medium line-clamp-2">
                            {client.objetivo || 'Acondicionamiento físico general'}
                          </span>
                        </div>

                        {/* Estado de Rutina y Modalidad */}
                        <div className="flex items-center justify-between gap-2 text-xs pt-1">
                          {client.rutina_activa ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand/10 border border-brand/20 text-brand-light font-medium truncate max-w-[70%]" title={client.rutina_activa}>
                              <Dumbbell className="w-3.5 h-3.5 text-brand shrink-0" />
                              <span className="truncate">{client.rutina_activa}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-semibold text-[11px] shrink-0">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Sin Rutina Asignada</span>
                            </div>
                          )}
                          
                          <span className="px-2.5 py-1 rounded-lg bg-[#1f1f28] border border-white/5 text-zinc-300 font-semibold text-[11px] shrink-0">
                            {client.modalidad || 'Presencial'}
                          </span>
                        </div>

                        {/* Botón Acción Rápida: Registrar Primer Cobro */}
                        {!client.fecha_vencimiento && onRegisterPayment && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRegisterPayment(client);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm group/btn"
                            >
                              <DollarSign className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                              <span>Registrar Primer Cobro</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer de la tarjeta con Access Code */}
                    <div className="pt-3.5 border-t border-dark-700/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Código Móvil:</span>
                        <span className="font-mono text-xs font-black text-brand-light bg-brand/15 px-2.5 py-1 rounded-lg border border-brand/30 shadow-sm tracking-wide">
                          {client.access_code || 'SIN CÓDIGO'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onEditClient && (
                          <button
                            type="button"
                            title="Editar alumno"
                            aria-label={`Editar a ${client.nombre_completo}`}
                            onClick={(e) => { e.stopPropagation(); onEditClient(client); }}
                            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteClient && (
                          <button
                            type="button"
                            title="Eliminar alumno"
                            aria-label={`Eliminar a ${client.nombre_completo}`}
                            onClick={(e) => { e.stopPropagation(); onDeleteClient(client); }}
                            className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClient(client);
                        }}
                        className="text-xs text-zinc-400 group-hover:text-brand-light flex items-center gap-1 font-bold transition-colors hover:text-white py-1 px-2 rounded-lg hover:bg-white/5"
                      >
                        <span>Ver Perfil</span>
                        <ChevronRight className="w-4 h-4 text-brand group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA EN TABLA */
            <div className="card-dark rounded-2xl p-4 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-900 text-gray-400 uppercase text-[10px] border-b border-dark-700">
                  <tr>
                    <th className="py-3 px-3">Alumno</th>
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Teléfono</th>
                    <th className="py-3 px-3">Modalidad</th>
                    <th className="py-3 px-3">Objetivo</th>
                    <th className="py-3 px-3">Rutina Asignada</th>
                    <th className="py-3 px-3">Estado / Cuota</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/60 text-gray-300">
                  {filteredClients.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => onSelectClient(c)}
                      className="hover:bg-dark-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <ClientAvatar 
                          client={c}
                          size="sm"
                        />
                        <span>{c.nombre_completo}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-brand-light">{c.access_code}</td>
                      <td className="py-3 px-3">
                        <a
                          href={`https://wa.me/${(c.telefono || '').replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(c.nombre_completo)}!`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-emerald-400 hover:underline flex items-center gap-1.5 transition-colors"
                          title="Chatear por WhatsApp"
                        >
                          <Phone className="w-3 h-3 text-brand" />
                          <span>{c.telefono}</span>
                        </a>
                      </td>
                      <td className="py-3 px-3">{c.modalidad}</td>
                      <td className="py-3 px-3 truncate max-w-[180px]">{c.objetivo}</td>
                      <td className="py-3 px-3">
                        {c.rutina_activa ? (
                          <span className="text-xs font-bold text-brand-light flex items-center gap-1">
                            <Dumbbell className="w-3.5 h-3.5 text-brand shrink-0" />
                            <span className="truncate max-w-[150px]">{c.rutina_activa}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                            Sin Rutina
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            c.estado === 'Activo'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {c.estado}
                          </span>
                          {!c.fecha_vencimiento ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap flex items-center gap-1">
                              <span>⚠️</span> Sin cuota activa
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-400/90 whitespace-nowrap">
                              Al día ({formatearFechaPago(c.fecha_vencimiento)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!c.fecha_vencimiento && onRegisterPayment && (
                            <button
                              type="button"
                              title="Registrar primer cobro"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRegisterPayment(c);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40 font-bold text-[11px] transition-all flex items-center gap-1 whitespace-nowrap shadow-sm"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Cobrar</span>
                            </button>
                          )}
                          {onEditClient && (
                            <button type="button" title="Editar alumno" aria-label={`Editar a ${c.nombre_completo}`}
                              onClick={(e) => { e.stopPropagation(); onEditClient(c); }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5">
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteClient && (
                            <button type="button" title="Eliminar alumno" aria-label={`Eliminar a ${c.nombre_completo}`}
                              onClick={(e) => { e.stopPropagation(); onDeleteClient(c); }}
                              className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <span className="text-xs text-brand-light font-bold hover:underline pl-1">
                            Abrir &rarr;
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredClients.length === 0 && (
            <div className="card-dark rounded-2xl p-12 text-center text-gray-500 text-sm space-y-2">
              <Users className="w-10 h-10 mx-auto text-dark-600 mb-1" />
              <p className="text-white font-bold">No se encontraron alumnos con esos filtros.</p>
              <p className="text-xs text-gray-400">Intenta buscar por otro nombre o código.</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
