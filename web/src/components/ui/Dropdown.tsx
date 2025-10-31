/**
 * Dropdown Component
 * 
 * Accessible dropdown menu with keyboard navigation.
 * Supports arrow keys, Enter, Escape, and focus management.
 * 
 * Usage:
 * <Dropdown
 *   trigger={<Button>Open Menu</Button>}
 *   items={[
 *     { label: 'Edit', onClick: handleEdit, icon: <EditIcon /> },
 *     { label: 'Delete', onClick: handleDelete, variant: 'danger' },
 *   ]}
 * />
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  /**
   * Trigger element
   */
  trigger: React.ReactNode;
  
  /**
   * Dropdown items
   */
  items: DropdownItem[];
  
  /**
   * Alignment
   */
  align?: 'left' | 'right';
  
  /**
   * Custom className for dropdown menu
   */
  className?: string;
}

export default function Dropdown({
  trigger,
  items,
  align = 'left',
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const enabledItems = items.filter(item => !item.disabled && !item.divider);

  const { focusedIndex, setFocusedIndex, handleKeyDown } = useKeyboardNavigation({
    itemCount: enabledItems.length,
    onSelect: (index) => {
      const item = enabledItems[index];
      if (item && !item.disabled) {
        item.onClick();
        setIsOpen(false);
      }
    },
    onEscape: () => {
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    enabled: isOpen,
    loop: true,
    orientation: 'vertical',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset focus when opening
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
    }
  }, [isOpen, setFocusedIndex]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 rounded-lg"
      >
        {trigger}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute ${alignClasses[align]} mt-2 w-56 z-50
            bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl
            py-1 animate-scale-in origin-top
            ${className}
          `}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-[var(--border)]"
                  role="separator"
                />
              );
            }

            const enabledIndex = enabledItems.indexOf(item);
            const isFocused = enabledIndex === focusedIndex;

            const variantClasses = {
              default: 'text-[var(--foreground)] hover:bg-[var(--muted)]',
              danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
            };

            return (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                role="menuitem"
                tabIndex={isFocused ? 0 : -1}
                className={`
                  w-full px-4 py-2 text-left text-sm flex items-center gap-3
                  transition-colors
                  ${variantClasses[item.variant || 'default']}
                  ${isFocused ? 'bg-[var(--muted)]' : ''}
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  focus-visible:outline-none focus-visible:bg-[var(--muted)]
                `}
              >
                {item.icon && (
                  <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Context Menu Dropdown
 * Triggered by right-click
 */

export interface ContextMenuProps {
  children: React.ReactNode;
  items: DropdownItem[];
  className?: string;
}

export function ContextMenu({ children, items, className = '' }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = () => setIsOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>

      {isOpen && (
        <div
          ref={menuRef}
          className={`
            fixed z-50 w-56
            bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl
            py-1 animate-scale-in
            ${className}
          `}
          style={{ left: position.x, top: position.y }}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-[var(--border)]"
                  role="separator"
                />
              );
            }

            const variantClasses = {
              default: 'text-[var(--foreground)] hover:bg-[var(--muted)]',
              danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
            };

            return (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                role="menuitem"
                className={`
                  w-full px-4 py-2 text-left text-sm flex items-center gap-3
                  transition-colors
                  ${variantClasses[item.variant || 'default']}
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {item.icon && (
                  <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

