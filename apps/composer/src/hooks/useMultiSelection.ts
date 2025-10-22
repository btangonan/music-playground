/**
 * Multi-Selection Hook for Sequencer Grid
 *
 * Provides selection state management and interaction handlers for multi-selecting,
 * copying, pasting, and deleting placed icons in the sequencer grid.
 *
 * @see claudedocs/MULTI_SELECTION_DESIGN_SPEC.md for complete design specification
 */

import { useState, useEffect, useCallback } from 'react';

// Feature flags for future enhancements
export const FEATURE_FLAGS = {
  clipboard: false,   // Cmd+C/V support (future)
  marquee: false,     // Box selection (future)
  smartPaste: false   // Snap to empty cells (future)
} as const;

// Generic item type - must have an id field
export interface SelectableItem {
  id: string;
  [key: string]: any;
}

export interface UseMultiSelectionConfig<T extends SelectableItem> {
  items: T[];
  onChange: (items: T[]) => void;
  enabled?: boolean; // Enable/disable selection (e.g., during assignment mode)
}

export interface UseMultiSelectionReturn<T extends SelectableItem> {
  // Selection state
  selectedIds: Set<string>;
  selectedItems: T[];

  // Selection actions
  selectItem: (id: string) => void;
  toggleItem: (id: string) => void;
  addToSelection: (id: string) => void;
  setSelection: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Interaction handlers
  handleIconClick: (e: React.MouseEvent, item: T) => void;
  handleGridClick: (e: React.MouseEvent) => void;

  // Bulk operations
  deleteSelected: () => void;

  // Utilities
  isSelected: (id: string) => boolean;
}

/**
 * Custom hook for managing multi-selection in the sequencer grid
 *
 * @example
 * ```typescript
 * const selection = useMultiSelection({
 *   items: placements,
 *   onChange: setPlacements,
 *   enabled: !assignmentMode
 * });
 *
 * // In render:
 * <div onClick={(e) => selection.handleIconClick(e, placement)}>
 *   {selection.isSelected(placement.id) && <SelectionHighlight />}
 * </div>
 * ```
 */
export function useMultiSelection<T extends SelectableItem>({
  items,
  onChange,
  enabled = true
}: UseMultiSelectionConfig<T>): UseMultiSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cleanup: Remove IDs of deleted items from selection
  useEffect(() => {
    const validIds = new Set(items.map(item => item.id));
    setSelectedIds(prev => {
      const cleaned = new Set([...prev].filter(id => validIds.has(id)));
      // Only update if selection changed to avoid infinite loops
      return cleaned.size !== prev.size ? cleaned : prev;
    });
  }, [items]);

  // Get selected items
  const selectedItems = items.filter(item => selectedIds.has(item.id));

  // Check if item is selected
  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.has(id);
  }, [selectedIds]);

  // Select only this item (deselect others)
  const selectItem = useCallback((id: string) => {
    if (!enabled) return;
    setSelectedIds(new Set([id]));
  }, [enabled]);

  // Toggle item in selection
  const toggleItem = useCallback((id: string) => {
    if (!enabled) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [enabled]);

  // Add item to selection (without deselecting others)
  const addToSelection = useCallback((id: string) => {
    if (!enabled) return;
    setSelectedIds(prev => new Set(prev).add(id));
  }, [enabled]);

  // Set selection to specific IDs (replaces entire selection)
  const setSelection = useCallback((ids: string[]) => {
    if (!enabled) return;
    setSelectedIds(new Set(ids));
  }, [enabled]);

  // Select all items
  const selectAll = useCallback(() => {
    if (!enabled) return;
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items, enabled]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Handle icon click with modifier keys
  const handleIconClick = useCallback((e: React.MouseEvent, item: T) => {
    if (!enabled) return;

    e.stopPropagation();

    if (e.shiftKey) {
      // SHIFT+CLICK: Toggle in selection
      toggleItem(item.id);
    } else if (e.metaKey) {
      // CMD+CLICK: Add to selection
      addToSelection(item.id);
    } else {
      // PLAIN CLICK: Select only this one
      selectItem(item.id);
    }
  }, [enabled, toggleItem, addToSelection, selectItem]);

  // Handle grid click (deselect all)
  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;

    // Only clear if clicking empty space (not during drag)
    if (selectedIds.size > 0) {
      clearSelection();
    }
  }, [enabled, selectedIds.size, clearSelection]);

  // Delete all selected items
  const deleteSelected = useCallback(() => {
    if (!enabled || selectedIds.size === 0) return;

    const updated = items.filter(item => !selectedIds.has(item.id));
    onChange(updated);
    clearSelection();
  }, [items, selectedIds, onChange, clearSelection, enabled]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // SELECT ALL: Cmd+A
      if (e.metaKey && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        selectAll();
      }

      // DESELECT ALL: Escape
      if (e.key === 'Escape' && selectedIds.size > 0) {
        e.preventDefault();
        clearSelection();
      }

      // DELETE SELECTED: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        // Only delete if not typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, selectedIds.size, selectAll, clearSelection, deleteSelected]);

  return {
    selectedIds,
    selectedItems,
    selectItem,
    toggleItem,
    addToSelection,
    setSelection,
    selectAll,
    clearSelection,
    handleIconClick,
    handleGridClick,
    deleteSelected,
    isSelected
  };
}
