import React, { useState, useRef } from 'react';
import { 
  Settings, 
  User, 
  Cloud, 
  CheckCircle2, 
  Save, 
  Camera,
  GraduationCap,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import ClientAvatar from '../common/ClientAvatar';
import { saveCoachProfile, uploadCoachAvatar } from '../../services/authService';

const emptyStudy = () => ({ titulo: '', institucion: '', anio: '' });

export default function SettingsView({ user, onUpdateProfile }) {
  const [coachProfile, setCoachProfile] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    slogan: user?.slogan || 'Construí tu mejor versión',
    biografia: user?.biografia || user?.bio || '',
    avatar_url: user?.avatar_url || '',
    estudios: Array.isArray(user?.estudios) ? user.estudios : []
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const fileRef = useRef(null);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Selecciona un archivo de imagen.');
    if (file.size > 8 * 1024 * 1024) return setError('La imagen no puede superar 8 MB.');
    setError('');
    setUploading(true);
    try {
      const { url } = await uploadCoachAvatar(file, user?.user_id || user?.id || 'local');
      setCoachProfile(p => ({ ...p, avatar_url: url }));
    } catch (err) {
      setError(err.message || 'No se pudo cargar la foto.');
    } finally {
      setUploading(false);
    }
  };

  const updateStudy = (i, field, value) =>
    setCoachProfile(p => ({
      ...p,
      estudios: p.estudios.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!coachProfile.nombre.trim()) return setError('El nombre es obligatorio.');
    setSaving(true);
    try {
      const form = {
        ...coachProfile,
        nombre: coachProfile.nombre.trim(),
        estudios: coachProfile.estudios.filter(s => s.titulo.trim() || s.institucion.trim())
      };
      const { profile, warnings: w } = await saveCoachProfile(user || {}, form);
      setWarnings(w);
      setCoachProfile(c => ({ ...c, estudios: form.estudios }));
      onUpdateProfile?.(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white';
  const labelCls = 'block text-[11px] font-semibold uppercase text-gray-300 mb-1';

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand" />
          Configuración del Entrenador & Plataforma
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Ajustes de marca, perfil profesional y servicios vinculados.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Perfil del Coach */}
        <div className="card-dark rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-dark-700">
            <User className="w-4 h-4 text-brand-light" />
            Perfil Profesional del Coach
          </h2>

          {/* Foto de perfil */}
          <div className="flex items-center gap-4">
            <ClientAvatar
              key={coachProfile.avatar_url}
              name={coachProfile.nombre || 'Entrenador'}
              fotoUrl={coachProfile.avatar_url}
              size="3xl"
              rounded="rounded-full"
            />
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-3.5 py-2 rounded-xl bg-dark-900 border border-dark-700 hover:border-brand text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {coachProfile.avatar_url ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {coachProfile.avatar_url && (
                <button
                  type="button"
                  onClick={() => setCoachProfile(p => ({ ...p, avatar_url: '' }))}
                  className="text-[11px] text-gray-400 hover:text-red-400"
                >
                  Quitar foto
                </button>
              )}
              <p className="text-[11px] text-gray-500">JPG o PNG. Se recorta en formato cuadrado.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre y Apellido</label>
              <input type="text" value={coachProfile.nombre}
                onChange={(e) => setCoachProfile({ ...coachProfile, nombre: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email de Acceso</label>
              <input type="email" value={coachProfile.email}
                onChange={(e) => setCoachProfile({ ...coachProfile, email: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp / Teléfono</label>
              <input type="tel" value={coachProfile.telefono} placeholder="+54 9 11 5555-0199"
                onChange={(e) => setCoachProfile({ ...coachProfile, telefono: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slogan del Portal</label>
              <input type="text" value={coachProfile.slogan}
                onChange={(e) => setCoachProfile({ ...coachProfile, slogan: e.target.value })}
                className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Biografía</label>
              <textarea rows={3} value={coachProfile.biografia}
                placeholder="Especialista en Hipertrofia, Fuerza y Recomposición Corporal."
                onChange={(e) => setCoachProfile({ ...coachProfile, biografia: e.target.value })}
                className={inputCls} />
            </div>
          </div>
        </div>

        {/* Facultades y Estudios */}
        <div className="card-dark rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-700">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand-light" />
              Facultades y Estudios
            </h2>
            <button
              type="button"
              onClick={() => setCoachProfile(p => ({ ...p, estudios: [...p.estudios, emptyStudy()] }))}
              className="px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700 hover:border-brand text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          {coachProfile.estudios.length === 0 && (
            <p className="text-xs text-gray-500">
              Aún no cargaste estudios. Agrega tus títulos, certificaciones o cursos principales.
            </p>
          )}

          {coachProfile.estudios.map((est, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-xl bg-dark-900/60 border border-dark-700">
              <div className="sm:col-span-5">
                <label className={labelCls}>Título / Facultad</label>
                <input type="text" value={est.titulo} placeholder="Ej: Licenciatura en Educación Física"
                  onChange={(e) => updateStudy(i, 'titulo', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-4">
                <label className={labelCls}>Institución</label>
                <input type="text" value={est.institucion} placeholder="Ej: UBA"
                  onChange={(e) => updateStudy(i, 'institucion', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Año</label>
                <input type="text" inputMode="numeric" maxLength={4} value={est.anio} placeholder="2020"
                  onChange={(e) => updateStudy(i, 'anio', e.target.value.replace(/\D/g, ''))} className={inputCls} />
              </div>
              <div className="sm:col-span-1 flex items-end">
                <button
                  type="button"
                  aria-label="Eliminar estudio"
                  onClick={() => setCoachProfile(p => ({ ...p, estudios: p.estudios.filter((_, idx) => idx !== i) }))}
                  className="w-full h-[38px] rounded-xl border border-dark-700 hover:border-red-500 text-gray-400 hover:text-red-400 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Estado del Backend Supabase */}
        <div className="card-dark rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-dark-700">
            <Cloud className="w-4 h-4 text-blue-400" />
            Integración de Base de Datos
          </h2>

          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900 border border-dark-700">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">Servidor Supabase</span>
              <p className="text-[11px] text-gray-400 font-mono">
                {import.meta.env.VITE_SUPABASE_URL || 'https://xqpheqvqqozthgpqatds.supabase.co'}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Sincronizado
            </span>
          </div>
        </div>

        {/* Botón de Guardar */}
        {error && (
          <p className="text-xs text-red-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}
        {warnings.length > 0 && (
          <p className="text-[11px] text-amber-400">
            Guardado en este dispositivo. Algunos datos no se sincronizaron con la base de datos: {warnings[0]}
          </p>
        )}
        <div className="flex items-center justify-between">
          {saved && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> ¡Configuración guardada exitosamente!
            </span>
          )}
          <button
            type="submit"
            disabled={saving || uploading}
            className="ml-auto px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Ajustes</span>
          </button>
        </div>

      </form>
    </div>
  );
}
