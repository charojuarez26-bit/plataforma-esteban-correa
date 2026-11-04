import React, { useState } from 'react';

export default function BrandLogoOfficial({ className = '', size = 'md' }) {
  const [imageError, setImageError] = useState(false);

  // Dimensiones según el tamaño
  const logoWidth = size === 'sm' ? 140 : size === 'lg' ? 220 : 190;

  // Si existe /image_4.png en el proyecto y no falla al cargar, lo mostramos
  if (!imageError) {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className}`}>
        <img
          src="/image_4.png"
          alt="Esteban Correa Personal Trainer"
          className="object-contain max-h-24 max-w-[210px] w-auto transition-transform hover:scale-105 duration-300"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Variante SVG/HTML de competición de alta fidelidad:
  // "EC" (E en plata/blanco metálico cromado, C en rojo competición con degradados, barras de mancuerna estilizadas)
  // Seguido de "ESTEBAN CORREA" y "— PERSONAL TRAINER —"
  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      
      {/* Isotipo EC Competición con Mancuerna Estilizada */}
      <div className="relative flex items-center justify-center mb-2.5">
        <svg
          viewBox="0 0 200 90"
          className="w-40 sm:w-44 h-auto drop-shadow-[0_4px_16px_rgba(239,68,68,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradiente Plata / Acero Cromado para la 'E' y discos */}
            <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#e2e8f0" />
              <stop offset="70%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>

            {/* Gradiente Rojo Deportivo de Competición para la 'C' */}
            <linearGradient id="redCompGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4d4d" />
              <stop offset="45%" stopColor="#ef4444" />
              <stop offset="80%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Gradiente Brillo Metálico */}
            <linearGradient id="metalPlate" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* Barra central de soporte posterior */}
          <rect x="25" y="42" width="150" height="6" rx="3" fill="url(#metalPlate)" />

          {/* Disco / Collarín izquierdo */}
          <rect x="18" y="26" width="6" height="38" rx="2" fill="url(#silverGrad)" />
          <rect x="26" y="20" width="8" height="50" rx="3" fill="#dc2626" />
          <rect x="36" y="15" width="7" height="60" rx="3" fill="url(#silverGrad)" />

          {/* Disco / Collarín derecho */}
          <rect x="157" y="15" width="7" height="60" rx="3" fill="url(#silverGrad)" />
          <rect x="166" y="20" width="8" height="50" rx="3" fill="#dc2626" />
          <rect x="176" y="26" width="6" height="38" rx="2" fill="url(#silverGrad)" />

          {/* Letra 'E' en Acero Cromado / Plata */}
          <path
            d="M 62 18 L 102 18 L 102 30 L 78 30 L 78 40 L 98 40 L 98 50 L 78 50 L 78 62 L 104 62 L 104 74 L 62 74 Z"
            fill="url(#silverGrad)"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Letra 'C' en Rojo Deportivo Intenso entrelazada */}
          <path
            d="M 138 28 C 132 19 122 17 110 17 C 94 17 84 29 84 46 C 84 63 95 75 111 75 C 124 75 133 71 138 64 L 126 56 C 122 61 117 63 111 63 C 102 63 96 55 96 46 C 96 36 102 29 110 29 C 117 29 121 31 125 36 Z"
            fill="url(#redCompGrad)"
            stroke="#7f1d1d"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Tipografía de Competición: ESTEBAN CORREA */}
      <div className="flex flex-col items-center">
        <h2 className="font-display font-black text-white text-[15px] sm:text-base tracking-[0.2em] uppercase leading-tight drop-shadow-md">
          ESTEBAN CORREA
        </h2>

        {/* Subtítulo flanqueado por líneas: — PERSONAL TRAINER — */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="w-4 h-[1.5px] bg-red-600 rounded-full"></span>
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.28em] text-red-500">
            PERSONAL TRAINER
          </span>
          <span className="w-4 h-[1.5px] bg-red-600 rounded-full"></span>
        </div>
      </div>

    </div>
  );
}
