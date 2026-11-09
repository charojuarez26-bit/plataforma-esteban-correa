import React, { useId, useState, useEffect } from 'react';
import { getCachedBranding, fetchBranding, onBrandingChange } from '../../services/brandingService';

/**
 * Isotipo "EC": una E cromada y una C roja fusionadas dentro de un escudo atlético.
 */
export function LogoMark({ className = 'w-14 h-14' }) {
  const uid = useId().replace(/:/g, '');
  const silver = `silver-${uid}`;
  const red = `red-${uid}`;
  const shield = `shield-${uid}`;

  return (
    <svg viewBox="0 0 100 112" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={silver} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id={red} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5a5a" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id={shield} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1c22" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
      </defs>

      {/* Escudo con borde plateado y filo rojo */}
      <path d="M50 3 L93 17 L93 58 C93 84 74 100 50 109 C26 100 7 84 7 58 L7 17 Z" fill={`url(#${shield})`} stroke={`url(#${silver})`} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M50 10 L86 22 L86 58 C86 79 70 93 50 101 C30 93 14 79 14 58 L14 22 Z" stroke="#dc2626" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />

      {/* C roja (eslabón) detrás */}
      <path
        d="M80 36 C74 27 64 22 53 22 C36 22 24 34 24 54 C24 74 37 86 54 86 C65 86 74 81 80 72 L68 63 C64 68 59 70 54 70 C46 70 40 64 40 54 C40 44 46 38 53 38 C58 38 62 40 66 45 Z"
        fill={`url(#${red})`}
        stroke="#450a0a"
        strokeWidth="1.2"
      />

      {/* E cromada al frente */}
      <path
        d="M30 30 L62 30 L62 40 L42 40 L42 49 L58 49 L58 58 L42 58 L42 67 L64 67 L64 77 L30 77 Z"
        fill={`url(#${silver})`}
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Logo compacto tipo firma: isotipo EC + nombre + "PERSONAL TRAINER".
 */
export default function BrandLogo({ size = 'md', className = '' }) {
  const mark = size === 'sm' ? 'w-6 h-7' : size === 'lg' ? 'w-9 h-10' : 'w-7 h-8';
  const name = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs';
  const sub = size === 'sm' ? 'text-[8px]' : 'text-[9px]';

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <LogoMark className={`${mark} shrink-0`} />
      <div className="flex flex-col leading-none text-left">
        <span className={`${name} font-bold uppercase tracking-wider text-white`}>ESTEBAN CORREA</span>
        <span className={`${sub} mt-1 font-semibold uppercase tracking-[0.2em] text-red-500`}>PERSONAL TRAINER</span>
      </div>
    </div>
  );
}

/** Slogan configurable desde Configuración (fuente, tamaño y colores). */
export function MotivationalSlogan({ className = '', branding: override }) {
  const [branding, setBranding] = useState(() => override || getCachedBranding());

  useEffect(() => {
    if (override) { setBranding(override); return undefined; }
    let alive = true;
    fetchBranding().then((b) => alive && setBranding(b));
    const off = onBrandingChange((b) => setBranding(b));
    return () => { alive = false; off(); };
  }, [override]);

  return (
    <p className={`${branding.tamano} tracking-wide transition-all ${className}`} style={{ fontFamily: branding.fuente }}>
      <span style={{ color: branding.color_base }}>{branding.slogan_base} </span>
      <span style={{ color: branding.color_destacado }} className="font-bold">
        {branding.slogan_destacado}
      </span>
    </p>
  );
}
