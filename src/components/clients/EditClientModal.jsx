import React, { useState, useEffect } from 'react';
import { X, Pencil, Save, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dataService } from '../../services/dataService';
import ClientPhotoUploader from '../common/ClientPhotoUploader';

const MODALIDADES = ['Presencial', 'Online', 'Híbrido'];
const ESTADOS = ['Activo', 'Inactivo', 'Pausado'];
const OBJETIVOS = [
  'Reducir % de grasa y ganar fuerza',
  'Hipertrofia muscular y volumen limpio',
  'Fuerza máxima y potencia deportiva',
  'Recomposición corporal y definición',
  'Acondicionamiento físico general'
];

const inputCls = 'w-full bg-dark-900 border border-dark-700 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-gray-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors placeholder-gray-600 min-h-[44px]';
const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5';

/**
 * Modal Unificado Universal para la edición de datos de un Alumno.
 * Reutilizable en Clientes, Pagos, Fichas Médicas y cualquier vista del sistema.
 * 
 * Props estándar:
 * @param {boolean} isOpen - Controla la visibilidad del modal
 * @param {Function} onClose - Callback al cerrar o cancelar
 * @param {Object} clienteAEditar - Datos del alumno a editar (alias: client)
 * @param {Function} onSuccess - Callback al guardar con éxito (alias: onSaved)
 */
export default function EditClientModal({
  isOpen,
  onClose,
  clienteAEditar,
  client,
  onSuccess,
  onSaved
}) {
  const currentClient = clienteAEditar || client;
  const handleSuccessCallback = onSuccess || onSaved;

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    edad: '',
    altura: '',
    peso_actual: '',
    modalidad: 'Presencial',
    plan_id: '',
    plan_actual: '',
    objetivo: OBJETIVOS[0],
    estado: 'Activo',
    routine_id: '',
    foto_url: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [routines, setRoutines] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar / Hidratar datos del alumno cuando cambie o se abra el modal
  useEffect(() => {
    if (!currentClient) return;

    let dniVal = currentClient.dni || '';
    if (!dniVal) {
      try {
        const raw = localStorage.getItem(`ec_client_meta_${currentClient.id}`);
        if (raw) {
          const meta = JSON.parse(raw);
          if (meta.dni) dniVal = meta.dni;
        }
      } catch (e) {
        // ignore
      }
    }

    const partes = (currentClient.nombre_completo || '').trim().split(' ');
    const nombre = currentClient.nombre || (partes.length > 0 ? partes[0] : '');
    const apellido = currentClient.apellido || (partes.length > 1 ? partes.slice(1).join(' ') : '');
    const activeRoutine = (currentClient.routines || []).find(r => r.activa) || null;
    const photo = currentClient.foto_url || currentClient.avatar_url || null;

    setFormData({
      nombre,
      apellido,
      dni: dniVal,
      telefono: currentClient.telefono || '',
      email: currentClient.email || '',
      edad: (currentClient.edad !== null && currentClient.edad !== undefined) ? String(currentClient.edad) : '',
      altura: (currentClient.altura !== null && currentClient.altura !== undefined) ? String(currentClient.altura) : '',
      peso_actual: (currentClient.peso_actual !== null && currentClient.peso_actual !== undefined && currentClient.peso_actual !== '') 
        ? String(currentClient.peso_actual) 
        : '',
      modalidad: currentClient.modalidad || 'Presencial',
      plan_id: currentClient.plan_id || '',
      plan_actual: currentClient.plan_actual || '',
      objetivo: currentClient.objetivo || OBJETIVOS[0],
      estado: currentClient.estado || 'Activo',
      routine_id: activeRoutine?.id || '',
      foto_url: photo || ''
    });

    setPhotoPreview(photo);
    setPhotoFile(null);
    setPhotoRemoved(false);
    setError('');
  }, [currentClient, isOpen]);

  // Cargar rutinas y planes de membresía disponibles
  useEffect(() => {
    let alive = true;
    Promise.all([
      dataService.getAllRoutines(),
      dataService.getMembershipPlans()
    ]).then(([rList, pList]) => {
      if (!alive) return;
      if (rList) setRoutines(rList);
      if (pList) setMembershipPlans(pList);
    }).catch(err => {
      console.warn('[EditClientModal] Error cargando listas auxiliares:', err);
    });

    return () => { alive = false; };
  }, []);

  // Manejo de tecla Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving, isOpen]);

  if (!isOpen || !currentClient) return null;

  const activeRoutine = (currentClient.routines || []).find(r => r.activa) || null;
  const routineOptions = routines.filter(r => r.es_plantilla || r.id === activeRoutine?.id);
  const planOptions = membershipPlans.length > 0 
    ? membershipPlans.map(p => p.nombre)
    : ['Presencial', 'Personalizado', 'A distancia (Online)'];

  if (!planOptions.includes(formData.plan_actual) && formData.plan_actual) {
    planOptions.push(formData.plan_actual);
  }

  const objetivosList = OBJETIVOS.includes(formData.objetivo) || !formData.objetivo 
    ? OBJETIVOS 
    : [formData.objetivo, ...OBJETIVOS];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nombreLimpio = formData.nombre.trim();
    const apellidoLimpio = formData.apellido.trim();
    const nombreCompleto = [nombreLimpio, apellidoLimpio].filter(Boolean).join(' ');

    if (!nombreCompleto) {
      return setError('El nombre del alumno es obligatorio.');
    }
    if (!formData.telefono.trim()) {
      return setError('El teléfono / WhatsApp es obligatorio.');
    }

    setSaving(true);
    try {
      // 1. Manejo opcional de foto de perfil
      let finalFotoUrl = currentClient.foto_url || currentClient.avatar_url || null;
      if (photoRemoved) {
        finalFotoUrl = null;
      }
      if (photoFile) {
        const uploadedUrl = await dataService.uploadClientAvatar(photoFile);
        if (uploadedUrl) {
          finalFotoUrl = uploadedUrl;
        }
      }

      // 2. Parseo y sanitización estricta del payload hacia Supabase (tabla 'clients')
      const parseOptionalNumber = (val, isFloat = false) => {
        if (val === null || val === undefined || String(val).trim() === '') return null;
        const num = isFloat ? parseFloat(val) : parseInt(val, 10);
        return (!isNaN(num) && isFinite(num) && num > 0) ? num : null;
      };

      const parsedEdad = parseOptionalNumber(formData.edad, false);
      const parsedAltura = parseOptionalNumber(formData.altura, true);
      const parsedPeso = parseOptionalNumber(formData.peso_actual, true);

      const payloadUpdate = {
        nombre_completo: nombreCompleto,
        telefono: formData.telefono.trim(),
        email: formData.email && formData.email.trim() !== '' ? formData.email.trim() : null,
        edad: parsedEdad,
        altura: parsedAltura,
        peso_actual: parsedPeso,
        modalidad: formData.modalidad || 'Presencial',
        plan_id: formData.plan_id || null,
        plan_actual: formData.plan_actual || null,
        objetivo: (formData.objetivo || 'Acondicionamiento físico general').trim(),
        estado: formData.estado || 'Activo',
        foto_url: finalFotoUrl
      };

      const { data, error: dbError } = await supabase
        .from('clients')
        .update(payloadUpdate)
        .eq('id', currentClient.id)
        .select();

      if (dbError) throw dbError;
      if (!data || data.length === 0) {
        throw new Error('No se actualizó ningún registro en Supabase. Verifica tus permisos RLS.');
      }

      // 3. Persistir metadatos adicionales (DNI, avatar cache) en localStorage
      try {
        const raw = localStorage.getItem(`ec_client_meta_${currentClient.id}`);
        const currentMeta = raw ? JSON.parse(raw) : {};
        localStorage.setItem(`ec_client_meta_${currentClient.id}`, JSON.stringify({
          ...currentMeta,
          dni: formData.dni?.trim() || null,
          peso_actual: parsedPeso,
          foto_url: finalFotoUrl,
          avatar_url: finalFotoUrl,
          plan_actual: formData.plan_actual
        }));
      } catch (e) {
        // ignore
      }

      // 4. Asignar o desasignar rutina si hubo modificaciones
      let routineChanged = false;
      let rutinaNombre = currentClient.rutina_activa || null;
      if (formData.routine_id !== (activeRoutine?.id || '')) {
        routineChanged = true;
        if (formData.routine_id) {
          await dataService.assignRoutineToClient(formData.routine_id, currentClient.id);
          rutinaNombre = routines.find(r => r.id === formData.routine_id)?.nombre || rutinaNombre;
        } else {
          await dataService.unassignRoutineFromClient(currentClient.id);
          rutinaNombre = null;
        }
      }

      // 5. Estructurar el alumno actualizado
      const updatedClientResult = {
        ...currentClient,
        ...data[0],
        nombre: nombreLimpio,
        apellido: apellidoLimpio,
        dni: formData.dni?.trim() || null,
        peso_actual: parsedPeso,
        foto_url: finalFotoUrl,
        avatar_url: finalFotoUrl,
        rutina_activa: rutinaNombre,
        tiene_rutina: Boolean(rutinaNombre)
      };

      // 6. Notificar éxito al componente padre
      if (handleSuccessCallback) {
        await handleSuccessCallback(updatedClientResult, { routineChanged });
      }

      onClose?.();
    } catch (err) {
      console.error('[EditClientModal] Error actualizando alumno:', err);
      setError(err?.message || 'No se pudo actualizar el alumno en Supabase.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
      onClick={() => !saving && onClose?.()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale"
      >
        {/* Cabecera fija */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Pencil className="w-4 h-4 text-brand-light" />
            <span>Editar Alumno</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700 hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario scrolleable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
          <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3.5 pb-2">
            
            {/* Foto de perfil */}
            <div className="flex justify-center pb-1">
              <ClientPhotoUploader
                initialUrl={photoPreview}
                currentPhoto={photoPreview}
                name={formData.nombre || currentClient.nombre_completo}
                onPhotoSelected={(file, preview) => {
                  setPhotoFile(file);
                  setPhotoPreview(preview);
                  setPhotoRemoved(false);
                }}
                onPhotoSelect={(file, preview) => {
                  setPhotoFile(file);
                  setPhotoPreview(preview);
                  setPhotoRemoved(false);
                }}
                onPhotoRemoved={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setPhotoRemoved(true);
                }}
                onPhotoRemove={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setPhotoRemoved(true);
                }}
              />
            </div>

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input
                  type="text"
                  required
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Sofía"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Apellido</label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  placeholder="Ej: Ramírez"
                  className={inputCls}
                />
              </div>
            </div>

            {/* DNI y Teléfono / WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  DNI <span className="text-gray-600 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  placeholder="Ej: 38442119"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>WhatsApp / Teléfono *</label>
                <input
                  type="tel"
                  required
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+54 9 11 4433-2211"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>
                Email <span className="text-gray-600 font-normal">(Opcional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="sofia@email.com"
                className={inputCls}
              />
            </div>

            {/* Plan Asignado y Modalidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Plan Asignado</label>
                <select
                  name="plan_id"
                  value={formData.plan_id || (membershipPlans.find(p => p.nombre === formData.plan_actual)?.id) || ''}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const found = membershipPlans.find(p => p.id === selId);
                    setFormData(prev => ({
                      ...prev,
                      plan_id: selId || null,
                      plan_actual: found ? found.nombre : null
                    }));
                  }}
                  className={inputCls}
                >
                  <option value="">Sin plan asignado</option>
                  {membershipPlans.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Modalidad</label>
                <select
                  name="modalidad"
                  value={formData.modalidad}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {MODALIDADES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campo requerido: Peso Actual con sufijo 'kg' y diseño acordado */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Peso Actual <span className="text-gray-600 font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  name="peso_actual"
                  value={formData.peso_actual}
                  onChange={handleChange}
                  placeholder="Ej: 75.5"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 sm:px-4 pr-10 py-2 sm:py-2.5 text-sm text-gray-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors placeholder-gray-600 appearance-none min-h-[44px]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium pointer-events-none">
                  kg
                </span>
              </div>
            </div>

            {/* Edad y Altura */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  Edad <span className="text-gray-600 font-normal">(años)</span>
                </label>
                <input
                  type="number"
                  name="edad"
                  value={formData.edad}
                  onChange={handleChange}
                  placeholder="26"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Altura <span className="text-gray-600 font-normal">(cm)</span>
                </label>
                <input
                  type="number"
                  name="altura"
                  value={formData.altura}
                  onChange={handleChange}
                  placeholder="168"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Estado y Objetivo Principal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {ESTADOS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Objetivo Principal</label>
                <select
                  name="objetivo"
                  value={formData.objetivo}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {objetivosList.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rutina Asignada */}
            <div>
              <label className={labelCls}>Rutina de Entrenamiento Asignada</label>
              <select
                name="routine_id"
                value={formData.routine_id}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="">Sin rutina asignada</option>
                {routineOptions.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}{r.es_plantilla ? ' (Plantilla)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Elegir una plantilla crea automáticamente una copia personalizada para este alumno.
              </p>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Botones inferiores fijos */}
          <div className="pt-3 border-t border-dark-700 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-dark-700 text-gray-300 hover:text-white text-xs sm:text-sm font-semibold transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red flex items-center gap-2 disabled:opacity-50 transition-all min-h-[44px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
