import React from 'react';
import BrandLogo from './BrandLogo';

// Alias legado: todos los accesos usan el logo compacto unificado.
export default function BrandLogoOfficial({ className = '', size = 'md' }) {
  return <BrandLogo size={size} className={className} />;
}
