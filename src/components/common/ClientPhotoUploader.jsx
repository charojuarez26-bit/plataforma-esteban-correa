import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, RefreshCw, UploadCloud } from 'lucide-react';

export default function ClientPhotoUploader({
  initialUrl = null,
  currentPhoto = null,
  onPhotoSelected,
  onPhotoSelect,
  onPhotoRemoved,
  onPhotoRemove,
  className = ''
}) {
  const [previewUrl, setPreviewUrl] = useState(initialUrl || currentPhoto || null);
  const fileInputCameraRef = useRef(null);
  const fileInputGalleryRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(initialUrl || currentPhoto || null);
  }, [initialUrl, currentPhoto]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Crear vista previa local inmediata
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    if (onPhotoSelected) {
      onPhotoSelected(file, objectUrl);
    }
    if (onPhotoSelect) {
      onPhotoSelect(file, objectUrl);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    if (fileInputCameraRef.current) fileInputCameraRef.current.value = '';
    if (fileInputGalleryRef.current) fileInputGalleryRef.current.value = '';

    if (onPhotoRemoved) {
      onPhotoRemoved();
    }
    if (onPhotoRemove) {
      onPhotoRemove();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* Inputs ocultos para captura directa de cámara y selección desde galería/disco */}
      <input
        type="file"
        ref={fileInputCameraRef}
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={fileInputGalleryRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        /* VISTA PREVIA INSTANTÁNEA (80x80px) */
        <div className="flex flex-col items-center space-y-2">
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Foto del alumno"
              className="w-20 h-20 rounded-full object-cover border-2 border-brand shadow-glow-red/30 transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
              title="Quitar foto"
              aria-label="Quitar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => fileInputGalleryRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-zinc-300 hover:text-white border border-dark-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3 text-brand" />
              <span>Cambiar</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputCameraRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-zinc-300 hover:text-white border border-dark-700 text-[11px] font-semibold transition-colors flex items-center gap-1 sm:hidden"
              title="Tomar nueva selfie o foto con la cámara"
            >
              <Camera className="w-3 h-3 text-brand" />
              <span>Cámara</span>
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="px-2 py-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/30 text-[11px] font-semibold transition-colors"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        /* SELECTOR VISUAL SIN FOTO (Círculo con borde punteado #ef4444) */
        <div className="flex flex-col items-center space-y-2">
          <div
            onClick={() => fileInputGalleryRef.current?.click()}
            className="w-20 h-20 rounded-full border-2 border-dashed border-brand hover:border-brand-light bg-brand/10 hover:bg-brand/15 flex flex-col items-center justify-center cursor-pointer transition-all group shadow-inner shadow-brand/10"
            title="Toca para subir o tomar foto"
          >
            <Camera className="w-7 h-7 text-brand group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-extrabold text-brand-light mt-0.5 uppercase tracking-tight">
              Foto
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputGalleryRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm hover:border-brand/40 min-h-[38px]"
            >
              <UploadCloud className="w-3.5 h-3.5 text-brand" />
              <span>Subir Archivo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputCameraRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-brand/15 hover:bg-brand/25 border border-brand/40 text-xs font-bold text-brand-light transition-all flex items-center gap-1.5 shadow-sm min-h-[38px]"
            >
              <Camera className="w-3.5 h-3.5 text-brand" />
              <span>Tomar Foto</span>
            </button>
          </div>
          <p className="text-[10px] text-zinc-500">JPG, PNG o WebP (Cámara o Galería)</p>
        </div>
      )}
    </div>
  );
}