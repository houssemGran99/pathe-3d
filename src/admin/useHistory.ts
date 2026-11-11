import { useCallback, useMemo, useReducer } from 'react';

type Updater<T> = T | ((prev: T) => T);
interface State<T> {
  past: T[];
  present: T;
  future: T[];
}
type Action<T> = { type: 'push' | 'replace'; next: Updater<T> } | { type: 'undo' | 'redo' } | { type: 'reset'; value: T };

const LIMIT = 200;
const resolve = <T,>(next: Updater<T>, prev: T): T => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next);

function reducer<T>(s: State<T>, a: Action<T>): State<T> {
  switch (a.type) {
    case 'push': {
      const next = resolve(a.next, s.present);
      if (next === s.present) return s;
      return { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [] };
    }
    case 'replace': {
      // Used during a paint stroke: the whole stroke becomes one undo step.
      const next = resolve(a.next, s.present);
      return next === s.present ? s : { ...s, present: next };
    }
    case 'undo':
      if (!s.past.length) return s;
      return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] };
    case 'redo':
      if (!s.future.length) return s;
      return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
    case 'reset':
      return { past: [], present: a.value, future: [] };
  }
}

/** Undo/redo history for an immutable value. Updaters that return the same object are ignored. */
export function useHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(reducer as (s: State<T>, a: Action<T>) => State<T>, {
    past: [],
    present: initial,
    future: [],
  });
  const push = useCallback((next: Updater<T>) => dispatch({ type: 'push', next }), []);
  const replace = useCallback((next: Updater<T>) => dispatch({ type: 'replace', next }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback((value: T) => dispatch({ type: 'reset', value }), []);
  return useMemo(
    () => ({
      present: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      push,
      replace,
      undo,
      redo,
      reset,
    }),
    [state, push, replace, undo, redo, reset],
  );
}
