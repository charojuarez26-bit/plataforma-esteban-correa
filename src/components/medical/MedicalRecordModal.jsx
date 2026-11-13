import React, { useState } from 'react';
import { 
  HeartPulse, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  FileText, 
  Lock, 
  Edit3, 
  Save, 
  Info 
} from 'lucide-react';
import { dataService } from '../../services/dataService';

export const ZONAS_MOLESTIAS = [
  'Ninguna',
  'Cuello',
  'Hombros',
  'Zona Lumbar',
  'Cadera',
  'Rodillas',
  'Tobillos'
];

export default function MedicalRecordModal({
  isOpen,
  onClose,
  clientId,
  existingRecord,
  isMandatory = false,
  onSaved
}) {
  const [selectedZonas, setSelectedZonas] = useState(() => {
    if (!existingRecord?.lesiones || existingRecord.lesiones.length === 0) {
      return ['Ninguna'];
    }
    return existingRecord.lesiones;
  });
  const [detalleLesiones, setDetalleLesiones] = useState(existingRecord?.detalle_lesiones || '');
  const [condiciones, setCondiciones] = useState(existingRecord?.condiciones_cronicas || '');
  const [alergias, setAlergias] = useState(existingRecord?.alergias || '');
  const [medicamentos, setMedicamentos] = useState(existingRecord?.medicamentos || '');
  const [declaracion, setDeclaracion] = useState(Boolean(existingRecord?.declaracion_jurada));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const toggleZona = (zona) => {
    if (zona === 'Ninguna') {
      // Si selecciona "Ninguna", desmarca todas las demás
      setSelectedZonas(['Ninguna']);
      return;
    }

    setSelectedZonas(prev => {
      // Si selecciona cualquier otra zona, desmarca "Ninguna"
      const sinNinguna = prev.filter(z => z !== 'Ninguna');
      if (sinNinguna.includes(zona)) {
        const filtradas = sinNinguna.filter(z => z !== zona);
        // Si no queda ninguna seleccionada, opcionalmente puede volver a 'Ninguna'
        return filtradas.length === 0 ? ['Ninguna'] : filtradas;
      } else {
        return [...sinNinguna, zona];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validación estricta previa al envío: id real y sin ceros
    if (!clientId || typeof clientId !== 'string' || clientId.includes('00000000')) {
      const msg = 'Error: Sesión no válida o ID de alumno inexistente.';
      setErrorMsg(msg);
      alert(msg);
      return;
    }

    if (!declaracion) {
      setErrorMsg('Debes aceptar la declaración jurada para continuar.');
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanStudentId = String(clientId).trim();

      const saved = await dataService.saveMedicalRecord({
        clientId: cleanStudentId,
        lesiones: selectedZonas,
        detalleLesiones,
        condicionesCronicas: condiciones,
        alergias,
        medicamentos,
        declaracionJurada: true,
        completada: true,
        permitirEdicion: false
      });

      if (!saved || !saved.id) {
        throw new Error('No se pudo confirmar el guardado en la base de datos.');
      }

      // Solo si el guardado en Supabase fue exitoso, se notifica y se cierra
      if (onSaved) onSaved(saved);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error crítico al guardar ficha médica en Supabase:', err);
      setErrorMsg('No se pudo guardar la ficha médica en el servidor. Por favor, intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl p-4 sm:p-6 my-auto text-left space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        
        {/* Cabecera */}
        <div className="flex items-start gap-3 border-b border-gray-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-brand-light shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                Ficha Médica y de Salud Inicial
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isMandatory 
                ? 'Obligatorio: Tu coach necesita conocer tu estado físico antes de iniciar tu rutina.' 
                : 'Actualiza tus antecedentes médicos y molestias.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* 1. Selector múltiple de zonas con molestias/lesiones */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-300 uppercase tracking-wider block text-[11px]">
              1. Zonas con molestias o lesiones previas
            </label>
            <p className="text-[11px] text-gray-400">
              Selecciona las zonas que te generen dolor o requieran cuidado:
            </p>
            {/* Opción destacada: Ninguna / No tengo dolores ni lesiones */}
            <div className="pt-1">
              {(() => {
                const isNinguna = selectedZonas.includes('Ninguna');
                return (
                  <button
                    type="button"
                    onClick={() => toggleZona('Ninguna')}
                    className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-between border ${
                      isNinguna
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                        : 'bg-gray-800/60 text-gray-400 border-gray-700/80 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">🛡️</span>
                      <span>Ninguna / No tengo dolores ni lesiones</span>
                    </span>
                    {isNinguna && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })()}
            </div>

            {/* Zonas corporales específicas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {ZONAS_MOLESTIAS.filter(z => z !== 'Ninguna').map((zona) => {
                const isSelected = selectedZonas.includes(zona);
                return (
                  <button
                    key={zona}
                    type="button"
                    onClick={() => toggleZona(zona)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-red-500/20 text-brand-light border-red-500/60 shadow-sm'
                        : 'bg-gray-800/60 text-gray-400 border-gray-700/80 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span>{zona}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Textarea: Detalle de lesiones o dolores al moverte */}
          <div className="space-y-1">
            <label className="font-bold text-gray-300 uppercase tracking-wider block text-[11px]">
              2. Detalle de lesiones o dolores al entrenar
            </label>
            <textarea
              rows={2}
              value={detalleLesiones}
              onChange={(e) => setDetalleLesiones(e.target.value)}
              placeholder="Ej: Hernia lumbar L5-S1 diagnosticada, dolor de hombro derecho en press militar..."
              className="w-full bg-gray-800/80 border border-gray-700 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand"
            />
          </div>

          {/* 3. Condiciones de salud */}
          <div className="space-y-1">
            <label className="font-bold text-gray-300 uppercase tracking-wider block text-[11px]">
              3. Condiciones de salud
            </label>
            <input
              type="text"
              value={condiciones}
              onChange={(e) => setCondiciones(e.target.value)}
              placeholder="Asma, hipertensión, diabetes, problemas cardíacos, etc. (o 'Ninguna')"
              className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand"
            />
          </div>

          {/* 4. Alergias o toma de medicamentos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-gray-300 uppercase tracking-wider block text-[11px]">
                4. Alergias
              </label>
              <input
                type="text"
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                placeholder="Alergias alimentarias o medicamentos..."
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-300 uppercase tracking-wider block text-[11px]">
                5. Toma diaria de medicamentos
              </label>
              <input
                type="text"
                value={medicamentos}
                onChange={(e) => setMedicamentos(e.target.value)}
                placeholder="Medicamentos regulares (o 'Ninguno')"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* 5. Checkbox obligatorio de Declaración Jurada */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-800/50 border border-gray-700/80 cursor-pointer hover:bg-gray-800/80 transition-colors">
              <input
                type="checkbox"
                checked={declaracion}
                onChange={(e) => setDeclaracion(e.target.checked)}
                className="mt-0.5 rounded border-gray-600 text-brand focus:ring-0 shrink-0 w-4 h-4 cursor-pointer"
                required
              />
              <span className="text-[11px] text-gray-300 leading-relaxed">
                <b>Declaro bajo juramento</b> que los datos ingresados son reales, fidedignos y me encuentro en condiciones físicas y de salud para realizar actividad deportiva bajo supervisión.
              </span>
            </label>
          </div>

          {/* Aviso de bloqueo posterior */}
          <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 px-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>Una vez guardada, la ficha quedará bloqueada. Solo tu entrenador podrá autorizar una nueva edición.</span>
          </div>

          {/* Botón de Guardado */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white bg-gray-800 font-bold text-xs"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !declaracion}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wide transition-all shadow-glow-red disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar y Confirmar Ficha'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
