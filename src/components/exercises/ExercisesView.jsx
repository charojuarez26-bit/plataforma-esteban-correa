import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  Flame, 
  CheckCircle, 
  Play, 
  Info,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { dataService } from '../../services/dataService';

export default function ExercisesView() {
  const [exercises, setExercises] = useState([]);
  const [filterGroup, setFilterGroup] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [clients, setClients] = useState([]);
  
  // Estado para el constructor rápido de rutina
  const [routineClient, setRoutineClient] = useState('');
  const [routineDay, setRoutineDay] = useState('Día 1: Torso / Pecho');
  const [routineItems, setRoutineItems] = useState([]);
  const [routineSuccess, setRoutineSuccess] = useState(false);

  const muscleGroups = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'];

  useEffect(() => {
    loadData();
  }, [filterGroup]);

  const loadData = async () => {
    const exList = await dataService.getExercises(filterGroup);
    const cliList = await dataService.getClients();
    setExercises(exList);
    setClients(cliList);
    if (cliList.length > 0 && !routineClient) {
      setRoutineClient(cliList[0].id);
    }
  };

  const filteredExercises = exercises.filter(e => 
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddToRoutine = (exercise) => {
    const newItem = {
      id: `item-${Date.now()}`,
      exercise,
      series: 4,
      reps: '10-12',
      peso: 'RPE 8',
      descanso: 90
    };
    setRoutineItems([...routineItems, newItem]);
  };

  const handleRemoveRoutineItem = (id) => {
    setRoutineItems(routineItems.filter(item => item.id !== id));
  };

  const handleSaveRoutine = () => {
    if (routineItems.length === 0) return;
    setRoutineSuccess(true);
    setTimeout(() => {
      setRoutineSuccess(false);
      setRoutineItems([]);
    }, 2500);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-brand" />
            Biblioteca de Ejercicios & Creador de Rutinas
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Catálogo técnico con pautas anatómicas y asignación directa a planes de alumnos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-700 text-gray-300 font-semibold">
            {exercises.length} Ejercicios Registrados
          </span>
        </div>
      </div>

      {/* FILTROS POR GRUPO MUSCULAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {muscleGroups.map((group) => (
          <button
            key={group}
            onClick={() => setFilterGroup(group)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterGroup === group
                ? 'bg-brand text-white shadow-glow-red'
                : 'bg-dark-850 hover:bg-dark-800 text-gray-400 hover:text-white border border-dark-700'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* GRID PRINCIPAL: BIBLIOTECA + CREADOR DE RUTINAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* BIBLIOTECA DE EJERCICIOS (7 COLUMNAS) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar ejercicio por nombre (ej: Press, Sentadilla, Curl)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-850 border border-dark-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 pl-10 focus:outline-none focus:border-brand"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
          </div>

          {/* Tarjetas de Ejercicios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[680px] overflow-y-auto no-scrollbar pr-1">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className="card-dark rounded-xl p-3.5 card-dark-hover flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-32 rounded-lg overflow-hidden mb-2.5 bg-dark-900 border border-dark-700/60">
                    <img
                      src={ex.imagen_url}
                      alt={ex.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-dark-950/80 backdrop-blur-sm text-white border border-dark-700">
                      {ex.grupo_muscular}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-light transition-colors line-clamp-1">
                    {ex.nombre}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                    {ex.instrucciones}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-dark-700/60 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedExercise(ex)}
                    className="text-[11px] text-gray-400 hover:text-white font-medium flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" /> Detalles
                  </button>

                  <button
                    onClick={() => handleAddToRoutine(ex)}
                    className="px-2.5 py-1 rounded-lg bg-brand/20 hover:bg-brand text-brand-light hover:text-white border border-brand/30 text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CREADOR Y ASIGNADOR DE RUTINAS (5 COLUMNAS) */}
        <div className="lg:col-span-5 card-dark rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-700/80">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-light" />
                Constructor de Rutina
              </h2>
              <p className="text-xs text-gray-400">Arma la sesión y asígnala al alumno</p>
            </div>
            <span className="text-xs font-mono font-bold text-brand-light bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
              {routineItems.length} ejercicios
            </span>
          </div>

          {/* Selector de Alumno y Día */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                Asignar al Alumno:
              </label>
              <select
                value={routineClient}
                onChange={(e) => setRoutineClient(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} ({c.access_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                Nombre de la Sesión / Día:
              </label>
              <input
                type="text"
                value={routineDay}
                onChange={(e) => setRoutineDay(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Lista de Ejercicios en la Rutina */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
            {routineItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-dark-900 border border-dark-700 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand/20 text-brand-light text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                      {item.exercise.nombre}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleRemoveRoutineItem(item.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                  >
                    Quitar
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  <div className="p-1 rounded bg-dark-850 border border-dark-700">
                    <span className="text-gray-400 block">Series</span>
                    <span className="font-bold text-white">{item.series}</span>
                  </div>
                  <div className="p-1 rounded bg-dark-850 border border-dark-700">
                    <span className="text-gray-400 block">Reps</span>
                    <span className="font-bold text-white">{item.reps}</span>
                  </div>
                  <div className="p-1 rounded bg-dark-850 border border-dark-700">
                    <span className="text-gray-400 block">Carga</span>
                    <span className="font-bold text-brand-light">{item.peso}</span>
                  </div>
                  <div className="p-1 rounded bg-dark-850 border border-dark-700">
                    <span className="text-gray-400 block">Descanso</span>
                    <span className="font-bold text-white">{item.descanso}s</span>
                  </div>
                </div>
              </div>
            ))}

            {routineItems.length === 0 && (
              <div className="text-center py-10 border border-dashed border-dark-700 rounded-xl text-gray-500 text-xs p-4">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 text-dark-600" />
                Haz click en <strong>"+ Agregar"</strong> en cualquier ejercicio de la izquierda para armar esta rutina.
              </div>
            )}
          </div>

          {/* Alerta de Éxito al guardar */}
          {routineSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>¡Rutina asignada exitosamente al alumno!</span>
            </div>
          )}

          {/* Botón de Guardado */}
          <button
            onClick={handleSaveRoutine}
            disabled={routineItems.length === 0}
            className="w-full py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs sm:text-sm shadow-glow-red transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Asignar y Publicar Rutina</span>
          </button>
        </div>

      </div>

      {/* MODAL DETALLES DEL EJERCICIO */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-850 border border-dark-700 rounded-2xl p-5 space-y-4">
            <div className="relative h-48 rounded-xl overflow-hidden">
              <img
                src={selectedExercise.imagen_url}
                alt={selectedExercise.nombre}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 text-xs font-bold px-2.5 py-1 rounded-lg bg-brand text-white">
                {selectedExercise.grupo_muscular}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{selectedExercise.nombre}</h3>
              <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                {selectedExercise.instrucciones}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedExercise(null)}
                className="px-4 py-2 rounded-xl bg-dark-750 text-xs font-bold text-gray-300 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
