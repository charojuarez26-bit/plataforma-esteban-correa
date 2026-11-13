import React, { useState, useEffect, useRef } from 'react';
import BrandLogo, { MotivationalSlogan } from '../common/BrandLogo';
import { authService } from '../../services/authService';
import { supabase } from '../../lib/supabaseClient';
import { 
  User, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  AlertCircle, 
  MessageCircle, 
  Sparkles, 
  UserCheck,
  ChevronRight,
  Loader2 
} from 'lucide-react';

export function LoginView({ onLoginSuccess, onStartOnboarding }) {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'coach'
  const [studentMode, setStudentMode] = useState('select'); // 'select' | 'first_time' | 'existing'
  
  // Opción 1: "Es mi primera vez" (Código de 4 dígitos del coach)
  const [studentPin, setStudentPin] = useState(['', '', '', '']);
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  
  // Opción 2: "Ya tengo mi cuenta" (Nombre y Código asignado)
  const [existingName, setExistingName] = useState('');
  const [existingCode, setExistingCode] = useState('');

  // Entrenador
  const [coachEmail, setCoachEmail] = useState('');
  const [coachPassword, setCoachPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem('auth_expired_notice') || 
        (window.location.search.includes('expired=true') ? 'Tu sesión ha expirado. Por favor, ingresa nuevamente.' : null);
      if (notice) {
        setError(notice);
        setActiveTab('coach');
        sessionStorage.removeItem('auth_expired_notice');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Manejo de "Es mi primera vez" (código de 4 dígitos del entrenador)
  const handleFirstTimeSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setError(null);
    const code = studentPin.join('').trim().toUpperCase();

    if (!code || code.length < 4) {
      setError('Por favor introduce los 4 dígitos del código de tu entrenador.');
      return;
    }

    setLoading(true);
    try {
      const verified = await authService.verifyCoachInvitationCode(code);
      if (verified && onStartOnboarding) {
        onStartOnboarding(code);
      }
    } catch (err) {
      setError(err.message || 'Código de invitación de 4 dígitos no reconocido. Solicítaselo a Esteban Correa.');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de "Ya tengo mi cuenta" (Nombre + Código Asignado)
  const handleExistingStudentSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setError(null);

    // 1. Coincidencia exacta: aplicamos .trim().toUpperCase() al código
    const cleanName = existingName.trim();
    const cleanCode = existingCode.trim().toUpperCase();

    if (!cleanName) {
      setError('Por favor ingresa tu nombre y apellido.');
      return;
    }
    if (!cleanCode) {
      setError('Por favor ingresa tu código o identificador asignado.');
      return;
    }

    setLoading(true);
    try {
      // 2. Consulta a Supabase utilizando .eq('access_code', cleanCode) (COINCIDENCIA EXACTA)
      let { data: alumnos, error: queryError } = await supabase
        .from('clients')
        .select('*')
        .eq('access_code', cleanCode);

      if (queryError) {
        throw queryError;
      }

      let alumno = null;
      if (alumnos && alumnos.length > 0) {
        const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const normInput = normalize(cleanName);
        alumno = alumnos.find(c => {
          const normDb = normalize(c.nombre_completo || c.nombre || '');
          return normDb.includes(normInput) || normInput.includes(normDb) || normInput.split(' ')[0] === normDb.split(' ')[0];
        }) || alumnos[0];
      }

      if (!alumno) {
        throw new Error('No se encontró un alumno con ese código asignado. Verifica los datos o consulta con Esteban Correa.');
      }

      if ((alumno.estado || '').toLowerCase() === 'inactivo') {
        throw new Error('Tu cuenta se encuentra pausada o inactiva. Comunícate con Esteban Correa.');
      }

      // 3. Si la consulta es exitosa, guardar en localStorage y redirigir
      localStorage.setItem('active_student_id', alumno.id);
      localStorage.setItem('alumno_session', JSON.stringify(alumno));

      const status = await authService.checkStudentOnboardingStatus(alumno.id, alumno);

      const userSession = {
        role: 'student',
        user: alumno,
        token: `student-session-${alumno.id}`,
        onboardingVerified: !status.needsOnboarding,
        loggedAt: new Date().toISOString()
      };

      authService.saveSession(userSession);

      if (onLoginSuccess) {
        onLoginSuccess(userSession, '/portal-alumno');
      }
    } catch (err) {
      console.error('[LoginView] Error en login de alumno:', err);
      setError(err.message || 'No se encontró un alumno con ese código exacto y nombre. Verifica tus datos o consulta con Esteban Correa.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoachSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await authService.loginEntrenador({
        email: coachEmail,
        password: coachPassword
      });
      if (onLoginSuccess) {
        onLoginSuccess(session, '/admin');
      }
    } catch (err) {
      setError(err.message || 'Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 pb-8 sm:pb-12 relative overflow-hidden">
      {/* Luces de fondo ambientación gym premium */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-brand opacity-15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-brand-dark opacity-10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header con Logo */}
      <header className="w-full max-w-md flex justify-start py-4 z-10">
        <BrandLogo size="md" />
      </header>

      {/* Tarjeta Principal de Login */}
      <div className="w-full max-w-md bg-dark-850 border border-dark-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 z-10">

        {/* Bienvenida */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-white">¡Hola, de nuevo!</h1>
          <MotivationalSlogan className="mt-1" />
        </div>

        {/* Selector de Rol */}
        <div className="grid grid-cols-2 p-1 bg-dark-900 border border-dark-700 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('student'); setStudentMode('select'); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'student'
                ? 'bg-brand text-white shadow-lg shadow-brand/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Soy Alumno</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('coach'); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'coach'
                ? 'bg-dark-800 text-white border border-dark-700'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-brand-light" />
            <span>Soy Entrenador</span>
          </button>
        </div>

        {/* Alerta de Error estilizada en rojo */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-shake shadow-md">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span className="font-semibold leading-tight">{error}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECCIÓN 1: ALUMNO (FLUJO DUAL CON SELECTOR INICIAL)       */}
        {/* ========================================================= */}
        {activeTab === 'student' && (
          <div className="space-y-4">
            
            {/* SUB-VISTA A: PANTALLA DE SELECCIÓN INICIAL */}
            {studentMode === 'select' && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="text-center pb-1">
                  <span className="text-[11px] font-bold text-brand-light uppercase tracking-wider bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                    Acceso para Alumnos
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white mt-2.5">
                    ¿Cómo deseas ingresar?
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Selecciona una opción para continuar:
                  </p>
                </div>

                {/* Botón 1: Es mi primera vez */}
                <button
                  type="button"
                  onClick={() => { setStudentMode('first_time'); setError(null); }}
                  className="w-full text-left p-4 rounded-2xl bg-dark-900/90 border border-dark-700 hover:border-brand transition-all flex items-center justify-between group active:scale-[0.99] shadow-lg shadow-black/40 hover:shadow-brand/20 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-brand/15 border border-brand/35 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                      <Sparkles className="w-6 h-6 text-brand-light" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-light bg-brand/20 px-2 py-0.5 rounded-full border border-brand/30">
                          Nuevo Registro
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white group-hover:text-brand-light transition-colors mt-0.5">
                        Es mi primera vez
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">
                        Tengo el código de 4 dígitos de mi coach para crear mi perfil y ficha médica.
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-650 flex items-center justify-center text-gray-400 group-hover:text-brand-light group-hover:border-brand/50 group-hover:translate-x-1 transition-all shrink-0 ml-2">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                {/* Botón 2: Ya tengo mi cuenta */}
                <button
                  type="button"
                  onClick={() => { setStudentMode('existing'); setError(null); }}
                  className="w-full text-left p-4 rounded-2xl bg-dark-900/90 border border-dark-700 hover:border-emerald-500/80 transition-all flex items-center justify-between group active:scale-[0.99] shadow-lg shadow-black/40 hover:shadow-emerald-500/10 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                          Alumno Activo
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors mt-0.5">
                        Ya tengo mi cuenta
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">
                        Ingresar directamente con mi nombre y código asignado.
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-650 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 group-hover:border-emerald-500/50 group-hover:translate-x-1 transition-all shrink-0 ml-2">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <p className="text-[11px] text-gray-500 text-center pt-2">
                  ¿Dudas sobre cómo ingresar? Consulta con Esteban Correa por WhatsApp.
                </p>
              </div>
            )}

            {/* SUB-VISTA B: ES MI PRIMERA VEZ (CÓDIGO DE 4 DÍGITOS DEL COACH) */}
            {studentMode === 'first_time' && (
              <form onSubmit={handleFirstTimeSubmit} className="space-y-4 animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => { setStudentMode('select'); setError(null); }}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al selector</span>
                </button>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-brand/15 border border-brand/35 text-brand flex items-center justify-center mx-auto mb-2.5">
                    <Sparkles className="w-6 h-6 text-brand-light" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Código de Invitación (4 dígitos)
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Introduce el código provisto por Esteban para iniciar tu registro y ficha médica.
                  </p>
                </div>

                {/* Casillas de los 4 dígitos */}
                <div
                  className="flex justify-center items-center gap-3 sm:gap-4 my-3"
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
                    if (!pasted) return;
                    const newDigits = ['', '', '', ''];
                    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
                    setStudentPin(newDigits);
                    if (pasted.length === 4) {
                      pinRefs[3].current?.focus();
                      authService.verifyCoachInvitationCode(pasted).then(() => {
                        if (onStartOnboarding) onStartOnboarding(pasted);
                      }).catch((err) => {
                        setError(err.message || 'Código de invitación de 4 dígitos incorrecto. Solicítaselo a tu entrenador Esteban Correa.');
                      });
                    }
                  }}
                >
                  {studentPin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={pinRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={digit}
                      onChange={(e) => {
                        setError(null);
                        const clean = e.target.value.replace(/[^0-9]/g, '').slice(-1);
                        const updated = [...studentPin];
                        updated[idx] = clean;
                        setStudentPin(updated);
                        if (clean && idx < 3) {
                          pinRefs[idx + 1].current?.focus();
                        }
                        if (updated.join('').length === 4) {
                          const full = updated.join('');
                          authService.verifyCoachInvitationCode(full).then(() => {
                            if (onStartOnboarding) onStartOnboarding(full);
                          }).catch((err) => {
                            setError(err.message || 'Código de invitación de 4 dígitos incorrecto. Solicítaselo a tu entrenador Esteban Correa.');
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !studentPin[idx] && idx > 0) {
                          pinRefs[idx - 1].current?.focus();
                        }
                      }}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-black text-brand-light bg-dark-900 border border-dark-700 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none transition-all shadow-inner"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || studentPin.some(d => !d)}
                  className="w-full py-3.5 px-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl shadow-glow-red hover:shadow-brand/50 transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-40 min-h-[48px] text-sm active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando código...</span>
                    </>
                  ) : (
                    <>
                      <span>Continuar al Registro</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setStudentMode('existing'); setError(null); }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    ¿Ya tienes una cuenta creada? <span className="text-brand-light font-bold underline">Ingresa aquí</span>
                  </button>
                </div>
              </form>
            )}

            {/* SUB-VISTA C: YA TENGO MI CUENTA (NOMBRE + CÓDIGO ASIGNADO) */}
            {studentMode === 'existing' && (
              <form onSubmit={handleExistingStudentSubmit} className="space-y-4 animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => { setStudentMode('select'); setError(null); }}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al selector</span>
                </button>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Ingreso para Alumnos
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Ingresa tu nombre y tu código asignado para entrar a tu Dashboard.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Tu Nombre Completo *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej: Juan Pérez"
                        value={existingName}
                        onChange={(e) => setExistingName(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pl-10 min-h-[48px]"
                      />
                      <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-4" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Código o Identificador Asignado *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej: JP-9505 o 9505"
                        value={existingCode}
                        onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                        className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pl-10 min-h-[48px] font-mono tracking-wider"
                      />
                      <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-4" />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Es el código provisto por tu entrenador (ej: iniciales + 4 números).
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !existingName.trim() || !existingCode.trim()}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-40 min-h-[48px] text-sm active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando alumno...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar a Mi Portal</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setStudentMode('first_time'); setError(null); }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    ¿Es tu primera vez con Esteban? <span className="text-brand-light font-bold underline">Regístrate aquí</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* SECCIÓN 2: ENTRENADOR (SUPABASE AUTH REAL)                */}
        {/* ========================================================= */}
        {activeTab === 'coach' && (
          <form onSubmit={handleCoachSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Email de Entrenador *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="correo@ejemplo.com"
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all pl-10 min-h-[48px]"
                />
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-4" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={coachPassword}
                  onChange={(e) => setCoachPassword(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all pl-10 min-h-[48px]"
                />
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-brand to-brand-dark text-white font-bold rounded-xl shadow-glow-red transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-50 min-h-[48px]"
            >
              <span>{loading ? 'Verificando con Supabase...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        )}

      </div>

      {/* Leyenda de autoría y contacto con acceso a WhatsApp */}
      <div className="mt-6 mb-2 text-center z-10">
        <a
          href="https://wa.me/5493816096311"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-dark-800/60 active:scale-95 group"
          title="Contactar por WhatsApp a PM Soluciones Digitales"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-500/70 group-hover:text-emerald-400 shrink-0 transition-transform group-hover:scale-110" />
          <span>
            Desarrollado por <span className="font-semibold text-gray-400 group-hover:text-gray-200">PM Soluciones Digitales</span> • 3816096311
          </span>
        </a>
      </div>

      {/* Footer Branding Deportivo */}
      <footer className="w-full max-w-md text-center py-4 z-10">
        <p className="text-xs tracking-[0.25em] font-extrabold text-gray-300 uppercase select-none">
          DISCIPLINA • CONSTANCIA • RESULTADOS
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          Plataforma de Alto Rendimiento • Esteban Correa Personal Trainer
        </p>
      </footer>
    </div>
  );
}

export default LoginView;
