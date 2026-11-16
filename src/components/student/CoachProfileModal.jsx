import React, { useEffect } from 'react';
import { X, Award, GraduationCap, User, MessageCircle, ExternalLink, ShieldCheck, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Modal Perfil del Entrenador (Portal del Alumno)
 * Muestra los datos reales del coach configurados en la base de datos Supabase:
 * - nombre
 * - avatar_url (o foto_url)
 * - slogan
 * - biografia (o bio)
 * - telefono
 * - estudios (JSON stringificado o array)
 */
export default function CoachProfileModal({ isOpen, onClose, coachProfile: propCoachProfile, coach, whatsappPhone }) {
  // ==========================================================
  // 1. REGLAS DE HOOKS: Todos los hooks al inicio absoluto del componente
  // ==========================================================
  const authContext = useAuth();

  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Retorno temprano SIEMPRE después de todos los hooks
  if (!isOpen) return null;

  // 2. Obtener datos reales del Coach (NUNCA del alumno activo)
  const isStudentObj = (obj) => Boolean(obj && (obj.role === 'student' || obj.access_code));
  const authUser = authContext?.user || null;
  const authCoach = (authUser?.role === 'coach') ? authUser : null;

  const localCoach = typeof window !== 'undefined' ? (() => {
    try {
      const pub = localStorage.getItem('coach_public_profile');
      if (pub) {
        const parsed = JSON.parse(pub);
        if (parsed && !isStudentObj(parsed)) {
          return parsed;
        }
      }
      const ses = localStorage.getItem('ec_trainer_auth_session');
      if (ses) {
        const p = JSON.parse(ses);
        if (p?.user?.role === 'coach') return p.user;
        if (p?.role === 'coach') return p;
      }
    } catch {}
    return null;
  })() : null;

  // Filtrar prop para jamás usar un objeto perteneciente al alumno
  const rawCandidate = propCoachProfile || coach;
  const validCandidate = (rawCandidate && !isStudentObj(rawCandidate)) ? rawCandidate : null;
  const coachProfile = validCandidate || authCoach || localCoach;

  // 3. Parseo seguro de 'estudios' (Capacitaciones)
  let estudiosLista = [];
  try {
    if (coachProfile?.estudios) {
      estudiosLista = typeof coachProfile.estudios === 'string'
        ? JSON.parse(coachProfile.estudios)
        : coachProfile.estudios;
      if (!Array.isArray(estudiosLista)) {
        estudiosLista = [];
      }
    }
  } catch (e) {
    console.error("Error parseando estudios", e);
  }

  // 4. Limpieza y sanitización universal del teléfono del coach para WhatsApp
  const rawPhone = coachProfile?.telefono || coachProfile?.whatsapp || (whatsappPhone ? String(whatsappPhone) : '');
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone && cleanPhone.length === 10 && !cleanPhone.startsWith('54')) {
    cleanPhone = `549${cleanPhone}`;
  }

  const initials = (coachProfile?.nombre && coachProfile?.nombre !== 'Atleta')
    ? coachProfile.nombre.substring(0, 2).toUpperCase()
    : 'EC';
  const avatarUrl = coachProfile?.foto_url || coachProfile?.avatar_url;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-dark-900 border border-dark-700/80 rounded-3xl max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow sutil en esquina */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-brand/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full text-gray-400 hover:text-white bg-dark-800/80 hover:bg-dark-700 transition-colors border border-dark-700/50"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabecera con Foto de perfil, Nombre, Slogan y Email */}
        <div className="relative pt-7 pb-4 px-6 text-center border-b border-dark-800/80 bg-gradient-to-b from-dark-850 to-dark-900/40">
          <div className="flex justify-center mb-3">
            <div className="relative">
              {(coachProfile?.foto_url || coachProfile?.avatar_url) ? (
                <img
                  src={coachProfile?.foto_url || coachProfile?.avatar_url}
                  alt={coachProfile?.nombre || 'Entrenador'}
                  className="w-24 h-24 rounded-full object-cover border-2 border-brand/80 shadow-glow-red/40"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                style={{ display: (coachProfile?.foto_url || coachProfile?.avatar_url) ? 'none' : 'flex' }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-brand/25 via-dark-850 to-dark-900 border-2 border-brand/80 text-brand-light font-display font-black items-center justify-center text-2xl tracking-wider shadow-glow-red/40 select-none"
              >
                <span>{initials}</span>
              </div>
              <span
                title="Entrenador Oficial"
                className="absolute -bottom-1 -right-1 p-1 bg-brand text-white rounded-full border-2 border-dark-900 shadow-md"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {coachProfile?.nombre || 'Entrenador'}
          </h3>

          {coachProfile?.slogan && (
            <p className="text-xs text-brand-light font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-1.5">
              <Flame className="w-3 h-3 text-brand" />
              {coachProfile.slogan}
            </p>
          )}

          {coachProfile?.email && (
            <p className="text-[11px] text-gray-400 mt-1 tracking-wide">
              {coachProfile.email}
            </p>
          )}

          <span className="inline-block mt-2 text-[10px] uppercase font-extrabold tracking-widest bg-dark-800/90 text-gray-300 border border-dark-700 px-3 py-1 rounded-full">
            Personal Trainer Oficial
          </span>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-left custom-scrollbar">
          {/* Sección Biografía / Sobre mí */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              <User className="w-3.5 h-3.5 text-brand-light" />
              <span>Sobre mí</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-dark-700/60 text-xs sm:text-sm text-gray-300 leading-relaxed">
              <p className="whitespace-pre-line">
                {coachProfile?.biografia || coachProfile?.bio || 'Sin biografía disponible.'}
              </p>
            </div>
          </div>

          {/* Sección Formación y Capacitaciones */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>Formación y Capacitaciones</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-dark-850/80 border border-dark-700/60 space-y-2.5">
              {estudiosLista.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Sin certificaciones registradas.
                </p>
              ) : (
                estudiosLista.map((estudio, idx) => {
                  const texto = typeof estudio === 'string'
                    ? estudio
                    : `${estudio.titulo || ''}${estudio.institucion ? ` - ${estudio.institucion}` : ''}${estudio.anio ? ` (${estudio.anio})` : ''}`.trim() || 'Certificación registrada';
                  return (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-200 font-medium leading-snug">
                        {texto}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pie: Botón directo a WhatsApp */}
        <div className="p-4 sm:p-5 border-t border-dark-800 bg-dark-950/80">
          <a
            href={cleanPhone ? `https://wa.me/${cleanPhone}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98] group"
          >
            <MessageCircle className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span>Consultar por WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </div>
  );
}
