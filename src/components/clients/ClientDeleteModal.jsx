import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Diálogo de confirmación para eliminar un alumno de la tabla `clients`.
 */
export default function ClientDeleteModal({ client, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !deleting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, deleting]);

  if (!client) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)
        .select('id');

      if (dbError) throw dbError;
      if (!data || data.length === 0) {
        throw new Error('No se eliminó ningún registro. Verifica tus permisos (RLS) en Supabase.');
      }

      try { localStorage.removeItem(`ec_client_meta_${client.id}`); } catch { /* ignorar */ }
      onDeleted(client.id);
    } catch (err) {
      console.error('Error eliminando alumno:', err);
      setError(err?.message || 'No se pudo eliminar el alumno.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
         onClick={() => !deleting && onClose()}>
      <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
           className="w-full max-w-md card-dark rounded-2xl p-6 space-y-4 border border-dark-700">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Eliminar alumno</h2>
            <p className="text-sm text-gray-300 mt-1">
              ¿Estás seguro de que deseas eliminar al alumno <strong className="text-white">{client.nombre_completo}</strong>?
              {' '}Esta acción borrará sus datos y evaluaciones asociadas.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={deleting}
                  className="px-4 py-2.5 rounded-xl border border-dark-700 text-gray-300 hover:text-white text-xs sm:text-sm font-bold">
            Cancelar
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 disabled:opacity-60">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
