import { supabase } from '../lib/supabase';

const BRANDING_KEY = 'ec_branding';
const EVENT = 'ec-branding-changed';

export const FONT_OPTIONS = [
  { id: 'Inter', label: 'Inter', family: "'Inter', sans-serif", hint: 'Moderna y limpia' },
  { id: 'Oswald', label: 'Oswald', family: "'Oswald', sans-serif", hint: 'Condensada atlética' },
  { id: 'Montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", hint: 'Geométrica elegante' },
  { id: 'Bebas Neue', label: 'Bebas Neue', family: "'Bebas Neue', cursive", hint: 'Mayúsculas de impacto' }
];

// Clases literales (necesarias para que Tailwind las incluya en el build)
export const SIZE_OPTIONS = [
  { id: 'text-base', label: 'Normal', hint: '16px' },
  { id: 'text-xl', label: 'Mediano', hint: '20px' },
  { id: 'text-2xl', label: 'Grande', hint: '24px' },
  { id: 'text-3xl', label: 'Extra Grande', hint: '30px' }
];

export const COLOR_PRESETS = ['#a1a1aa', '#ffffff', '#ef4444', '#dc2626', '#f59e0b', '#eab308', '#fb7185'];

export const DEFAULT_BRANDING = {
  fuente: "'Inter', sans-serif",
  tamano: 'text-base',
  color_base: '#a1a1aa',
  color_destacado: '#ef4444',
  slogan_base: 'Construí tu',
  slogan_destacado: 'mejor versión'
};

export function normalizeBranding(b) {
  return { ...DEFAULT_BRANDING, ...(b && typeof b === 'object' ? Object.fromEntries(Object.entries(b).filter(([, v]) => v)) : {}) };
}

export function getCachedBranding() {
  try {
    return normalizeBranding(JSON.parse(localStorage.getItem(BRANDING_KEY) || 'null'));
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export function cacheBranding(b) {
  const value = normalizeBranding(b);
  try { localStorage.setItem(BRANDING_KEY, JSON.stringify(value)); } catch { /* ignorar */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
  return value;
}

export function onBrandingChange(cb) {
  const h = (e) => cb(e.detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

/** Consulta el branding del entrenador (funciona sin sesión si la política RLS lo permite). */
export async function fetchBranding() {
  try {
    const { data, error } = await supabase.from('coaches').select('*').limit(1).maybeSingle();
    if (!error && data?.branding) return cacheBranding(data.branding);
  } catch { /* usar caché/por defecto */ }
  return getCachedBranding();
}

/** Guarda en coaches.branding (update independiente para no afectar el resto del perfil). */
export async function saveBranding(branding) {
  const value = cacheBranding(branding);
  try {
    const { data: existing } = await supabase.from('coaches').select('*').limit(1).maybeSingle();
    if (existing?.id) {
      const { error } = await supabase.from('coaches').update({ branding: value }).eq('id', existing.id);
      if (error) console.warn('[brandingService] Error en coaches.update:', error.message);
    }
  } catch (e) {
    console.warn('[brandingService] Excepción guardando branding:', e?.message);
  }
  return { branding: value, warning: null };
}
