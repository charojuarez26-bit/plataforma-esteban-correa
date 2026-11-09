import React, { useState, useRef, useEffect } from 'react';
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
  AlertTriangle,
  Palette,
  DollarSign,
  CreditCard,
  Info
} from 'lucide-react';
import AboutModal from '../AboutModal';
import ClientAvatar from '../common/ClientAvatar';
import { saveCoachProfile, uploadCoachAvatar } from '../../services/authService';
import { dataService } from '../../services/dataService';
import { formatearPrecioARS } from '../../utils/paymentUtils';
import { MotivationalSlogan } from '../common/BrandLogo';
import {
  FONT_OPTIONS, SIZE_OPTIONS, COLOR_PRESETS, DEFAULT_BRANDING,
  getCachedBranding, saveBranding
} from '../../services/brandingService';

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

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [branding, setBranding] = useState(() => getCachedBranding());
  const setB = (patch) => setBranding(b => ({ ...b, ...patch }));

  // Tarifas de Planes de Membresía
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [savingPlans, setSavingPlans] = useState(false);
  const [plansSuccess, setPlansSuccess] = useState(false);
  const [plansError, setPlansError] = useState('');

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const data = await dataService.getMembershipPlans();
        setMembershipPlans(data);
      } catch (e) {
        console.error('Error cargando planes:', e);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const handlePriceChange = (tipo, newPrice) => {
    setMembershipPlans(prev => prev.map(p => 
      (p.tipo || '').toLowerCase() === tipo.toLowerCase() 
        ? { ...p, precio: newPrice }
        : p
    ));
  };

  const handleSaveMembershipPlans = async (e) => {
    e?.preventDefault();
    setPlansError('');
    setSavingPlans(true);
    try {
      const res = await dataService.saveMembershipPlanPrices(membershipPlans);
      if (res.success || res.plans) {
        setPlansSuccess(true);
        setTimeout(() => setPlansSuccess(false), 3500);
      } else {
        setPlansError('Ocurrió un inconveniente al sincronizar con Supabase');
      }
    } catch (err) {
      setPlansError(err.message || 'Error guardando planes');
    } finally {
      setSavingPlans(false);
    }
  };

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
      const { warning: brandWarning } = await saveBranding(branding);
      setWarnings(brandWarning ? [...w, brandWarning] : w);
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
    <div className="space-y-6 pb-28 sm:pb-12 max-w-4xl w-full max-w-full overflow-x-hidden">
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
        <div className="card-dark rounded-2xl p-4 sm:p-6 space-y-4">
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
        <div className="card-dark rounded-2xl p-4 sm:p-6 space-y-4">
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

        {/* VALORES DE PLANES Y CUOTAS (MEMBERSHIP_PLANS) */}
        <div className="card-dark rounded-2xl p-4 sm:p-6 space-y-5 border border-dark-700/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-700">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand" />
                Valores de Planes y Cuotas
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Carga desde <span className="font-mono text-gray-300">membership_plans</span> y define los valores vigentes ($ ARS) para tus 3 planes de entrenamiento.
              </p>
            </div>

            {plansSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                ¡Tarifas guardadas en Supabase!
              </span>
            )}
          </div>

          {loadingPlans ? (
            <div className="py-8 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
              <p className="text-xs">Cargando tarifas de planes...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Input 1: Plan Presencial */}
                {(() => {
                  const planPresencial = membershipPlans.find(p => (p.tipo || '').toLowerCase() === 'presencial') || { precio: 38000 };
                  return (
                    <div className="rounded-xl p-4 bg-dark-900 border border-dark-700 space-y-2.5 hover:border-gray-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase text-gray-300">
                          Plan Presencial
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          En Sala
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Entrenamiento guiado presencial con supervisión técnica en sala.
                      </p>
                      <div className="pt-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                          Tarifa Mensual ($ ARS)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={planPresencial.precio}
                            onChange={(e) => handlePriceChange('Presencial', e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-dark-950 border border-dark-700 text-white font-black text-sm focus:outline-none focus:border-brand"
                            placeholder="38000"
                          />
                        </div>
                        <span className="text-[11px] text-emerald-400 font-bold block mt-1.5">
                          {formatearPrecioARS(planPresencial.precio)} / mes
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Input 2: Plan Personalizado */}
                {(() => {
                  const planPersonalizado = membershipPlans.find(p => (p.tipo || '').toLowerCase() === 'personalizado') || { precio: 45000 };
                  return (
                    <div className="rounded-xl p-4 bg-dark-900 border border-dark-700 space-y-2.5 hover:border-gray-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase text-gray-300">
                          Plan Personalizado
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/15 text-brand-light border border-brand/30">
                          1 a 1 Pro
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Planificación integral a medida y seguimiento antropométrico mensual.
                      </p>
                      <div className="pt-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                          Tarifa Mensual ($ ARS)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={planPersonalizado.precio}
                            onChange={(e) => handlePriceChange('Personalizado', e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-dark-950 border border-dark-700 text-white font-black text-sm focus:outline-none focus:border-brand"
                            placeholder="45000"
                          />
                        </div>
                        <span className="text-[11px] text-emerald-400 font-bold block mt-1.5">
                          {formatearPrecioARS(planPersonalizado.precio)} / mes
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Input 3: Plan A Distancia (Online) */}
                {(() => {
                  const planOnline = membershipPlans.find(p => (p.tipo || '').toLowerCase() === 'a distancia') || { precio: 28000 };
                  return (
                    <div className="rounded-xl p-4 bg-dark-900 border border-dark-700 space-y-2.5 hover:border-gray-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase text-gray-300">
                          Plan A Distancia (Online)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Virtual
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Rutina virtual con soporte diario por WhatsApp y corrección técnica.
                      </p>
                      <div className="pt-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                          Tarifa Mensual ($ ARS)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={planOnline.precio}
                            onChange={(e) => handlePriceChange('A distancia', e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-dark-950 border border-dark-700 text-white font-black text-sm focus:outline-none focus:border-brand"
                            placeholder="28000"
                          />
                        </div>
                        <span className="text-[11px] text-emerald-400 font-bold block mt-1.5">
                          {formatearPrecioARS(planOnline.precio)} / mes
                        </span>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {plansError && (
                <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {plansError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveMembershipPlans}
                  disabled={savingPlans}
                  className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wider transition-all shadow-glow-red flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPlans ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{savingPlans ? 'Guardando...' : 'Guardar Tarifas'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Personalización de Marca y Slogan */}
        <div className="card-dark rounded-2xl p-4 sm:p-6 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-dark-700">
            <Palette className="w-4 h-4 text-brand-light" />
            Personalización de Marca y Slogan
          </h2>

          {/* Vista previa en vivo */}
          <div className="rounded-xl bg-dark-950 border border-dark-700 p-6 text-center">
            <span className="block text-[10px] uppercase font-bold text-gray-500 mb-2">Vista previa en vivo</span>
            <MotivationalSlogan branding={branding} />
          </div>

          {/* Fuente */}
          <div>
            <label className={labelCls}>Tipografía</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setB({ fuente: f.family })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    branding.fuente === f.family ? 'border-brand bg-brand/10' : 'border-dark-700 bg-dark-900 hover:border-gray-500'
                  }`}
                >
                  <span className="block text-lg text-white leading-tight" style={{ fontFamily: f.family }}>{f.label}</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño */}
          <div>
            <label className={labelCls}>Tamaño</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SIZE_OPTIONS.map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => setB({ tamano: sz.id })}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    branding.tamano === sz.id ? 'border-brand bg-brand/10 text-white' : 'border-dark-700 bg-dark-900 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {sz.label} <span className="text-gray-500 font-normal">({sz.hint})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Colores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'color_base', label: 'Color del texto base' },
              { key: 'color_destacado', label: 'Color del texto destacado' }
            ].map(({ key, label }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="color"
                    value={branding[key]}
                    onChange={(e) => setB({ [key]: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-dark-900 border border-dark-700 cursor-pointer p-0.5"
                    aria-label={label}
                  />
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setB({ [key]: c })}
                      aria-label={`Usar ${c}`}
                      className={`w-6 h-6 rounded-full border-2 ${branding[key].toLowerCase() === c ? 'border-white' : 'border-dark-700'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Textos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Texto base</label>
              <input type="text" value={branding.slogan_base} onChange={(e) => setB({ slogan_base: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Texto destacado</label>
              <input type="text" value={branding.slogan_destacado} onChange={(e) => setB({ slogan_destacado: e.target.value })} className={inputCls} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBranding({ ...DEFAULT_BRANDING })}
            className="text-[11px] font-semibold text-gray-400 hover:text-white underline"
          >
            Restablecer valores por defecto
          </button>
        </div>

        {/* Estado del Backend Supabase */}
        <div className="card-dark rounded-2xl p-4 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-dark-700">
            <Cloud className="w-4 h-4 text-blue-400" />
            Integración de Base de Datos
          </h2>

          <div className="w-full max-w-full overflow-hidden p-3.5 sm:p-4 rounded-xl bg-dark-900 border border-dark-700 flex items-center justify-between flex-wrap gap-2.5">
            <div className="space-y-1 min-w-0 flex-1 max-w-full">
              <span className="text-xs font-bold text-white block">Servidor Supabase</span>
              <p className="text-[11px] text-gray-400 font-mono break-all text-wrap max-w-full">
                {import.meta.env.VITE_SUPABASE_URL || 'https://xqpheqvqqozthgpqatds.supabase.co'}
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
              Sincronizado
            </span>
          </div>
        </div>

        {/* Acerca de la Plataforma */}
        <div className="card-dark rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-700">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-light" />
              Acerca de la Plataforma
            </h2>
            <span className="bg-red-500/10 text-red-500 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-red-500/20">
              v1.0
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-dark-900 border border-dark-700">
            <div>
              <p className="text-sm font-bold text-white">Esteban Correa Trainer</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Desarrollada por <span className="font-semibold text-gray-300">PM Soluciones Digitales</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-white border border-dark-600 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Info className="w-3.5 h-3.5 text-brand" />
              <span>Acerca de la app</span>
            </button>
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
        <div className="w-full max-w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 order-2 sm:order-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Configuración guardada exitosamente!</span>
            </span>
          )}
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full sm:w-auto order-1 sm:order-2 sm:ml-auto px-6 py-3 sm:py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center justify-center gap-2 disabled:opacity-60 shrink-0 active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
            <span>{saving ? 'Guardando...' : 'Guardar Ajustes'}</span>
          </button>
        </div>

      </form>

      {/* Modal Acerca de */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}
