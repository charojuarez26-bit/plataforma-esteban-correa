import React from 'react';
import { 
  HeartPulse, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Pill, 
  FileText 
} from 'lucide-react';

export default function MedicalRecordViewOnly({
  record,
  onOpenEdit,
  isStudentView = true,
  onAuthorizeEdit = null,
  isAuthorizing = false
}) {
  if (!record || !record.completada) {
    return (
      <div className="card-dark rounded-2xl p-6 text-center space-y-3 border border-dark-700">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <HeartPulse className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white">Ficha Médica Pendiente</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          {isStudentView 
            ? 'Aún no has completado tu ficha de salud obligatoria.'
            : 'El alumno todavía no completó su ficha de salud inicial.'}
        </p>
        {isStudentView && onOpenEdit && (
          <button
            type="button"
            onClick={onOpenEdit}
            className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs"
          >
            Completar Ficha Ahora
          </button>
        )}
      </div>
    );
  }

  const lesionesValidas = Array.isArray(record.lesiones) 
    ? record.lesiones.filter(z => z && z !== 'Ninguna') 
    : [];
  const tieneLesiones = lesionesValidas.length > 0;
  const permitirEdicion = Boolean(record.permitir_edicion);

  return (
    <div className="space-y-4">
      
      {/* Banner de Estado y Permiso */}
      {isStudentView ? (
        !permitirEdicion ? (
          <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 text-xs flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              🔒 <b>Ficha bloqueada.</b> Si sufriste alguna lesión o cambio en tu salud, solicítale a Esteban que autorice la edición.
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Edición autorizada por tu entrenador. Puedes actualizar tus datos de salud.</span>
            </div>
            {onOpenEdit && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar Ficha</span>
              </button>
            )}
          </div>
        )
      ) : (
        /* Panel del entrenador: botón para autorizar al alumno */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-900/90 border border-gray-800">
          <div className="flex items-center gap-2 text-xs">
            {permitirEdicion ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Unlock className="w-4 h-4" /> Alumno habilitado para editar su ficha
              </span>
            ) : (
              <span className="text-gray-400 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" /> Ficha bloqueada para el alumno
              </span>
            )}
          </div>

          {onAuthorizeEdit && (
            <button
              type="button"
              disabled={isAuthorizing}
              onClick={() => onAuthorizeEdit(!permitirEdicion)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                permitirEdicion 
                  ? 'bg-gray-800 hover:bg-gray-750 text-gray-300 border border-gray-700'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
            >
              {permitirEdicion ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Revocar permiso de edición</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Autorizar al alumno a editar su ficha</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Contenido de la Ficha Médica */}
      <div className="card-dark rounded-2xl p-4 sm:p-5 border border-dark-700 space-y-4">
        
        {/* Zonas de molestias / lesiones */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Zonas con molestias o lesiones
          </span>
          {tieneLesiones ? (
            <div className="flex flex-wrap gap-1.5">
              {lesionesValidas.map((zona, idx) => (
                <span 
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span>⚠️ Lesión: {zona}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-xl">
              <span>✅ Sin lesiones ni molestias reportadas por el alumno.</span>
            </div>
          )}
        </div>

        {/* Detalle de Lesiones */}
        {record.detalle_lesiones && (
          <div className="space-y-1 bg-dark-900/60 p-3 rounded-xl border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Detalle descriptivo de dolores o cirugías
            </span>
            <p className="text-xs text-gray-200 leading-relaxed font-medium">
              {record.detalle_lesiones}
            </p>
          </div>
        )}

        {/* Condiciones de Salud y Medicamentos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1 bg-dark-900/60 p-3 rounded-xl border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Condiciones de salud / Enfermedades
            </span>
            <p className="text-xs text-white font-medium">
              {record.condiciones_cronicas || 'Ninguna condición registrada'}
            </p>
          </div>

          <div className="space-y-1 bg-dark-900/60 p-3 rounded-xl border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Alergias o Medicación diaria
            </span>
            <p className="text-xs text-white font-medium">
              {record.alergias || record.medicamentos 
                ? [record.alergias ? `Alergias: ${record.alergias}` : null, record.medicamentos ? `Medicamentos: ${record.medicamentos}` : null].filter(Boolean).join(' • ')
                : 'Ninguna medicación ni alergias'}
            </p>
          </div>
        </div>

        {/* Declaración Jurada */}
        <div className="pt-2 border-t border-dark-750 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Declaración jurada firmada digitalmente
          </span>
          {record.actualizado_el && (
            <span>Actualizado: {record.actualizado_el.split('T')[0]}</span>
          )}
        </div>

      </div>

    </div>
  );
}
