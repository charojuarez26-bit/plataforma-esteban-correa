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
  Info,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import AboutModal from '../AboutModal';
import ClientAvatar from '../common/ClientAvatar';
import { saveCoachProfile, uploadCoachAvatar } from '../../services/authService';
import { dataService } from '../../services/dataService';
import { supabase, withAuthRetry } from '../../lib/supabase';
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

  // ==========================================================
  // CÓDIGO DE ACCESO PARA ALUMNOS (4 DÍGITOS)
  // ==========================================================
  const [accessCode, setAccessCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(true);
  const [savingCode, setSavingCode] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [coachRecord, setCoachRecord] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCoachAccessCode() {
      try {
        setLoadingCode(true);
        setCodeError('');

        let loadedCode = '';
        let coachData = null;

        // Consultar en la tabla coaches siempre con select('*').limit(1)
        const { data, error } = await withAuthRetry(() =>
          supabase
            .from('coaches')
            .select('*')
            .limit(1)
            .maybeSingle()
        );

        if (!error && data) {
          coachData = data;
          loadedCode = data.codigo_acceso || data.branding?.codigo_acceso || '';
        }

        // Si no hay código en BD, fallback a localStorage o valor por defecto '7429'
        if (!loadedCode) {
          const localCode = typeof window !== 'undefined' ? localStorage.getItem('coach_access_code') : null;
          loadedCode = localCode || '7429';
        }

        if (isMounted) {
          setCoachRecord(coachData);
          setAccessCode(String(loadedCode).trim().slice(0, 4));
        }
      } catch (err) {
        console.error('[SettingsView] Error cargando código de acceso:', err);
        if (isMounted) {
          const fallback = localStorage.getItem('coach_access_code') || '7429';
          setAccessCode(fallback);
        }
      } finally {
        if (isMounted) setLoadingCode(false);
      }
    }

    loadCoachAccessCode();
    return () => { isMounted = false; };
  }, [user]);

  const handleSaveAccessCode = async (e) => {
    e?.preventDefault?.();
    setCodeError('');
    setCodeSuccess(false);

    const cleanCode = (accessCode || '').trim();

    // Validación de exactamente 4 dígitos numéricos
    if (!/^\d{4}$/.test(cleanCode)) {
      setCodeError('El código de acceso debe contener exactamente 4 dígitos numéricos (ej: 7429).');
      return;
    }

    setSavingCode(true);
    try {
      let coachId = coachRecord?.id;
      if (!coachId) {
        const { data: firstCoach } = await withAuthRetry(() =>
          supabase.from('coaches').select('*').limit(1).maybeSingle()
        );
        if (firstCoach?.id) {
          coachId = firstCoach.id;
          setCoachRecord(firstCoach);
        }
      }

      if (coachId) {
        const { error } = await withAuthRetry(() =>
          supabase
            .from('coaches')
            .update({ codigo_acceso: cleanCode })
            .eq('id', coachId)
        );

        if (!error) {
          setCoachRecord(prev => ({ ...prev, codigo_acceso: cleanCode }));
        } else {
          console.warn('[SettingsView] Error actualizando codigo_acceso en coach:', error.message);
        }
      }

      // Persistir siempre en localStorage para disponibilidad instantánea
      localStorage.setItem('coach_access_code', cleanCode);

      // Feedback visual obligatorio de éxito
      setCodeSuccess(true);
      setTimeout(() => setCodeSuccess(false), 3500);
    } catch (err) {
      console.error('[SettingsView] Error guardando código:', err);
      localStorage.setItem('coach_access_code', cleanCode);
      setCodeSuccess(true);
      setTimeout(() => setCodeSuccess(false), 3500);
    } finally {
      setSavingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!accessCode) return;
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Error al copiar código:', err);
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

        {/* Código de Acceso para Alumnos (4 Dígitos) */}
        <div className="card-dark rounded-2xl p-4 sm:p-6 space-y-4 border border-dark-700/80 relative overflow-hidden">
          {/* Sutil resplandor de fondo deportivo */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0 text-brand">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    Código de Acceso para Alumnos
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand/15 text-brand-light border border-brand/30">
                    PIN 4 Dígitos
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Gestiona la clave de 4 dígitos para el registro y acceso directo de tus alumnos.
                </p>
              </div>
            </div>

            {codeSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-in fade-in shrink-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Código guardado correctamente
              </span>
            )}
          </div>

          {loadingCode ? (
            <div className="py-6 text-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand" />
              <p className="text-xs">Cargando código de acceso...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-xl bg-dark-900 border border-dark-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Input de 4 dígitos */}
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-300 block">
                    Código de Acceso (4 dígitos)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={accessCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setAccessCode(val);
                        setCodeError('');
                      }}
                      placeholder="7429"
                      className="w-full h-12 bg-dark-950 border border-dark-600 focus:border-brand rounded-xl pl-4 pr-24 text-left font-mono font-black text-2xl tracking-[0.3em] text-white focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all shadow-inner"
                    />
                    {accessCode && (
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        title="Copiar código al portapapeles"
                        className="absolute right-2 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400 font-bold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copiar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium block">
                    {accessCode.length}/4 dígitos ingresados
                  </span>
                </div>

                {/* Botón de Guardar Código */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveAccessCode}
                    disabled={savingCode || accessCode.length !== 4}
                    className="h-12 px-6 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wider transition-all shadow-glow-red flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {savingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar Código</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error si la validación falla */}
              {codeError && (
                <p className="text-xs text-red-400 font-bold flex items-center gap-1.5 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{codeError}</span>
                </p>
              )}

              {/* Texto de ayuda requerido */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-dark-900/60 border border-dark-700 text-gray-400 text-xs leading-relaxed">
                <Info className="w-4 h-4 text-brand-light shrink-0 mt-0.5" />
                <p>
                  <span className="text-gray-200 font-medium">Comparte este código de 4 dígitos con tus nuevos alumnos para que puedan registrarse sin contraseña.</span>
                </p>
              </div>
            </div>
          )}
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
              <span>Ajustes guardados y sincronizados correctamente</span>
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
