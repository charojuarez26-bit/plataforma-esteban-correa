import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, 
  X, 
  Search, 
  AlertTriangle, 
  Check, 
  HeartPulse, 
  Loader2,
  Dumbbell,
  Edit2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { dataService } from '../../services/dataService';

export default function AssignRoutineModal({
  isOpen,
  onClose,
  routine,
  clients = [],
  routines = [],
  onSuccess,
  onQuickEdit
}) {
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);
  const [loadingMedical, setLoadingMedical] = useState(false);

  // Limpiar selección al abrir o cambiar de rutina
  useEffect(() => {
    if (isOpen) {
      setSelectedClientIds([]);
      setSearchQuery('');
      setErrorMessage('');
      setSelectedMedicalRecord(null);
    }
  }, [isOpen, routine?.id]);

  // Cargar ficha médica si se selecciona un único alumno
  useEffect(() => {
    if (selectedClientIds.length === 1) {
      const targetId = selectedClientIds[0];
      setLoadingMedical(true);
      dataService.getMedicalRecord(targetId)
        .then(med => {
          setSelectedMedicalRecord(med);
        })
        .catch(() => {
          setSelectedMedicalRecord(null);
        })
        .finally(() => {
          setLoadingMedical(false);
        });
    } else {
      setSelectedMedicalRecord(null);
      setLoadingMedical(false);
    }
  }, [selectedClientIds]);

  // 1. Cruce con rutinas para detectar alumnos con la misma rutina o con otra activa
  const clientRoutineStatus = useMemo(() => {
    if (!routine) return {};
    const statusMap = {};

    const cleanBaseName = (routine.nombre || '')
      .replace(/\s*\(Plantilla\)/gi, '')
      .replace(/\s*\(Asignada\)/gi, '')
      .replace(/\s*-\s*[^-]+$/, '')
      .trim()
      .toLowerCase();

    clients.forEach(client => {
      const clientRoutines = (routines || []).filter(r => 
        r.client_id === client.id && 
        !r.es_plantilla &&
        r.activa === true
      );

      // Verificar si ya tiene esta misma rutina (por ID o por nombre base)
      const sameRoutine = clientRoutines.find(r => {
        const rClean = (r.nombre || '')
          .replace(/\s*\(Plantilla\)/gi, '')
          .replace(/\s*\(Asignada\)/gi, '')
          .replace(/\s*-\s*[^-]+$/, '')
          .trim()
          .toLowerCase();

        return (
          r.id === routine.id ||
          (r.nombre && r.nombre.toLowerCase() === routine.nombre.toLowerCase()) ||
          (cleanBaseName && rClean && cleanBaseName === rClean)
        );
      });

      // Verificar si tiene OTRA rutina activa diferente
      const otherActiveRoutine = clientRoutines.find(r => 
        (r.activa === true || r.activa === undefined) && 
        (!sameRoutine || r.id !== sameRoutine.id)
      );

      statusMap[client.id] = {
        hasSameRoutine: Boolean(sameRoutine),
        sameRoutineName: sameRoutine?.nombre,
        sameRoutine: sameRoutine || null,
        hasOtherActive: Boolean(otherActiveRoutine),
        otherActiveName: otherActiveRoutine?.nombre,
        otherActiveRoutine: otherActiveRoutine || null
      };
    });

    return statusMap;
  }, [routine, clients, routines]);

  // Atajo rápido para editar la rutina existente del alumno
  const handleQuickEdit = (e, client) => {
    e.stopPropagation();
    e.preventDefault();

    const status = clientRoutineStatus[client.id];
    const activeRoutine = status?.otherActiveRoutine || status?.sameRoutine;

    // 1. Cerrar el modal actual
    onClose();

    // 2. Redirigir al entrenador
    if (onQuickEdit) {
      onQuickEdit(client, activeRoutine);
    } else if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', `/admin/alumnos/${client.id}/rutina`);
    }
  };

  // Filtrado de alumnos por búsqueda
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(c => 
      (c.nombre_completo || '').toLowerCase().includes(q) ||
      (c.access_code || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.modalidad || '').toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // Conteo de seleccionados con advertencia de otra rutina
  const hasSelectedWithOtherRoutine = useMemo(() => {
    return selectedClientIds.some(id => clientRoutineStatus[id]?.hasOtherActive);
  }, [selectedClientIds, clientRoutineStatus]);

  if (!isOpen || !routine) return null;

  // Toggle de selección por checkbox
  const handleToggleClient = (clientId) => {
    const status = clientRoutineStatus[clientId];
    if (status?.hasSameRoutine) return; // Bloqueado si ya tiene esta rutina

    setSelectedClientIds(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // 2. Lógica de asignación protegida contra doble clic y con validación en BD
  const handleAssign = async () => {
    if (selectedClientIds.length === 0) {
      alert('Por favor selecciona al menos un alumno para asignar la rutina.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const cleanBaseName = (routine.nombre || '')
        .replace(/\s*\(Plantilla\)/gi, '')
        .replace(/\s*\(Asignada\)/gi, '')
        .replace(/\s*-\s*[^-]+$/, '')
        .trim();

      // 3. VALIDACIÓN PREVENTIVA EN BASE DE DATOS JUSTO ANTES DE INSERTAR
      for (const clientId of selectedClientIds) {
        const clientObj = clients.find(c => c.id === clientId);
        const targetExpectedName = routine.es_plantilla
          ? `${cleanBaseName} - ${clientObj?.nombre_completo || ''}`
          : routine.nombre;

        const { data: rutinasExistentes } = await supabase
          .from('routines')
          .select('id, nombre, activa')
          .eq('client_id', clientId)
          .eq('activa', true);

        const isDuplicate = (rutinasExistentes || []).some(r => {
          if (r.activa === false) return false;
          const rClean = (r.nombre || '').replace(/\s*\(Plantilla\)/gi, '').replace(/\s*\(Asignada\)/gi, '').replace(/\s*-\s*[^-]+$/, '').trim().toLowerCase();
          return (
            r.nombre?.toLowerCase() === routine.nombre?.toLowerCase() ||
            r.nombre?.toLowerCase() === targetExpectedName.toLowerCase() ||
            (cleanBaseName && rClean && cleanBaseName.toLowerCase() === rClean.toLowerCase())
          );
        });

        if (isDuplicate) {
          alert(`El alumno ${clientObj?.nombre_completo || 'seleccionado'} ya tiene esta rutina asignada.`);
          setIsSubmitting(false);
          return; // Aborta la operación de inmediato
        }
      }

      // Inserción / Deep Clone vía dataService para cada alumno seleccionado
      const assignedResults = [];
      for (const clientId of selectedClientIds) {
        // 1. Apagar todas las rutinas anteriores del alumno para evitar duplicados activos
        const { error: archiveError } = await supabase
          .from('routines')
          .update({ activa: false })
          .eq('client_id', clientId);

        if (archiveError) {
          console.error("Error archivando rutinas viejas:", archiveError);
          throw new Error("No se pudieron limpiar las rutinas anteriores.");
        }

        // 2. Proceder a crear/asignar la nueva rutina normalmente
        const assigned = await dataService.assignRoutineToClient(routine.id, clientId);
        assignedResults.push(assigned);
      }

      // 4. Feedback exitoso, limpieza de estados y cierre del modal
      setSelectedClientIds([]);
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(assignedResults.length === 1 ? assignedResults[0] : assignedResults);
      }

      onClose();
    } catch (err) {
      console.error('Error al asignar rutina en Supabase:', err);
      const msg = err?.message || 'Error al persistir la rutina en Supabase';
      setErrorMessage(msg);
      alert(`Error al asignar rutina: ${msg}`);
      setIsSubmitting(false);
    }
  };

  const daysCount = routine.dias?.length || routine.dias_por_semana || 3;
  const totalExercises = routine.total_ejercicios || (routine.dias || []).reduce((acc, d) => acc + (d.ejercicios?.length || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
        
        {/* Cabecera fija */}
        <div className="flex items-start justify-between pb-3 border-b border-dark-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand-light shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Asignar Rutina a Alumno</h3>
              <p className="text-xs text-gray-400">Vincular una copia activa e independiente al portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white bg-dark-800 border border-dark-700 disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ficha compacta de la rutina seleccionada */}
        <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80 my-3 shrink-0 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-brand-light block">Rutina Seleccionada:</span>
            <p className="text-sm font-bold text-white truncate">{routine.nombre}</p>
            <p className="text-xs text-zinc-400">
              {daysCount} Días de entreno • {totalExercises} ejercicios planificados
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-zinc-400 shrink-0">
            <Dumbbell className="w-4 h-4 text-brand" />
          </div>
        </div>

        {/* Mensaje de error general si la asignación falla */}
        {errorMessage && (
          <div className="p-3 mb-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Advertencia si algún alumno seleccionado ya tiene otra rutina activa */}
        {hasSelectedWithOtherRoutine && (
          <div className="p-2.5 mb-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>Advertencia:</b> Uno o más alumnos seleccionados ya tienen una rutina activa. Asignar esta rutina creará una nueva planificación para el alumno.
            </span>
          </div>
        )}

        {/* Buscador de alumnos */}
        <div className="relative mb-2 shrink-0">
          <input
            type="text"
            placeholder="Buscar por nombre, código de acceso o modalidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 pl-9 focus:outline-none focus:border-brand min-h-[40px]"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
        </div>

        {/* Lista de alumnos scrolleable con Checkboxes y Validaciones */}
        <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-2 py-1">
          {filteredClients.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs">
              No se encontraron alumnos con ese criterio de búsqueda.
            </div>
          ) : (
            filteredClients.map((client) => {
              const status = clientRoutineStatus[client.id] || {};
              const isSelected = selectedClientIds.includes(client.id);

              return (
                <div
                  key={client.id}
                  onClick={() => !status.hasSameRoutine && handleToggleClient(client.id)}
                  className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    status.hasSameRoutine
                      ? 'bg-dark-900/40 border-dark-750 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-brand/10 border-brand/60 shadow-md cursor-pointer'
                      : 'bg-dark-900 border-dark-700/80 hover:border-dark-600 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={status.hasSameRoutine}
                      onChange={() => handleToggleClient(client.id)}
                      className="w-4 h-4 mt-0.5 rounded border-dark-600 text-brand focus:ring-brand accent-red-600 disabled:opacity-40 shrink-0 cursor-pointer"
                    />
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {client.nombre_completo}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ({client.access_code})
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-dark-800 text-zinc-300 border border-dark-700">
                          {client.modalidad || 'Presencial'}
                        </span>
                      </div>

                      {/* Estado de Rutina del Alumno */}
                      <div className="mt-1">
                        {status.hasSameRoutine ? (
                          <span className="text-gray-500 text-xs italic">
                            (Ya tiene esta rutina)
                          </span>
                        ) : status.hasOtherActive ? (
                          <div className="space-y-1">
                            <span className="text-amber-400 text-xs flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Ya tiene otra rutina activa: "{status.otherActiveName}"</span>
                            </span>
                            <button 
                              type="button"
                              onClick={(e) => handleQuickEdit(e, client)}
                              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded-md w-fit"
                            >
                              <Edit2 className="w-3 h-3"/>
                              <span>Modificar su rutina actual</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-emerald-400 text-xs flex items-center gap-1 font-medium">
                            ✓ Disponible para asignar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ficha médica resumida si se selecciona 1 solo alumno */}
        {selectedClientIds.length === 1 && (
          <div className="mt-2 pt-2 border-t border-dark-700/80 shrink-0">
            {loadingMedical ? (
              <div className="p-2 rounded-xl bg-dark-900 border border-dark-750 text-xs text-zinc-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                <span>Consultando ficha de salud...</span>
              </div>
            ) : selectedMedicalRecord ? (
              <div className="p-2.5 rounded-xl bg-gray-950 border border-dark-750 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                  Salud: {clients.find(c => c.id === selectedClientIds[0])?.nombre_completo}
                </span>
                {(() => {
                  const lesiones = Array.isArray(selectedMedicalRecord.lesiones)
                    ? selectedMedicalRecord.lesiones.filter(z => z && z !== 'Ninguna')
                    : [];

                  if (lesiones.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {lesiones.map((zona, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-500/40">
                            ⚠️ Lesión: {zona}
                          </span>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <span className="text-emerald-400 text-[11px] block">
                      ✓ Sin lesiones ni molestias reportadas por el alumno.
                    </span>
                  );
                })()}
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                ⚠️ El alumno seleccionado aún no completó su ficha médica.
              </div>
            )}
          </div>
        )}

        {/* Barra inferior fija con botones y guard contra doble clic */}
        <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-zinc-400">
            {selectedClientIds.length === 0
              ? 'Selecciona al menos 1 alumno'
              : `${selectedClientIds.length} ${selectedClientIds.length === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[44px] disabled:opacity-50"
            >
              Cancelar
            </button>
            
            <button
              type="button"
              disabled={isSubmitting || selectedClientIds.length === 0}
              onClick={handleAssign}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red transition-all flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Asignando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {selectedClientIds.length > 1
                      ? `Asignar Rutina (${selectedClientIds.length})`
                      : 'Asignar Rutina'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
