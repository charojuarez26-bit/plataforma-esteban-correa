import React, { useEffect } from 'react';
import { X, Phone, Mail, MessageCircle, Info } from 'lucide-react';
import BrandLogoOfficial from './common/BrandLogoOfficial';

/**
 * Modal "Acerca de" (About)
 * Presenta la información de versión, créditos de desarrollo y canales de contacto directo.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controla si el modal está visible
 * @param {Function} props.onClose - Función para cerrar el modal
 */
export default function AboutModal({ isOpen, onClose }) {
  // Manejo de tecla Escape para accesibilidad
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-gray-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón 'X' de cierre arriba a la derecha */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo / Cabecera */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="scale-90 mb-2">
            <BrandLogoOfficial size="sm" />
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight mt-1">
            Esteban Correa Trainer
          </h3>

          {/* Badge de versión */}
          <div className="mt-2">
            <span className="bg-red-500/10 text-red-500 text-xs px-2.5 py-1 rounded-full font-semibold border border-red-500/20">
              Versión 1.0
            </span>
          </div>
        </div>

        {/* Separador */}
        <div className="my-5 border-t border-gray-800" />

        {/* Bloque del Desarrollador */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            Desarrollada por
          </p>
          <h4 className="text-base sm:text-lg font-extrabold text-white tracking-wide font-sans">
            PM Soluciones Digitales
          </h4>
          <p className="text-[11px] text-gray-400">
            Desarrollo de software y soluciones a medida
          </p>
        </div>

        {/* Canales de contacto interactivos */}
        <div className="mt-5 space-y-2.5">
          {/* Teléfono / WhatsApp */}
          <a
            href="https://wa.me/5493816096311"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-xs sm:text-sm transition-all group shadow-sm"
          >
            <MessageCircle className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span>+54 9 381 609-6311</span>
          </a>

          {/* Email de soporte / consultas */}
          <a
            href="mailto:charojuarez26@gmail.com"
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-semibold text-xs sm:text-sm transition-all group shadow-sm"
          >
            <Mail className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span className="truncate">charojuarez26@gmail.com</span>
          </a>
        </div>

        {/* Pie legal */}
        <p className="text-xs text-gray-500 mt-5">
          © 2026 PM Soluciones Digitales. Todos los derechos reservados.
        </p>

        {/* Botón inferior de cierre rápido */}
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-800 hover:bg-gray-700 text-white w-full py-2.5 rounded-xl font-medium mt-4 transition-colors text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
