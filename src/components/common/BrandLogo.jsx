import React from 'react';
import { Dumbbell } from 'lucide-react';

export default function BrandLogo({ size = 'md', showSlogan = false }) {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <div className="flex items-center gap-3">
      {/* Isotipo Mancuerna Estilizada */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark p-2 text-white shadow-glow-red transition-transform hover:scale-105 ${
        isSmall ? 'w-9 h-9' : isLarge ? 'w-14 h-14' : 'w-11 h-11'
      }`}>
        <Dumbbell className={`${isSmall ? 'w-5 h-5' : isLarge ? 'w-8 h-8' : 'w-6 h-6'} stroke-[2.2]`} />
        <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"></span>
        </span>
      </div>

      {/* Tipografía de Marca */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-display font-black tracking-wider text-white text-lg lg:text-xl">
            EC
          </span>
          <span className="h-3 w-px bg-dark-700"></span>
          <span className="font-display font-bold tracking-tight text-gray-200 text-sm lg:text-base">
            ESTEBAN CORREA
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-brand-light mt-0.5">
          PERSONAL TRAINER
        </span>
        {showSlogan && (
          <span className="font-script text-base text-red-500 font-bold mt-1 tracking-wide">
            "Construí tu mejor versión"
          </span>
        )}
      </div>
    </div>
  );
}
