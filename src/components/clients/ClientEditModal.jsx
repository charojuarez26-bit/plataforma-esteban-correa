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

const inputCls = 'w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]';
const labelCls = 'block text-[11px] font-semibold uppercase text-gray-300 mb-1';

/**
 * Modal de edición de alumno. Actualiza la tabla `clients` en Supabase y devuelve
 * el alumno actualizado mediante `onSaved` para refrescar el estado local sin recargar.
 */
export default function ClientEditModal({ client, onClose, onSaved }) {
  const activeRoutine = (client?.routines || []).find(r => r.activa) || null;

  const [form, setForm] = useState({
    nombre_completo: client?.nombre_completo || '',
    telefono: client?.telefono || '',
    modalidad: client?.modalidad || 'Presencial',
    objetivo: client?.objetivo || OBJETIVOS[0],
    estado: client?.estado || 'Activo',
    routine_id: activeRoutine?.id || '',
    foto_url: client?.foto_url || client?.avatar_url || ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(client?.foto_url || client?.avatar_url || null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [routines, setRoutines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    dataService.getAllRoutines().then(list => {
      if (alive) setRoutines(list || []);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  if (!client) return null;

  // Opciones: plantillas disponibles + la rutina actualmente activa del alumno
  const options = routines.filter(r => r.es_plantilla || r.id === activeRoutine?.id);
  const objetivos = OBJETIVOS.includes(form.objetivo) || !form.objetivo ? OBJETIVOS : [form.objetivo, ...OBJETIVOS];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nombre = form.nombre_completo.trim();
    const telefono = form.telefono.trim();
    if (!nombre) return setError('El nombre es obligatorio.');
    if (!telefono) return setError('El teléfono es obligatorio.');

    setSaving(true);
    setError('');
    try {
      let finalFotoUrl = client?.foto_url || client?.avatar_url || null;
      if (photoRemoved) {
        finalFotoUrl = null;
      }
      if (photoFile) {
        const uploadedUrl = await dataService.uploadClientAvatar(photoFile);
        if (uploadedUrl) {
          finalFotoUrl = uploadedUrl;
        }
      }

      const changes = {
        nombre_completo: nombre,
        telefono,
        modalidad: form.modalidad,
        objetivo: form.objetivo,
        estado: form.estado,
        foto_url: finalFotoUrl
      };

      const { data, error: dbError } = await supabase
        .from('clients')
        .update(changes)
        .eq('id', client.id)
        .select();

      if (dbError) throw dbError;
      if (!data || data.length === 0) {
        throw new Error('No se actualizó ningún registro. Verifica tus permisos (RLS) en Supabase.');
      }

      // Persistir metadatos en localStorage para consistencia
      try {
        const raw = localStorage.getItem(`ec_client_meta_${client.id}`);
        const currentMeta = raw ? JSON.parse(raw) : {};
        localStorage.setItem(`ec_client_meta_${client.id}`, JSON.stringify({
          ...currentMeta,
          foto_url: finalFotoUrl,
          avatar_url: finalFotoUrl
        }));
      } catch (e) {
        // ignore
      }

      // Rutina asignada
      let routineChanged = false;
      let rutinaNombre = client.rutina_activa || null;
      if (form.routine_id !== (activeRoutine?.id || '')) {
        routineChanged = true;
        if (form.routine_id) {
          await dataService.assignRoutineToClient(form.routine_id, client.id);
          rutinaNombre = options.find(r => r.id === form.routine_id)?.nombre || rutinaNombre;
        } else {
          const ok = await dataService.unassignRoutineFromClient(client.id);
          if (!ok) throw new Error('No se pudo quitar la rutina asignada.');
          rutinaNombre = null;
        }
      }

      onSaved({
        ...client,
        ...data[0],
        foto_url: finalFotoUrl,
        avatar_url: finalFotoUrl,
        rutina_activa: rutinaNombre,
        tiene_rutina: Boolean(rutinaNombre)
      }, { routineChanged });
    } catch (err) {
      console.error('Error actualizando alumno:', err);
      setError(err?.message || 'No se pudo actualizar el alumno.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
         onClick={() => !saving && onClose()}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto card-dark rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 space-y-4 border border-dark-700"
      >
        <div className="flex items-center justify-between pb-3 border-b border-dark-700">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Pencil className="w-4 h-4 text-brand-light" /> Editar alumno
          </h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Foto de perfil */}
        <div className="py-2">
          <ClientPhotoUploader
            initialUrl={photoPreview}
            onPhotoSelected={(file, preview) => {
              setPhotoFile(file);
              setPhotoPreview(preview);
              setPhotoRemoved(false);
            }}
            onPhotoRemoved={() => {
              setPhotoFile(null);
              setPhotoPreview(null);
              setPhotoRemoved(true);
            }}
          />
        </div>

        <div>
          <label className={labelCls}>Nombre y Apellido *</label>
          <input type="text" value={form.nombre_completo} onChange={(e) => set('nombre_completo', e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Teléfono / WhatsApp *</label>
          <input type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Modalidad</label>
            <select value={form.modalidad} onChange={(e) => set('modalidad', e.target.value)} className={inputCls}>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={form.estado} onChange={(e) => set('estado', e.target.value)} className={inputCls}>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Objetivo</label>
          <select value={form.objetivo} onChange={(e) => set('objetivo', e.target.value)} className={inputCls}>
            {objetivos.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Rutina asignada</label>
          <select value={form.routine_id} onChange={(e) => set('routine_id', e.target.value)} className={inputCls}>
            <option value="">Sin rutina asignada</option>
            {options.map(r => (
              <option key={r.id} value={r.id}>
                {r.nombre}{r.es_plantilla ? ' (Plantilla)' : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">Elegir una plantilla crea una copia personalizada para el alumno.</p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-dark-700 text-gray-300 hover:text-white text-xs sm:text-sm font-bold">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
