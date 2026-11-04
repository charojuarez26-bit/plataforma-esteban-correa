import React, { useState } from 'react';
import BrandLogo from '../common/BrandLogo';
import { authService } from '../../services/authService';
import { User, Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'coach'
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  
  const [coachEmail, setCoachEmail] = useState('');
  const [coachPassword, setCoachPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await authService.loginAlumno({
        nombre: studentName,
        codigo: studentCode
      });
      if (onLoginSuccess) {
        onLoginSuccess(session, '/portal-alumno');
      }
    } catch (err) {
      setError(err.message || 'No se encontró un alumno con ese nombre y código. Consulta con Esteban');
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
    <div className="min-h-screen bg-dark-950 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Luces de fondo ambientación gym premium */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-brand opacity-15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-brand-dark opacity-10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header con Logo */}
      <header className="w-full max-w-md flex justify-center py-4 z-10">
        <BrandLogo size="lg" showSlogan={true} />
      </header>

      {/* Tarjeta Principal de Login */}
      <div className="w-full max-w-md bg-dark-850 border border-dark-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 z-10">
        
        {/* Selector de Rol */}
        <div className="grid grid-cols-2 p-1 bg-dark-900 border border-dark-700 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('student'); setError(null); }}
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
        {/* FORMULARIO 1: ALUMNO (PASSWORDLESS REAL)                  */}
        {/* ========================================================= */}
        {activeTab === 'student' && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Nombre (o Apellido) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: Martín o Gómez"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all pl-10 min-h-[48px]"
                />
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-4" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Código Único de Alumno *
                </label>
                <span className="text-[11px] text-gray-400">Sin contraseña</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: MG-4821"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-base sm:text-sm font-mono tracking-widest text-brand-light placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all pl-10 uppercase min-h-[48px]"
                />
                <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-4" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                ¿No tienes tu código? Solicitáselo a Esteban por WhatsApp.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl shadow-glow-red hover:shadow-brand/50 transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-50 min-h-[48px]"
            >
              <span>{loading ? 'Verificando datos...' : 'Ingresar a Mi Portal'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* FORMULARIO 2: ENTRENADOR (SUPABASE AUTH REAL)             */}
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

      {/* Footer Branding Deportivo */}
      <footer className="w-full max-w-md text-center py-5 z-10">
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
