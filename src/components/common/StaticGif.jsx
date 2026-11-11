import React, { useRef, useEffect, useState } from 'react';

export default function StaticGif({ src, alt = '', className = '' }) {
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageLoaded(false);
      return;
    }

    setImageLoaded(false);
    setHasError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Prevenir problemas de CORS con Supabase Storage

    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setImageLoaded(true);
        }
      }
    };

    img.onerror = () => {
      // Fallback seguro: si falla por CORS con crossOrigin='anonymous', renderizar como img
      setHasError(true);
      setImageLoaded(true);
    };

    img.src = src;
  }, [src]);

  // Si ocurre error de CORS en canvas, fallback seguro para no perder la imagen
  if (hasError) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={className}
      />
    );
  }

  const isContain = className.includes('object-contain');

  return (
    <div className={`relative ${className}`}>
      {/* Mostrar un skeleton o fondo mientras carga */}
      {!imageLoaded && <div className="absolute inset-0 bg-gray-800 animate-pulse rounded"></div>}
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${isContain ? 'object-contain' : 'object-cover'} ${!imageLoaded ? 'invisible' : 'visible'}`}
        aria-label={alt}
      />
    </div>
  );
}
