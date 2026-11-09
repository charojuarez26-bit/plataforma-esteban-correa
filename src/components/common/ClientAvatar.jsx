import React, { useState, useEffect } from 'react';

export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'EC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClientAvatar({
  client,
  fotoUrl,
  name,
  size = 'md', // 'xs' (24), 'sm' (32), 'md' (40), 'lg' (48), 'xl' (64), '2xl' (80), '3xl' (96)
  rounded = 'rounded-full', // Circular por defecto
  className = '',
  showStatus = false,
  status = 'Activo'
}) {
  const [imageError, setImageError] = useState(false);

  const clientName = name || client?.nombre_completo || 'Alumno';
  const rawPhoto = fotoUrl || client?.foto_url || client?.avatar_url || null;
  const photo = typeof rawPhoto === 'string' && rawPhoto.trim() !== '' ? rawPhoto.trim() : null;
  const clientStatus = status || client?.estado || 'Activo';
  const initials = getInitials(clientName);

  // Reiniciar estado de error si cambia la URL de la foto
  useEffect(() => {
    setImageError(false);
  }, [photo]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 sm:w-18 sm:h-18 text-lg font-bold',
    '2xl': 'w-20 h-20 text-xl font-bold',
    '3xl': 'w-24 h-24 text-2xl font-black'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative shrink-0 ${currentSizeClass} ${className}`}>
      {photo && !imageError ? (
        <img
          src={photo}
          alt={clientName}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover ${rounded} overflow-hidden border border-dark-700 shadow-md transition-transform`}
        />
      ) : (
        <div
          className={`w-full h-full ${rounded} overflow-hidden bg-gradient-to-br from-brand/25 via-dark-850 to-dark-900 border border-brand/35 text-brand-light font-display font-black flex items-center justify-center tracking-wider shadow-md select-none`}
          title={clientName}
        >
          <span>{initials}</span>
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark-900 shadow-sm ${
            clientStatus === 'Activo' ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          title={`Estado: ${clientStatus}`}
        />
      )}
    </div>
  );
}