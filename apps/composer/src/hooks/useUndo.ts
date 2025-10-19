import { useReducer, useCallback } from 'react';

interface UndoState<T> {
  history: T[];
  index: number;
}

type UndoAction<T> =
  | { type: 'SET'; payload: T }
  | { type: 'UNDO' };

/**
 * Minimal undo hook with fixed-size history buffer
 * Optimized for speed with stable callback references
 *
 * @param initialState - Initial state value
 * @param maxHistory - Maximum undo levels (default: 5)
 * @returns [currentState, setState, undo, canUndo]
 */
export function useUndo<T>(initialState: T, maxHistory: number = 5) {
  const [state, dispatch] = useReducer(
    (state: UndoState<T>, action: UndoAction<T>): UndoState<T> => {
      switch (action.type) {
        case 'SET': {
          // Remove future states and add new state
          const newHistory = [...state.history.slice(0, state.index + 1), action.payload];
          // Keep only last maxHistory items for memory efficiency
          const trimmedHistory = newHistory.slice(-maxHistory);
          return {
            history: trimmedHistory,
            index: trimmedHistory.length - 1
          };
        }
        case 'UNDO': {
          // Only allow undo if we're not at the beginning
          if (state.index > 0) {
            return { ...state, index: state.index - 1 };
          }
          return state;
        }
        default:
          return state;
      }
    },
    { history: [initialState], index: 0 }
  );

  // Stable callback references - won't cause re-renders
  const setState = useCallback((newState: T) => {
    dispatch({ type: 'SET', payload: newState });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const canUndo = state.index > 0;

  return [state.history[state.index], setState, undo, canUndo] as const;
}
