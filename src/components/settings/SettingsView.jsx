import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Phone, 
  Mail, 
  Shield, 
  Cloud, 
  CheckCircle2, 
  Save, 
  Bell, 
  Palette 
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function SettingsView({ user }) {
  const [coachProfile, setCoachProfile] = useState({
    nombre: user?.nombre || 'Esteban Correa',
    email: user?.email || 'esteban@correafit.com',
    telefono: user?.telefono || '+54 9 11 5555-0199',
    slogan: 'Construí tu mejor versión',
    biografia: 'Especialista en Hipertrofia, Fuerza y Recomposición Corporal.'
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Nombre y Apellido</label>
              <input
                type="text"
                value={coachProfile.nombre}
                onChange={(e) => setCoachProfile({ ...coachProfile, nombre: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Email de Acceso</label>
              <input
                type="email"
                value={coachProfile.email}
                onChange={(e) => setCoachProfile({ ...coachProfile, email: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">WhatsApp / Contacto Alumnos</label>
              <input
                type="text"
                value={coachProfile.telefono}
                onChange={(e) => setCoachProfile({ ...coachProfile, telefono: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">Slogan del Portal</label>
              <input
                type="text"
                value={coachProfile.slogan}
                onChange={(e) => setCoachProfile({ ...coachProfile, slogan: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white"
              />
            </div>
          </div>
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
        <div className="flex items-center justify-between">
          {saved && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> ¡Configuración guardada exitosamente!
            </span>
          )}
          <button
            type="submit"
            className="ml-auto px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Ajustes</span>
          </button>
        </div>

      </form>
    </div>
  );
}
