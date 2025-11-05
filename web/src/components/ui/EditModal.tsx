"use client";

import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

export interface EditField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'textarea';
  value: string | number;
  placeholder?: string;
  required?: boolean;
  validation?: (value: string | number) => string | null; // Returns error message or null
}

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: EditField[];
  onSave: (values: Record<string, string | number>) => Promise<void>;
  saveButtonText?: string;
  cancelButtonText?: string;
}

export default function EditModal({
  open,
  onClose,
  title,
  fields,
  onSave,
  saveButtonText = 'Save',
  cancelButtonText = 'Cancel',
}: EditModalProps) {
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    fields.forEach(field => {
      initial[field.name] = field.value;
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Reset values when modal opens with new fields
  React.useEffect(() => {
    if (open) {
      const initial: Record<string, string | number> = {};
      fields.forEach(field => {
        initial[field.name] = field.value;
      });
      setValues(initial);
      setErrors({});
      setGeneralError(null);
    }
  }, [open, fields]);

  const handleChange = (name: string, value: string | number) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = values[field.name];

      // Required validation
      if (field.required && (!value || value.toString().trim() === '')) {
        newErrors[field.name] = `${field.label} is required`;
        return;
      }

      // Custom validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    setGeneralError(null);

    try {
      await onSave(values);
      onClose();
    } catch (error: any) {
      setGeneralError(error?.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {generalError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
            {generalError}
          </div>
        )}

        {fields.map(field => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className={`
                  w-full px-3 py-2 rounded-lg border
                  bg-[var(--background)] text-[var(--foreground)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)]
                  ${errors[field.name] ? 'border-red-500' : 'border-[var(--border)]'}
                `}
              />
            ) : (
              <input
                id={field.name}
                type={field.type || 'text'}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={field.placeholder}
                className={`
                  w-full px-3 py-2 rounded-lg border
                  bg-[var(--background)] text-[var(--foreground)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)]
                  ${errors[field.name] ? 'border-red-500' : 'border-[var(--border)]'}
                `}
              />
            )}
            {errors[field.name] && (
              <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>
            )}
          </div>
        ))}

        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelButtonText}
          </Button>
          <Button variant="primary" onClick={handleSave} loading={loading}>
            {saveButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

