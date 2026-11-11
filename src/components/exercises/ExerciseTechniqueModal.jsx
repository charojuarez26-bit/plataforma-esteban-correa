import React from 'react';
import { 
  X, 
  AlertTriangle, 
  Dumbbell, 
  Play, 
  CheckCircle2, 
  Edit3,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export function getEmbedVideoUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();
  // YouTube watch / share
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=1`;
  }
  // YouTube shorts
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([^"&?\/\s]+)/i);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${shortsMatch[1]}&controls=1`;
  }
  return null;
}

export function ExerciseMedia({ videoUrl, imageUrl, title, className = "" }) {
  // Si la url de video es en realidad un archivo GIF, tratarlo como imagen
  const isGifInVideo = videoUrl && (/\.gif(\?.*)?$/i.test(videoUrl) || videoUrl.toLowerCase().includes('.gif'));
  const effectiveImageUrl = isGifInVideo ? videoUrl : imageUrl;
  const effectiveVideoUrl = isGifInVideo ? null : videoUrl;

  const embedUrl = getEmbedVideoUrl(effectiveVideoUrl);

  if (embedUrl) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-black border border-dark-700 shadow-md w-full h-48 sm:h-64 mb-4 ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  const isDirectVideo = effectiveVideoUrl && (effectiveVideoUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) || effectiveVideoUrl.includes('assets.mixkit.co'));
  if (isDirectVideo) {
    return (
      <div className={`relative w-full h-48 sm:h-64 bg-white rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4 border border-dark-700/60 shadow-md ${className}`}>
        <video
          src={effectiveVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          controls
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  if (effectiveVideoUrl && !embedUrl) {
    return (
      <div className={`relative w-full h-48 sm:h-64 bg-white rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4 border border-dark-700/60 shadow-md ${className}`}>
        <video
          src={effectiveVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          controls
          className="w-full h-full object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            const imgFallback = e.target.nextSibling;
            if (imgFallback) imgFallback.style.display = 'block';
          }}
        />
        <img
          src={effectiveImageUrl || effectiveVideoUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          style={{ display: 'none' }}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-48 sm:h-64 bg-white rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4 ${className}`}>
      <img
        src={effectiveImageUrl || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80'}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default function ExerciseTechniqueModal({ exercise, isOpen, onClose, canEdit = false, onEdit }) {
  if (!isOpen || !exercise) return null;

  // Formatear lista de errores comunes
  let errorItems = [];
  if (exercise.errores_comunes) {
    errorItems = exercise.errores_comunes
      .split('\n')
      .map(s => s.trim().replace(/^[-•*]\s*/, ''))
      .filter(Boolean);
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
        
        {/* Cabecera Fija */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand text-white shadow-glow-red">
              {exercise.grupo_muscular || 'General'}
            </span>
            <span className="text-xs text-gray-400 font-medium">Guía Técnica Oficial</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo con scroll independiente (mobile-first) */}
        <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-4 py-3">
          
          {/* Título del ejercicio */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-brand shrink-0" />
              <span>{exercise.nombre}</span>
            </h2>
            {exercise.equipamiento && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-300">
                <span className="text-[10px] uppercase font-bold text-brand-light tracking-wider bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-lg">
                  Equipamiento
                </span>
                <span className="font-medium text-gray-200">{exercise.equipamiento}</span>
              </div>
            )}
          </div>

          {/* Reproductor de Video / Demostración en Loop / Imagen */}
          <ExerciseMedia
            videoUrl={exercise.video_url}
            imageUrl={exercise.gif_url || exercise.imagen_url}
            title={exercise.nombre}
          />

          {/* Bloque de Pautas Técnicas e Instrucciones */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-dark-900 border border-dark-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-brand-light tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                Ejecución Técnica Paso a Paso
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {exercise.instrucciones || 'Mantener columna neutra, control estricto en la fase excéntrica (3 segundos) y aceleración controlada en la fase concéntrica.'}
            </p>
          </div>

          {/* Bloque de Advertencia Destacado: Errores Comunes a Evitar */}
          {errorItems.length > 0 ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-950/40 via-red-950/20 to-dark-900 border border-red-500/40 space-y-2.5 shadow-lg shadow-red-950/30">
              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert className="w-4 h-4 text-brand shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">
                  ⚠️ Errores Comunes a Evitar
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Instrucciones preventivas de Esteban Correa para entrenar sin supervisión directa:
              </p>
              <ul className="space-y-1.5 pt-1">
                {errorItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-red-200/90 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1.5"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-dark-900/60 border border-dark-700 text-xs text-zinc-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Priorizar siempre el rango completo de movimiento y calzado adecuado.</span>
            </div>
          )}

        </div>

        {/* Barra de Acciones Inferior Fija */}
        <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-between shrink-0">
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(exercise);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-gray-300 hover:text-white border border-dark-700 flex items-center gap-1.5 min-h-[44px]"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-light" />
              <span>Editar Ejercicio</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all min-h-[44px]"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
