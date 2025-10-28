/**
 * useKeyboardNavigation Hook
 * 
 * React hook for keyboard navigation support (WCAG 2.1 AA compliance).
 * Handles arrow keys, Enter, Escape, Tab, etc.
 * 
 * Usage:
 * const { focusedIndex, setFocusedIndex } = useKeyboardNavigation({
 *   itemCount: items.length,
 *   onSelect: (index) => handleSelect(items[index]),
 *   onEscape: () => closeMenu(),
 * });
 */

'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseKeyboardNavigationOptions {
  /**
   * Total number of items to navigate
   */
  itemCount: number;
  
  /**
   * Initial focused index
   */
  initialIndex?: number;
  
  /**
   * Callback when an item is selected (Enter key)
   */
  onSelect?: (index: number) => void;
  
  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;
  
  /**
   * Enable/disable keyboard navigation
   */
  enabled?: boolean;
  
  /**
   * Enable loop navigation (wrap around)
   */
  loop?: boolean;
  
  /**
   * Orientation of navigation
   */
  orientation?: 'vertical' | 'horizontal' | 'both';
}

export interface UseKeyboardNavigationReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  resetFocus: () => void;
}

export function useKeyboardNavigation({
  itemCount,
  initialIndex = -1,
  onSelect,
  onEscape,
  enabled = true,
  loop = true,
  orientation = 'vertical',
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);

  const resetFocus = useCallback(() => {
    setFocusedIndex(initialIndex);
  }, [initialIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;

      const { key } = event;

      // Handle Escape
      if (key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle Enter/Space
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < itemCount) {
          onSelect?.(focusedIndex);
        }
        return;
      }

      // Handle Arrow Keys
      let nextIndex = focusedIndex;

      if (orientation === 'vertical' || orientation === 'both') {
        if (key === 'ArrowDown') {
          event.preventDefault();
          nextIndex = focusedIndex + 1;
        } else if (key === 'ArrowUp') {
          event.preventDefault();
          nextIndex = focusedIndex - 1;
        }
      }

      if (orientation === 'horizontal' || orientation === 'both') {
        if (key === 'ArrowRight') {
          event.preventDefault();
          nextIndex = focusedIndex + 1;
        } else if (key === 'ArrowLeft') {
          event.preventDefault();
          nextIndex = focusedIndex - 1;
        }
      }

      // Handle Home/End
      if (key === 'Home') {
        event.preventDefault();
        nextIndex = 0;
      } else if (key === 'End') {
        event.preventDefault();
        nextIndex = itemCount - 1;
      }

      // Apply loop or clamp
      if (loop) {
        nextIndex = ((nextIndex % itemCount) + itemCount) % itemCount;
      } else {
        nextIndex = Math.max(0, Math.min(itemCount - 1, nextIndex));
      }

      if (nextIndex !== focusedIndex) {
        setFocusedIndex(nextIndex);
      }
    },
    [enabled, itemCount, focusedIndex, onSelect, onEscape, loop, orientation]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    resetFocus,
  };
}

/**
 * useFocusTrap Hook
 * 
 * Traps focus within a container (useful for modals, dropdowns).
 * 
 * Usage:
 * const containerRef = useFocusTrap<HTMLDivElement>(isOpen);
 */
export function useFocusTrap<T extends HTMLElement>(
  enabled: boolean = true
): React.RefObject<T | null> {
  const containerRef = React.useRef<T | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return containerRef;
}

/**
 * useEscapeKey Hook
 * 
 * Listens for Escape key press.
 * 
 * Usage:
 * useEscapeKey(() => closeModal(), isOpen);
 */
export function useEscapeKey(
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback, enabled]);
}

// Fix: Import React for useRef
import React from 'react';

