import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Activity, 
  Search, 
  Plus, 
  X, 
  Info, 
  Dumbbell, 
  ArrowRight, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  Play,
  Loader2
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';
import ExerciseTechniqueModal, { ExerciseMedia } from './ExerciseTechniqueModal';

const PAGE_SIZE = 16;

const BASE_CATEGORIES = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core / Abdomen', 'Glúteos'];

const DEFAULT_IMAGES = {
  Pecho: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80',
  Espalda: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=500&q=80',
  Piernas: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=500&q=80',
  Hombros: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?auto=format&fit=crop&w=500&q=80',
  Brazos: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=500&q=80',
  'Core / Abdomen': 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=500&q=80',
  Core: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=500&q=80',
  Glúteos: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=500&q=80',
  General: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=500&q=80'
};

export default function ExercisesLibraryView() {
  const [exercises, setExercises] = useState([]);
  const [filterGroup, setFilterGroup] = useState('Todos');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [customGroups, setCustomGroups] = useState([]);

  // Modales
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);

  // Formulario nuevo/editar ejercicio
  const [formData, setFormData] = useState({
    nombre: '',
    grupo_muscular: 'Pecho',
    imagen_url: '',
    video_url: '',
    instrucciones: '',
    errores_comunes: ''
  });
  const [isCreatingCustomGroup, setIsCreatingCustomGroup] = useState(false);
  const [customGroupName, setCustomGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const sentinelRef = useRef(null);

  // 1. Debounce para búsqueda (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // 2. Cargar grupos musculares distintos desde Supabase al montar
  useEffect(() => {
    let isMounted = true;
    dataService.getDistinctMuscleGroups().then((groups) => {
      if (isMounted && groups && groups.length > 0) {
        setCustomGroups(groups);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Grupos musculares dinámicos (Base + Cualquier grupo creado por el coach)
  const dynamicCategories = useMemo(() => {
    const set = new Set(BASE_CATEGORIES);
    customGroups.forEach((g) => {
      if (g && !set.has(g)) set.add(g);
    });
    exercises.forEach((ex) => {
      if (ex.grupo_muscular && !set.has(ex.grupo_muscular)) {
        set.add(ex.grupo_muscular);
      }
    });
    return Array.from(set);
  }, [customGroups, exercises]);

  // 3. Consulta paginada a Supabase
  const fetchExercises = useCallback(async (pageToLoad, isReset = false) => {
    if (isReset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await dataService.getExercisesPaginated({
        page: pageToLoad,
        limit: PAGE_SIZE,
        filterGroup,
        search: debouncedSearch
      });

      const items = res.data || [];
      if (isReset) {
        setExercises(items);
      } else {
        setExercises((prev) => [...prev, ...items]);
      }

      setTotalCount(res.total ?? 0);
      setHasMore(Boolean(res.hasMore));
      setPage(pageToLoad);
    } catch {
      if (isReset) {
        setExercises([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      if (isReset) setLoading(false);
      setLoadingMore(false);
    }
  }, [filterGroup, debouncedSearch]);

  // Reiniciar a página 0 cuando cambie el filtro o la búsqueda (debounced)
  useEffect(() => {
    fetchExercises(0, true);
  }, [fetchExercises]);

  // Infinite Scroll con IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchExercises(page + 1, false);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchExercises]);

  // Carga manual del siguiente lote
  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchExercises(page + 1, false);
  };

  // Abrir modal para nuevo ejercicio
  const handleOpenNewModal = () => {
    setEditingExercise(null);
    setFormData({
      nombre: '',
      grupo_muscular: 'Pecho',
      imagen_url: '',
      video_url: '',
      instrucciones: '',
      errores_comunes: ''
    });
    setIsCreatingCustomGroup(false);
    setCustomGroupName('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Abrir modal para editar ejercicio
  const handleOpenEditModal = (exercise) => {
    setEditingExercise(exercise);
    setFormData({
      nombre: exercise.nombre || '',
      grupo_muscular: exercise.grupo_muscular || 'Pecho',
      imagen_url: exercise.imagen_url || '',
      video_url: exercise.video_url || '',
      instrucciones: exercise.instrucciones || '',
      errores_comunes: exercise.errores_comunes || ''
    });
    setIsCreatingCustomGroup(false);
    setCustomGroupName('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const exerciseName = formData.nombre.trim();
    if (!exerciseName) {
      setFormError('El nombre del ejercicio es obligatorio.');
      return;
    }

    let finalGroup = formData.grupo_muscular;
    if (isCreatingCustomGroup) {
      if (!customGroupName.trim()) {
        setFormError('Por favor ingresa el nombre del nuevo grupo muscular.');
        return;
      }
      finalGroup = customGroupName.trim();
    }

    setIsSaving(true);
    try {
      const currentSession = authService.getCurrentSession();
      const coachId = currentSession?.user?.id || '00000000-0000-0000-0000-000000000001';
      const finalImage = formData.imagen_url.trim() || DEFAULT_IMAGES[finalGroup] || DEFAULT_IMAGES.General;

      const exercisePayload = {
        nombre: exerciseName,
        grupo_muscular: finalGroup,
        imagen_url: finalImage,
        video_url: formData.video_url.trim() || null,
        instrucciones: formData.instrucciones.trim(),
        errores_comunes: formData.errores_comunes.trim() || null,
        coach_id: coachId
      };

      if (editingExercise) {
        const updated = await dataService.updateExercise(editingExercise.id, exercisePayload);
        setExercises((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
      } else {
        const created = await dataService.addExercise(exercisePayload);
        setExercises((prev) => [created, ...prev]);
        setTotalCount((prev) => prev + 1);
        if (isCreatingCustomGroup && customGroupName.trim()) {
          setCustomGroups((prev) => Array.from(new Set([...prev, customGroupName.trim()])));
        }
      }

      setIsFormModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Error al persistir en Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmar y eliminar ejercicio
  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return;
    try {
      await dataService.deleteExercise(exerciseToDelete.id);
      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseToDelete.id));
      setExerciseToDelete(null);
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      alert('Error eliminando ejercicio: ' + (err.message || 'Ocurrió un error'));
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 overflow-y-auto scroll-smooth">
      
      {/* 1. CABECERA CON CONTADOR TOTAL Y BOTÓN NUEVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand" />
            Biblioteca de Ejercicios
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Catálogo anatómico oficial • {totalCount} movimientos sincronizados en Supabase
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Ejercicio</span>
        </button>
      </div>

      {/* 2. BARRA DE BÚSQUEDA Y FILTROS HORIZONTALES DINÁMICOS */}
      <div className="card-dark rounded-2xl p-4 space-y-3.5 border border-white/5 shadow-lg">
        {/* Buscador con Debounce */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, técnica o grupo muscular (ej. Press de banca, Sentadilla, Glúteos)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 pl-10 pr-10 focus:outline-none focus:border-brand min-h-[44px]"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3 text-gray-400 hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barra de Filtros Horizontales en Píldora */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {dynamicCategories.map((cat) => {
            const isActive = filterGroup === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterGroup(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[38px] flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-brand text-white shadow-glow-red scale-[1.02]'
                    : 'bg-[#18181f] hover:bg-dark-800 text-gray-400 hover:text-white border border-[#272733]'
                }`}
              >
                <span>{cat}</span>
                {isActive && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-white">
                    {totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CUADRÍCULA DE TARJETAS DE EJERCICIOS */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="card-dark rounded-2xl p-3.5 border border-white/5 animate-pulse space-y-3">
              <div className="h-44 rounded-xl bg-dark-800" />
              <div className="h-4 bg-dark-800 rounded w-3/4" />
              <div className="h-3 bg-dark-800 rounded w-1/2" />
              <div className="h-8 bg-dark-800 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {exercises.map((exercise) => {
              const hasVideo = Boolean(exercise.video_url);
              const hasTips = Boolean(exercise.errores_comunes);

              return (
                <div
                  key={exercise.id}
                  className="card-dark rounded-2xl p-3.5 card-dark-hover flex flex-col justify-between group relative overflow-hidden border border-white/5 hover:border-brand/40 shadow-lg transition-all duration-200"
                >
                  <div>
                    {/* Miniatura con Lazy Loading y Background Neutral para evitar CLS */}
                    <div 
                      onClick={() => setSelectedExerciseForDetail(exercise)}
                      className="relative h-44 rounded-xl overflow-hidden mb-3 bg-gray-900 border border-dark-700/80 cursor-pointer"
                    >
                      <img
                        src={exercise.imagen_url || DEFAULT_IMAGES[exercise.grupo_muscular] || DEFAULT_IMAGES.General}
                        alt={exercise.nombre}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain bg-gray-900 group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"></div>
                      
                      {/* Badge Grupo Muscular */}
                      <span className="absolute bottom-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-dark-950/90 text-brand-light border border-dark-700 shadow-sm pointer-events-none">
                        {exercise.grupo_muscular}
                      </span>

                      {/* Badges de multimedia y prevención */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none">
                        {hasVideo && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600/90 text-white shadow-md flex items-center gap-1"
                            title="Contiene video demostrativo"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" /> Video
                          </span>
                        )}
                        {hasTips && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/90 text-black shadow-md flex items-center gap-0.5"
                            title="Incluye errores comunes a evitar"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" /> Tips
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nombre del Ejercicio */}
                    <h3 
                      onClick={() => setSelectedExerciseForDetail(exercise)}
                      className="text-sm font-bold text-white group-hover:text-brand-light transition-colors line-clamp-1 cursor-pointer"
                      title={exercise.nombre}
                    >
                      {exercise.nombre}
                    </h3>

                    {/* Instrucciones resumidas */}
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {exercise.instrucciones || 'Técnica estricta y sobrecarga progresiva.'}
                    </p>
                  </div>

                  {/* Footer de la tarjeta con Acciones Rápidas */}
                  <div className="mt-3.5 pt-2.5 border-t border-dark-700/60 flex items-center justify-between gap-1 text-xs">
                    {/* Botón Ver Técnica */}
                    <button
                      type="button"
                      onClick={() => setSelectedExerciseForDetail(exercise)}
                      className="text-[11px] font-bold text-gray-300 hover:text-white flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5 text-brand" />
                      <span>Técnica</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Botón Editar */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(exercise)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-light hover:bg-dark-800 transition-colors"
                        title="Editar ejercicio"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={() => setExerciseToDelete(exercise)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-dark-800 transition-colors"
                        title="Eliminar ejercicio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {exercises.length === 0 && (
              <div className="col-span-full card-dark rounded-2xl p-12 text-center text-gray-500 text-sm space-y-3 max-w-md mx-auto my-6">
                <Dumbbell className="w-12 h-12 mx-auto text-dark-600 mb-1" />
                <p className="text-white font-bold text-base">
                  {search.trim() || filterGroup !== 'Todos'
                    ? 'No se encontraron ejercicios con esos filtros.'
                    : 'Tu biblioteca de ejercicios está vacía'}
                </p>
                <p className="text-xs text-gray-400">
                  {search.trim() || filterGroup !== 'Todos'
                    ? 'Prueba con otro término, grupo muscular o presiona "+ Nuevo Ejercicio" para darlo de alta en tu biblioteca.'
                    : 'Comienza a cargar tu catálogo personalizado desde cero haciendo clic en "+ Nuevo Ejercicio".'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewModal}
                  className="mt-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-glow-red transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nuevo Ejercicio</span>
                </button>
              </div>
            )}
          </div>

          {/* Skeletons sutiles mientras carga el siguiente lote sin resetear el estado visible */}
          {loadingMore && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="card-dark rounded-2xl p-3.5 border border-white/5 animate-pulse space-y-3">
                  <div className="h-44 rounded-xl bg-dark-800" />
                  <div className="h-4 bg-dark-800 rounded w-3/4" />
                  <div className="h-3 bg-dark-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Centinela invisible para carga infinita fluida */}
          <div ref={sentinelRef} className="h-4 w-full pointer-events-none" />

          {/* Botón "Cargar más ejercicios" y estado del catálogo */}
          {hasMore && (
            <div className="flex flex-col items-center justify-center pt-6 pb-2 gap-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700 hover:border-brand/40 text-xs sm:text-sm font-bold text-gray-300 hover:text-white transition-all shadow-md flex items-center gap-2 group min-h-[44px] disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                    <span>Cargando más ejercicios...</span>
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-4 h-4 text-brand group-hover:scale-110 transition-transform" />
                    <span>Cargar más ejercicios ({exercises.length} de {totalCount})</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-gray-500">
                Mostrando {exercises.length} de {totalCount} movimientos
              </span>
            </div>
          )}

          {!hasMore && exercises.length > 0 && (
            <p className="text-center text-xs text-zinc-500 pt-6 pb-2">
              ✓ Catálogo completo cargado ({totalCount} {totalCount === 1 ? 'ejercicio' : 'ejercicios'})
            </p>
          )}
        </>
      )}

      {/* 4. MODAL "+ NUEVO EJERCICIO" / "EDITAR EJERCICIO" */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl bg-dark-850 border border-dark-700 shadow-2xl relative animate-scale">
            
            {/* Cabecera fija */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-700 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-brand" />
                  {editingExercise ? 'Editar Ejercicio' : 'Alta de Nuevo Ejercicio'}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {editingExercise ? 'Modifica los parámetros técnicos del movimiento' : 'Agrega un movimiento al catálogo de Supabase'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-dark-800 border border-dark-700"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario scrolleable con pie fijo */}
            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-3">
              <div className="overflow-y-auto no-scrollbar flex-1 pr-1 space-y-3.5 pb-2">
                
                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Nombre del Ejercicio */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                    Nombre del Ejercicio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Press de Banca Plano con Barra"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                  />
                </div>

                {/* Grupo Muscular con opción de crear nuevo grupo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase text-gray-300">
                      Grupo Muscular Principal *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCustomGroup(!isCreatingCustomGroup);
                        if (!isCreatingCustomGroup) setCustomGroupName('');
                      }}
                      className="text-[11px] text-brand-light hover:underline font-bold"
                    >
                      {isCreatingCustomGroup ? '← Seleccionar existente' : '+ Crear nuevo grupo'}
                    </button>
                  </div>

                  {isCreatingCustomGroup ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Ej: Glúteos, Antebrazo, Cardio, Pantorrillas..."
                        value={customGroupName}
                        onChange={(e) => setCustomGroupName(e.target.value)}
                        className="w-full bg-dark-900 border border-brand/60 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                        autoFocus
                      />
                      <span className="text-[10px] text-zinc-400 block">
                        Este nuevo grupo aparecerá automáticamente en los filtros de la biblioteca.
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formData.grupo_muscular}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setIsCreatingCustomGroup(true);
                          setCustomGroupName('');
                        } else {
                          setFormData({ ...formData, grupo_muscular: e.target.value });
                        }
                      }}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    >
                      {dynamicCategories.filter((c) => c !== 'Todos').map((group) => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                      <option value="__new__">+ Crear nuevo grupo muscular...</option>
                    </select>
                  )}
                </div>

                {/* Multimedia: Imagen y Video */}
                <div className="p-3 rounded-xl bg-dark-900/80 border border-dark-700 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-light flex items-center gap-1.5">
                    🎥 Multimedia del Ejercicio
                  </span>

                  {/* Imagen URL */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-300 mb-1">
                      URL de Imagen / Miniatura
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formData.imagen_url}
                      onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Opcional. Si se omite, se asignará un placeholder del grupo muscular.
                    </span>
                  </div>

                  {/* Video / GIF URL */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-300 mb-1">
                      URL de Video Demostrativo, GIF o YouTube Shorts
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: https://assets.mixkit.co/...mp4, YouTube o GIF animado"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Admite MP4, WebM, GIFs y enlaces de YouTube o YouTube Shorts.
                    </span>
                  </div>

                  {/* Vista previa en tiempo real si hay video o imagen */}
                  {(formData.video_url || formData.imagen_url) && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Vista Previa:
                      </span>
                      <ExerciseMedia
                        videoUrl={formData.video_url}
                        imageUrl={formData.imagen_url}
                        title={formData.nombre || 'Vista previa'}
                        className="w-full h-36 rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Instrucciones de Técnica */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                    Instrucciones de Técnica Paso a Paso
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Posición escapular, trayectoria del codo, respiración, cadencia..."
                    value={formData.instrucciones}
                    onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:border-brand"
                  ></textarea>
                </div>

                {/* Errores Comunes (Checklist de prevención) */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-red-400 mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-brand" />
                    <span>Errores Comunes a Evitar (Checklist de prevención)</span>
                  </label>
                  <textarea
                    rows="3"
                    placeholder="• No arquear la espalda baja en exceso&#10;• No despegar los talones del suelo&#10;• Evitar el rebote en el pecho"
                    value={formData.errores_comunes}
                    onChange={(e) => setFormData({ ...formData, errores_comunes: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:border-brand"
                  ></textarea>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    El alumno verá esta advertencia destacada en su celular para evitar lesiones al entrenar solo.
                  </span>
                </div>

              </div>

              {/* Barra inferior fija */}
              <div className="sticky bottom-0 bg-[#121217] pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-dark-800 border border-dark-700 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-dark shadow-glow-red transition-all flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                >
                  <span>{isSaving ? 'Guardando en Supabase...' : (editingExercise ? 'Guardar Cambios' : 'Crear Ejercicio')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL DE CONFIRMAR ELIMINACIÓN */}
      {exerciseToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-dark rounded-2xl p-6 max-w-sm w-full border border-red-500/30 text-center space-y-4 animate-scale">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">¿Eliminar ejercicio?</h3>
              <p className="text-xs text-gray-400 mt-1">
                Se quitará permanentemente "{exerciseToDelete.nombre}" de la base de datos de Supabase.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExerciseToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-gray-300 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white min-h-[44px]"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL TÉCNICO COMPLETO CON VIDEO/GIF Y ERRORES COMUNES */}
      <ExerciseTechniqueModal
        exercise={selectedExerciseForDetail}
        isOpen={Boolean(selectedExerciseForDetail)}
        onClose={() => setSelectedExerciseForDetail(null)}
        canEdit={true}
        onEdit={(ex) => handleOpenEditModal(ex)}
      />

    </div>
  );
}
