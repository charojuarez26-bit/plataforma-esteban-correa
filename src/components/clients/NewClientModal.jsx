import React, { useState } from 'react';
import { 
  UserPlus, 
  X, 
  MessageSquare, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';
import ClientPhotoUploader from '../common/ClientPhotoUploader';
import ClientAvatar from '../common/ClientAvatar';

const INITIAL_FORM_DATA = {
  nombre_completo: '',
  telefono: '',
  email: '',
  edad: '',
  altura: '',
  peso_actual: '',
  modalidad: 'Presencial',
  objetivo: 'Reducir % de grasa y ganar fuerza',
  plan_actual: 'Plan 4x Semanal Personalizado',
  dias_por_semana: 3,
  dias_asignados: ['Lunes', 'Miércoles', 'Viernes'],
  tipo_planificacion: 'Semanal',
  duracion_sesion_min: 60
};

export default function NewClientModal({ isOpen, onClose, onClientCreated, onOpenProfile }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdClient, setCreatedClient] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const ALL_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const toggleDay = (day) => {
    let nextDays = [...formData.dias_asignados];
    if (nextDays.includes(day)) {
      if (nextDays.length > 1) {
        nextDays = nextDays.filter(d => d !== day);
      }
    } else {
      nextDays.push(day);
    }
    // Ordenar según ALL_DAYS
    nextDays.sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
    setFormData({
      ...formData,
      dias_asignados: nextDays,
      dias_por_semana: nextDays.length
    });
  };

  // Generador sugerido de código de acceso
  const generateCode = (name) => {
    const initials = name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'EC';

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `${initials}-${randomDigits}`; // 7 caracteres (ej: MG-4821)
  };

  const previewCode = formData.nombre_completo ? generateCode(formData.nombre_completo) : 'EC-7421';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.nombre_completo.trim() || !formData.telefono.trim()) {
      setErrorMessage('El nombre completo y el teléfono son requeridos.');
      return;
    }

    setLoading(true);
    try {
      const code = generateCode(formData.nombre_completo);
      const currentSession = authService.getCurrentSession();
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const coachId = (currentSession?.user?.id && uuidRegex.test(currentSession.user.id))
        ? currentSession.user.id
        : '00000000-0000-0000-0000-000000000001';

      // 1. Subida opcional de foto de perfil a Supabase Storage (bucket 'avatars')
      let uploadedFotoUrl = null;
      if (photoFile) {
        try {
          uploadedFotoUrl = await dataService.uploadClientAvatar(photoFile);
        } catch (uploadErr) {
          console.warn("Excepción al subir foto:", uploadErr);
        }
      }

      // Mapear estrictamente los campos de la tabla clients en Supabase
      const payload = {
        coach_id: coachId,
        nombre_completo: formData.nombre_completo.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email ? formData.email.trim() : null,
        edad: formData.edad ? parseInt(formData.edad, 10) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        peso_actual: formData.peso_actual ? parseFloat(formData.peso_actual) : null,
        modalidad: formData.modalidad || 'Presencial',
        objetivo: (formData.objetivo || 'Acondicionamiento físico general').trim(),
        access_code: code,
        estado: 'Activo',
        foto_url: uploadedFotoUrl
      };

      // Inserción directa en la tabla 'clients' de Supabase
      const { data, error } = await supabase
        .from('clients')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error al guardar alumno en Supabase:", error);
        setErrorMessage(error.message || 'Error al guardar alumno en Supabase');
        alert(`Error al guardar alumno en Supabase: ${error.message}`);
        return;
      }

      // Guardar metadatos adicionales (esquema de días, notas, etc.)
      try {
        const meta = {
          foto_url: uploadedFotoUrl,
          avatar_url: uploadedFotoUrl,
          dias_por_semana: formData.dias_por_semana,
          dias_asignados: formData.dias_asignados,
          tipo_planificacion: formData.tipo_planificacion,
          duracion_sesion_min: formData.duracion_sesion_min,
          plan_actual: formData.plan_actual
        };
        localStorage.setItem(`ec_client_meta_${data.id}`, JSON.stringify(meta));
      } catch (e) {
        // ignore
      }

      // 1. Notificar al componente padre para que refresque la lista real desde Supabase y muestre notificación
      if (onClientCreated) {
        await onClientCreated(data);
      }

      // 2. Limpiar completamente los campos del formulario para no dejar datos residuales
      setFormData(INITIAL_FORM_DATA);
      setPhotoFile(null);
      setPhotoPreview(null);
      setCreatedClient(null);
      setErrorMessage('');

      // 3. Cerrar el modal automáticamente
      onClose();
    } catch (err) {
      console.error("Error al guardar alumno en Supabase:", err);
      setErrorMessage(err.message || 'Error inesperado al guardar alumno');
      alert(`Error al guardar alumno en Supabase: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdClient?.access_code) {
      navigator.clipboard.writeText(createdClient.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Enlace directo de WhatsApp con mensaje personalizado pre-armado
  const getWhatsAppLink = () => {
    if (!createdClient) return '#';
    const cleanPhone = (createdClient.telefono || '').replace(/[^0-9]/g, '');
    const mensaje = `¡Hola ${createdClient.nombre_completo}! 💪 Bienvenido/a a tu entrenamiento con Esteban Correa Personal Trainer.\n\nYa podés ingresar a tu Portal Móvil de alumno sin contraseña usando tu Código Único:\n👉 *${createdClient.access_code}*\n\nAccedé aquí: ${window.location.origin}\n\n"Construí tu mejor versión" 🔥`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
  };

  const handleClose = () => {
    setCreatedClient(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrorMessage('');
    setFormData(INITIAL_FORM_DATA);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
        
        {/* ========================================================= */}
        {/* PANTALLA 2: ÉXITO Y ENVIAR ACCESO POR WHATSAPP             */}
        {/* ========================================================= */}
        {createdClient ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
            <div className="text-center py-2 space-y-4">
              <div className="flex justify-center">
                <ClientAvatar
                  client={createdClient}
                  size="2xl"
                  showStatus={true}
                  status="Activo"
                  className="border-2 border-emerald-500 shadow-xl shadow-emerald-950/40"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">¡Guardado en Supabase!</span>
                <h2 className="text-xl sm:text-2xl font-display font-black text-white mt-1">
                  {createdClient.nombre_completo}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  El alumno fue dado de alta con éxito en tu base de datos.
                </p>
              </div>

              {/* Tarjeta del Código Único */}
              <div className="p-3.5 rounded-xl bg-dark-900 border border-brand/40 text-center space-y-2 relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-widest">
                  Código Único de Acceso Móvil (Sin Contraseña)
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-brand-light tracking-wider">
                    {createdClient.access_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-700 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Copiar código"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  El alumno ingresa con su nombre y este código en su celular.
                </p>
              </div>

              {/* Botón WhatsApp de Acción Principal */}
              <div className="space-y-2.5 pt-2">
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Enviar Acceso por WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      if (onOpenProfile) onOpenProfile(createdClient);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <span>Ver Perfil</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 text-xs font-semibold min-h-[44px]"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* PANTALLA 1: FORMULARIO DE ALTA DE NUEVO CLIENTE           */
          /* ========================================================= */
          <>
            {/* Cabecera fija arriba con botón cerrar */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-700/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Registrar Nuevo Alumno
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Completa los datos técnicos del alumno
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario con cuerpo scrolleable y barra inferior fija */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              
              {/* Cuerpo scrolleable con el pulgar */}
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3.5 pb-3">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block">Error al guardar en Supabase:</span>
                      <span>{errorMessage}</span>
                    </div>
                  </div>
                )}

                {/* FOTO DE PERFIL / CÁMARA */}
                <div className="py-1">
                  <ClientPhotoUploader
                    initialUrl={photoPreview}
                    onPhotoSelected={(file, preview) => {
                      setPhotoFile(file);
                      setPhotoPreview(preview);
                    }}
                    onPhotoRemoved={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofía Ramírez"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                  />
                </div>

                {/* WhatsApp y Email: 1 columna en móvil, 2 en sm: */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                      WhatsApp / Teléfono *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+54 9 11 4433-2211"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="sofia@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Antropometría: Edad, Altura y Peso Inicial */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                      Edad
                    </label>
                    <input
                      type="number"
                      placeholder="26"
                      value={formData.edad}
                      onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      placeholder="168"
                      value={formData.altura}
                      onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 sm:mb-1">
                      Peso Inicial <span className="text-gray-600 font-normal">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="250"
                        name="peso_actual"
                        value={formData.peso_actual}
                        onChange={(e) => setFormData({ ...formData, peso_actual: e.target.value })}
                        placeholder="Ej: 75.5"
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 sm:px-4 pr-10 py-2 sm:py-2 text-base sm:text-sm text-gray-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors placeholder-gray-600 appearance-none min-h-[44px]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium pointer-events-none">kg</span>
                    </div>
                  </div>
                </div>

                {/* Modalidad y Objetivo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                      Modalidad
                    </label>
                    <select
                      value={formData.modalidad}
                      onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                      Objetivo Principal *
                    </label>
                    <select
                      value={formData.objetivo}
                      onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    >
                      <option value="Reducir % de grasa y ganar fuerza">Reducir % de grasa y ganar fuerza</option>
                      <option value="Hipertrofia muscular y volumen limpio">Hipertrofia muscular y volumen limpio</option>
                      <option value="Fuerza máxima y potencia deportiva">Fuerza máxima y potencia deportiva</option>
                      <option value="Recomposición corporal y definición">Recomposición corporal y definición</option>
                      <option value="Acondicionamiento físico general">Acondicionamiento físico general</option>
                    </select>
                  </div>
                </div>

                {/* SECCIÓN PLANIFICACIÓN TEMPORAL Y DÍAS ASIGNADOS */}
                <div className="p-3.5 rounded-xl bg-dark-900/90 border border-dark-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-light flex items-center gap-1.5">
                      🗓️ Planificación de Entrenamiento
                    </span>
                    <span className="text-[11px] text-zinc-400 font-semibold">
                      {formData.dias_asignados.length} días
                    </span>
                  </div>

                  {/* Días Asignados (Toggle interactivo con min-h-[44px]) */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1.5">
                      Días asignados de entrenamiento *
                    </label>
                    <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5">
                      {ALL_DAYS.map((day) => {
                        const isSelected = formData.dias_asignados.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                              isSelected
                                ? 'bg-brand text-white shadow-glow-red scale-[1.02]'
                                : 'bg-dark-800 text-zinc-400 hover:text-white border border-dark-700'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tipo de Planificación y Duración: 1 col móvil, 2 col sm: */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                        Esquema Temporal
                      </label>
                      <select
                        value={formData.tipo_planificacion}
                        onChange={(e) => setFormData({ ...formData, tipo_planificacion: e.target.value })}
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-2.5 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-brand font-medium min-h-[44px]"
                      >
                        <option value="Semanal">Semanal (Fijo por semana)</option>
                        <option value="Mensual">Mensual (Progresión cíclica)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                        Duración Estimada
                      </label>
                      <select
                        value={formData.duracion_sesion_min}
                        onChange={(e) => setFormData({ ...formData, duracion_sesion_min: parseInt(e.target.value) })}
                        className="w-full bg-dark-850 border border-dark-700 rounded-xl px-2.5 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-brand font-medium min-h-[44px]"
                      >
                        <option value="45">45 minutos</option>
                        <option value="60">60 minutos (Estándar)</option>
                        <option value="75">75 minutos</option>
                        <option value="90">90 minutos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Vista previa del Código de Acceso */}
                <div className="p-3 rounded-xl bg-dark-900 border border-dark-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Código Autogenerado</span>
                    <span className="font-mono font-bold text-brand-light text-sm">{previewCode}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">Ingreso sin clave</span>
                </div>
              </div>

              {/* Botones de acción inferiores fijos en móvil y desktop */}
              <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red transition-all flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                >
                  <span>{loading ? 'Guardando...' : 'Guardar Alumno'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  );
}
