/**
 * Utilidades compartidas para Superseries (Biseries/Triseries/Circuitos)
 * y Series Descendentes (Drop Sets / Bajadas).
 */

const createGroupId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `grp-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

/**
 * Devuelve la etiqueta de bloque según la cantidad de ejercicios consecutivos vinculados.
 */
export function getSupersetLabel(count) {
  if (count === 2) return 'SUPERSERIE';
  if (count === 3) return 'TRISERIE';
  if (count >= 4) return 'CIRCUITO';
  return '';
}

/**
 * Limpia cualquier grupo_id huérfano (un solo ejercicio aislado con grupo_id)
 * para mantener la integridad tras borrar, reordenar o desvincular ejercicios.
 */
export function cleanupOrphanGroupIds(exercises = []) {
  if (!Array.isArray(exercises) || exercises.length === 0) return [];
  const next = exercises.map(ex => ({ ...ex, grupo_id: ex.grupo_id || null }));

  let i = 0;
  while (i < next.length) {
    const gid = next[i].grupo_id;
    if (!gid) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < next.length && next[j].grupo_id === gid) {
      j++;
    }
    // Si el bloque consecutivo tiene menos de 2 ejercicios, limpiar el grupo_id huérfano
    if (j - i < 2) {
      next[i].grupo_id = null;
    }
    i = j;
  }

  return next;
}

/**
 * Vincula o desvincula el ejercicio en posición `idx` con el ejercicio siguiente (`idx + 1`).
 */
export function toggleLinkWithNextExercise(exercises = [], idx) {
  if (!Array.isArray(exercises) || idx < 0 || idx >= exercises.length - 1) {
    return exercises;
  }

  const next = exercises.map(ex => ({ ...ex, grupo_id: ex.grupo_id || null }));
  const curr = next[idx];
  const following = next[idx + 1];

  const isAlreadyLinked = Boolean(curr.grupo_id && curr.grupo_id === following.grupo_id);

  if (isAlreadyLinked) {
    // Desvincular el corte entre idx y idx + 1:
    // Todo lo que sigue a partir de idx + 1 con ese mismo grupo_id recibe un nuevo grupo_id
    // (si queda 1 solo ejercicio de cualquiera de los lados, cleanupOrphanGroupIds lo deja en null).
    const oldGid = curr.grupo_id;
    const rightGid = createGroupId();
    for (let k = idx + 1; k < next.length && next[k].grupo_id === oldGid; k++) {
      next[k].grupo_id = rightGid;
    }
    return cleanupOrphanGroupIds(next);
  }

  // Vincular idx con idx + 1:
  if (curr.grupo_id && following.grupo_id) {
    // Fusionar el grupo siguiente en el grupo actual
    const targetGid = curr.grupo_id;
    const oldRightGid = following.grupo_id;
    for (let k = idx + 1; k < next.length && next[k].grupo_id === oldRightGid; k++) {
      next[k].grupo_id = targetGid;
    }
  } else {
    const targetGid = curr.grupo_id || following.grupo_id || createGroupId();
    curr.grupo_id = targetGid;
    following.grupo_id = targetGid;
  }

  return cleanupOrphanGroupIds(next);
}

/**
 * Agrupa ejercicios consecutivos que compartan el mismo `grupo_id` (mínimo 2 ejercicios).
 * Devuelve bloques: [{ isGroup, grupo_id, label, items: [{ item, index }] }]
 */
export function groupExercisesBySuperset(exercises = []) {
  if (!Array.isArray(exercises) || exercises.length === 0) return [];

  const blocks = [];
  let i = 0;

  while (i < exercises.length) {
    const gid = exercises[i]?.grupo_id || null;
    if (gid) {
      let j = i + 1;
      while (j < exercises.length && exercises[j]?.grupo_id === gid) {
        j++;
      }
      const runLength = j - i;
      if (runLength >= 2) {
        const items = [];
        for (let k = i; k < j; k++) {
          items.push({ item: exercises[k], index: k });
        }
        blocks.push({
          isGroup: true,
          grupo_id: gid,
          label: getSupersetLabel(runLength),
          items
        });
        i = j;
        continue;
      }
    }

    blocks.push({
      isGroup: false,
      grupo_id: null,
      label: '',
      items: [{ item: exercises[i], index: i }]
    });
    i++;
  }

  return blocks;
}

/**
 * Parsea un peso opcional conservando estrictamente `null` cuando está vacío (nunca fuerza 0).
 */
export function parseOptionalWeight(val) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim().replace(',', '.');
  if (str === '') return null;
  const match = str.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  if (isNaN(num) || num < 0) return null;
  return num;
}

/**
 * Parsea un entero opcional (repeticiones) conservando `null` cuando está vacío.
 */
export function parseOptionalInt(val) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === '') return null;
  const match = str.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return isNaN(num) ? null : num;
}

/**
 * Normaliza los registros de `session_exercise_logs` de una sesión unificando:
 * 1) `bajadas` guardadas como JSONB nativo en cada fila de serie.
 * 2) Filas fallback `[DROP S#]` cuando la columna JSONB `bajadas` aún no existía en Supabase.
 *
 * Devuelve un array de filas de series principales donde cada fila posee `bajadas: [{ peso, reps }]`.
 */
export function normalizeSessionExerciseLogs(exLogs = []) {
  if (!Array.isArray(exLogs) || exLogs.length === 0) return [];

  const dropTagRegex = /\s*\[DROP(?:\s+S(\d+))?\]\s*$/i;
  const mainRows = [];
  const orphanDrops = [];

  exLogs.forEach((raw) => {
    if (!raw) return;
    const rawName = (raw.exercise_name || 'Ejercicio').trim();
    const dropMatch = rawName.match(dropTagRegex);

    if (dropMatch || raw.es_bajada === true) {
      const baseName = rawName.replace(dropTagRegex, '').trim();
      const targetSetNum = dropMatch && dropMatch[1] ? parseInt(dropMatch[1], 10) : null;
      orphanDrops.push({
        baseNameLower: baseName.toLowerCase(),
        targetSetNum,
        peso: parseOptionalWeight(raw.actual_weight),
        reps: parseOptionalInt(raw.actual_reps)
      });
      return;
    }

    // Parsear bajadas JSONB si vienen en la fila
    let parsedBajadas = [];
    if (Array.isArray(raw.bajadas)) {
      parsedBajadas = raw.bajadas;
    } else if (typeof raw.bajadas === 'string' && raw.bajadas.trim().startsWith('[')) {
      try {
        const arr = JSON.parse(raw.bajadas);
        if (Array.isArray(arr)) parsedBajadas = arr;
      } catch {}
    }

    const cleanBajadas = parsedBajadas
      .map(b => ({
        peso: parseOptionalWeight(b?.peso ?? b?.weight ?? b?.actual_weight),
        reps: parseOptionalInt(b?.reps ?? b?.repeticiones ?? b?.actual_reps)
      }))
      .filter(b => b.peso !== null || b.reps !== null);

    mainRows.push({
      ...raw,
      exercise_name: rawName,
      bajadas: cleanBajadas
    });
  });

  // Asociar filas fallback `[DROP S#]` a su serie padre correspondiente
  if (orphanDrops.length > 0) {
    const byExercise = new Map();
    mainRows.forEach((row) => {
      const key = (row.exercise_name || '').toLowerCase().trim();
      if (!byExercise.has(key)) byExercise.set(key, []);
      byExercise.get(key).push(row);
    });

    orphanDrops.forEach((drop) => {
      const list = byExercise.get(drop.baseNameLower);
      if (!list || list.length === 0) return;
      const targetIdx = drop.targetSetNum ? Math.max(0, Math.min(list.length - 1, drop.targetSetNum - 1)) : (list.length - 1);
      const targetRow = list[targetIdx];
      if (targetRow) {
        targetRow.bajadas = [...(targetRow.bajadas || []), { peso: drop.peso, reps: drop.reps }];
      }
    });
  }

  return mainRows;
}

/**
 * Calcula el volumen total (peso * reps) de una fila de serie incluyendo sus bajadas (drop sets).
 * Ignora estrictamente pesos `null`, `undefined`, `NaN` o `<= 0`.
 */
export function computeSetVolumeWithDrops(setLog) {
  if (!setLog) return 0;

  let vol = 0;
  const mainSets = parseInt(setLog.actual_sets, 10) || 1;
  const mainReps = parseInt(setLog.actual_reps, 10) || 0;
  const mainWeight = parseFloat(setLog.actual_weight);

  if (!isNaN(mainWeight) && mainWeight > 0 && mainReps > 0 && mainSets > 0) {
    vol += mainSets * mainReps * mainWeight;
  }

  if (Array.isArray(setLog.bajadas) && setLog.bajadas.length > 0) {
    setLog.bajadas.forEach((b) => {
      const bw = parseFloat(b?.peso);
      const br = parseInt(b?.reps, 10);
      if (!isNaN(bw) && bw > 0 && !isNaN(br) && br > 0) {
        vol += bw * br;
      }
    });
  }

  return vol;
}
