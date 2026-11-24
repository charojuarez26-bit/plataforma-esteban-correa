import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_STORAGE_KEY = 'ec_workout_rest_timer_v1';
const MAX_STALE_COMPLETE_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Hook de cronómetro de descanso basado en timestamps reales del sistema (Date.now()).
 * Resiste bloqueos de pantalla, cambio de app en móviles y recargas de pestaña.
 */
export function useRestTimer({ storageKey = DEFAULT_STORAGE_KEY, onComplete } = {}) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused'
  const [secondsLeft, setSecondsLeft] = useState(0);

  const statusRef = useRef('idle');
  const endTimeRef = useRef(null);
  const secondsLeftRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const persistState = useCallback((nextState) => {
    if (typeof window === 'undefined' || !storageKey) return;
    try {
      if (!nextState || nextState.status === 'idle') {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(nextState));
      }
    } catch (err) {
      console.warn('[useRestTimer] Error accediendo a localStorage:', err);
    }
  }, [storageKey]);

  const triggerFinish = useCallback((shouldNotify = true) => {
    if (completedRef.current) return;
    completedRef.current = true;

    statusRef.current = 'idle';
    endTimeRef.current = null;
    secondsLeftRef.current = 0;

    setStatus('idle');
    setSecondsLeft(0);
    persistState({ status: 'idle' });

    if (shouldNotify && typeof onCompleteRef.current === 'function') {
      onCompleteRef.current();
    }
  }, [persistState]);

  const syncRemainingTime = useCallback(() => {
    if (statusRef.current !== 'running' || !endTimeRef.current) return;

    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    if (remaining <= 0) {
      triggerFinish(true);
    } else if (remaining !== secondsLeftRef.current) {
      secondsLeftRef.current = remaining;
      setSecondsLeft(remaining);
    }
  }, [triggerFinish]);

  // Restaurar cronómetro persistido si la pestaña se recargó en segundo plano
  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);

      if (saved?.status === 'running' && typeof saved.endTime === 'number') {
        const remaining = Math.max(0, Math.ceil((saved.endTime - Date.now()) / 1000));
        if (remaining > 0) {
          completedRef.current = false;
          statusRef.current = 'running';
          endTimeRef.current = saved.endTime;
          secondsLeftRef.current = remaining;
          setStatus('running');
          setSecondsLeft(remaining);
        } else {
          const elapsedSinceEnd = Date.now() - saved.endTime;
          completedRef.current = false;
          triggerFinish(elapsedSinceEnd >= 0 && elapsedSinceEnd <= MAX_STALE_COMPLETE_MS);
        }
      } else if (saved?.status === 'paused' && typeof saved.remainingSeconds === 'number' && saved.remainingSeconds > 0) {
        completedRef.current = false;
        statusRef.current = 'paused';
        endTimeRef.current = null;
        secondsLeftRef.current = saved.remainingSeconds;
        setStatus('paused');
        setSecondsLeft(saved.remainingSeconds);
      } else {
        persistState({ status: 'idle' });
      }
    } catch {
      persistState({ status: 'idle' });
    }
  }, [storageKey, persistState, triggerFinish]);

  // Intervalo de alta precisión (250ms) + listeners visibilitychange y focus
  useEffect(() => {
    if (status !== 'running') return;

    syncRemainingTime();
    const intervalId = setInterval(syncRemainingTime, 250);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus?.()) {
        syncRemainingTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
    };
  }, [status, syncRemainingTime]);

  const start = useCallback((durationSeconds) => {
    const secs = Math.max(1, Math.round(Number(durationSeconds) || 90));
    const targetEndTime = Date.now() + secs * 1000;

    completedRef.current = false;
    statusRef.current = 'running';
    endTimeRef.current = targetEndTime;
    secondsLeftRef.current = secs;

    setStatus('running');
    setSecondsLeft(secs);
    persistState({
      status: 'running',
      endTime: targetEndTime,
      remainingSeconds: secs
    });
  }, [persistState]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running' || !endTimeRef.current) return;

    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    if (remaining <= 0) {
      triggerFinish(true);
      return;
    }

    statusRef.current = 'paused';
    endTimeRef.current = null;
    secondsLeftRef.current = remaining;

    setStatus('paused');
    setSecondsLeft(remaining);
    persistState({
      status: 'paused',
      endTime: null,
      remainingSeconds: remaining
    });
  }, [persistState, triggerFinish]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    const remaining = secondsLeftRef.current;
    if (remaining <= 0) {
      triggerFinish(true);
      return;
    }

    const targetEndTime = Date.now() + remaining * 1000;
    completedRef.current = false;
    statusRef.current = 'running';
    endTimeRef.current = targetEndTime;

    setStatus('running');
    persistState({
      status: 'running',
      endTime: targetEndTime,
      remainingSeconds: remaining
    });
  }, [persistState, triggerFinish]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'running') {
      pause();
    } else if (statusRef.current === 'paused') {
      resume();
    }
  }, [pause, resume]);

  const adjustSeconds = useCallback((deltaSeconds) => {
    const delta = Math.round(Number(deltaSeconds) || 0);
    if (delta === 0) return;

    if (statusRef.current === 'running' && endTimeRef.current) {
      const currentRemMs = Math.max(0, endTimeRef.current - Date.now());
      const nextEndTime = Date.now() + currentRemMs + delta * 1000;
      const nextSeconds = Math.max(0, Math.ceil((nextEndTime - Date.now()) / 1000));

      if (nextSeconds <= 0) {
        triggerFinish(true);
        return;
      }

      endTimeRef.current = nextEndTime;
      secondsLeftRef.current = nextSeconds;
      setSecondsLeft(nextSeconds);
      persistState({
        status: 'running',
        endTime: nextEndTime,
        remainingSeconds: nextSeconds
      });
    } else if (statusRef.current === 'paused') {
      const nextSeconds = Math.max(0, secondsLeftRef.current + delta);
      if (nextSeconds <= 0) {
        triggerFinish(true);
        return;
      }

      secondsLeftRef.current = nextSeconds;
      setSecondsLeft(nextSeconds);
      persistState({
        status: 'paused',
        endTime: null,
        remainingSeconds: nextSeconds
      });
    }
  }, [persistState, triggerFinish]);

  const stop = useCallback(() => {
    completedRef.current = true;
    statusRef.current = 'idle';
    endTimeRef.current = null;
    secondsLeftRef.current = 0;

    setStatus('idle');
    setSecondsLeft(0);
    persistState({ status: 'idle' });
  }, [persistState]);

  return {
    secondsLeft,
    status,
    isActive: status !== 'idle',
    isRunning: status === 'running',
    isPaused: status === 'paused',
    start,
    pause,
    resume,
    togglePause,
    adjustSeconds,
    stop
  };
}
