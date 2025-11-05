"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

// Schema will be created dynamically with translations
type FormValues = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  position?: string;
  department?: string;
  role: 'USER' | 'MANAGER_TIMESHEET' | 'MANAGER' | 'ADMIN';
};

interface InviteUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InviteUserForm({ onSuccess, onCancel }: InviteUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Tenant and group selection
  const [tenants, setTenants] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedManagedGroups, setSelectedManagedGroups] = useState<string[]>([]);

  const t = useTranslations('invitations');

  // Create schema with translated error messages
  const schema = z.object({
    email: z.string().email({ message: t('form.validation.invalid') }),
    first_name: z.string().min(2, { message: t('form.validation.required') }),
    last_name: z.string().min(2, { message: t('form.validation.required') }),
    phone_number: z.string().optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    role: z.enum(['USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN']),
  });

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      position: '',
      department: '',
      role: 'USER',
    },
  });

  const selectedRole = watch('role');
  const emailValue = watch('email');

  // Real-time email validation
  useEffect(() => {
    const validateEmail = async () => {
      if (!emailValue || emailValue.length < 3 || !emailValue.includes('@')) {
        setEmailError(null);
        return;
      }

      setEmailValidating(true);
      try {
        const response = await fetch(`/api/admin/users/check-email?email=${encodeURIComponent(emailValue)}`);
        const data = await response.json();

        if (data.exists) {
          setEmailError(t('errors.emailExists'));
        } else if (data.hasPendingInvitation) {
          setEmailError(t('errors.pendingInvitation'));
        } else {
          setEmailError(null);
        }
      } catch (err) {
        console.error('Error validating email:', err);
      } finally {
        setEmailValidating(false);
      }
    };

    const timeoutId = setTimeout(validateEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [emailValue, t]);

  // Helper function to parse and format error messages
  const parseErrorMessage = (data: any, status: number): string => {
    let errorMessage = t('messages.error');
    let errorDetails = '';

    if (typeof data.error === 'string' && data.error) {
      errorMessage = data.error;
    } else if (typeof data.error === 'object' && data.error !== null) {
      errorMessage = data.error.message || JSON.stringify(data.error);
    } else if (data.message) {
      errorMessage = data.message;
    }

    switch (status) {
      case 400:
        if (errorMessage.includes('already exists') || errorMessage.includes('já está cadastrado')) {
          errorDetails = '\n\n💡 ' + t('suggestions.emailExists');
        } else if (errorMessage.includes('convite pendente') || errorMessage.includes('pending invitation')) {
          errorDetails = '\n\n💡 ' + t('suggestions.pendingInvitation');
        } else if (errorMessage.includes('obrigatórios') || errorMessage.includes('required')) {
          errorDetails = '\n\n💡 ' + t('suggestions.requiredFields');
        } else if (errorMessage.includes('Email inválido') || errorMessage.includes('invalid email')) {
          errorDetails = '\n\n💡 ' + t('suggestions.invalidEmail');
        } else if (errorMessage.includes('gerentes') || errorMessage.includes('manager')) {
          errorDetails = '\n\n💡 ' + t('suggestions.managerGroupsOnly');
        }
        break;
      case 401:
        errorMessage = t('errors.unauthorized');
        errorDetails = '\n\n💡 ' + t('suggestions.unauthorized');
        break;
      case 403:
        errorMessage = t('errors.forbidden');
        errorDetails = '\n\n💡 ' + t('suggestions.forbidden');
        break;
      case 500:
        errorMessage = t('errors.serverError');
        errorDetails = '\n\n💡 ' + t('suggestions.serverError');
        break;
    }

    return errorMessage + errorDetails;
  };

  // Load tenants and groups
  useEffect(() => {
    loadTenants();
    loadGroups();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/admin/delegations/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.items || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  // Filter groups based on selected tenants
  const filteredGroups = selectedTenants.length > 0
    ? groups.filter(group => selectedTenants.includes(group.tenant_id))
    : groups;

  const onSubmit = async (values: FormValues) => {
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone_number,
        position: values.position,
        department: values.department,
        role: values.role,
        tenant_ids: selectedTenants,
        group_ids: selectedGroups,
        managed_group_ids: selectedManagedGroups,
      };

      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = parseErrorMessage(data, response.status);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        reset();
        setSelectedTenants([]);
        setSelectedGroups([]);
        setSelectedManagedGroups([]);
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(t('errors.networkError'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <div className="p-6 space-y-6 flex-1">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 font-medium">
              ✅ {t('messages.success')}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-200 font-medium mb-1">{t('messages.error')}</p>
                <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--card-foreground)]">{t('form.title')}</h3>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
              {t('form.email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              {...register('email')}
              className={`w-full rounded-lg border ${emailError ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--background)] text-[var(--foreground)] px-3 py-2`}
              placeholder={t('form.emailPlaceholder')}
            />
            {emailValidating && (
              <p className="text-blue-500 text-sm mt-1">{t('form.validation.checking')}</p>
            )}
            {emailError && (
              <p className="text-red-500 text-sm mt-1">{emailError}</p>
            )}
            {errors.email && !emailError && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
                {t('form.firstName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('first_name')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                placeholder={t('form.firstNamePlaceholder')}
              />
              {errors.first_name && (
                <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
                {t('form.lastName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('last_name')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                placeholder={t('form.lastNamePlaceholder')}
              />
              {errors.last_name && (
                <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
                {t('form.phone')} <span className="text-gray-400 text-xs">{t('form.phoneOptional')}</span>
              </label>
              <input
                type="tel"
                {...register('phone_number')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                placeholder={t('form.phonePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
                {t('form.position')} <span className="text-gray-400 text-xs">{t('form.positionOptional')}</span>
              </label>
              <input
                type="text"
                {...register('position')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                placeholder={t('form.positionPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
              {t('form.department')} <span className="text-gray-400 text-xs">{t('form.departmentOptional')}</span>
            </label>
            <input
              type="text"
              {...register('department')}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
              placeholder={t('form.departmentPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
              {t('form.role')} <span className="text-red-500">*</span>
            </label>
            <select
              {...register('role')}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
            >
              <option value="USER">{t('form.roles.USER')}</option>
              <option value="MANAGER_TIMESHEET">{t('form.roles.MANAGER_TIMESHEET')}</option>
              <option value="MANAGER">{t('form.roles.MANAGER')}</option>
              <option value="ADMIN">{t('form.roles.ADMIN')}</option>
            </select>
          </div>
        </div>

        {/* Tenant Selection */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--card-foreground)]">{t('form.tenants')}</h3>
          {tenants.length > 0 ? (
            <div className="border border-[var(--border)] rounded-lg p-3 max-h-32 overflow-y-auto">
              {tenants.map((tenant) => (
                <label key={tenant.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-[var(--muted)]/50 rounded px-2 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedTenants.includes(tenant.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTenants([...selectedTenants, tenant.id]);
                      } else {
                        setSelectedTenants(selectedTenants.filter(id => id !== tenant.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--foreground)]">{tenant.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] italic">{t('form.groupsEmpty')}</p>
          )}
        </div>

        {/* Group Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--card-foreground)]">{t('form.groups')}</h3>
            {selectedTenants.length > 0 && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {selectedTenants.length} tenant(s)
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{t('form.groupsHelp')}</p>
          {filteredGroups.length > 0 ? (
            <div className="border border-[var(--border)] rounded-lg p-3 max-h-32 overflow-y-auto">
              {filteredGroups.map((group) => (
                <label key={group.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-[var(--muted)]/50 rounded px-2 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroups([...selectedGroups, group.id]);
                      } else {
                        setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--foreground)]">{group.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] italic">
              {t('form.groupsEmpty')}
            </p>
          )}
        </div>

        {/* Managed Groups */}
        {(selectedRole === 'MANAGER' || selectedRole === 'MANAGER_TIMESHEET') && (
          <div className="space-y-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">{t('form.managedGroups')}</h3>
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {t('form.managedGroupsHelp')}
            </p>
            {filteredGroups.length > 0 ? (
              <div className="border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                {filteredGroups.map((group) => (
                  <label key={group.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded px-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedManagedGroups.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedManagedGroups([...selectedManagedGroups, group.id]);
                        } else {
                          setSelectedManagedGroups(selectedManagedGroups.filter(id => id !== group.id));
                        }
                      }}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-[var(--foreground)]">{group.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-purple-700 dark:text-purple-300 italic">
                {t('form.managedGroupsEmpty')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)] flex-shrink-0 bg-[var(--card)]">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
        >
          {t('form.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading || emailValidating || !!emailError}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {loading ? t('form.submitting') : t('form.submit')}
        </button>
      </div>
    </form>
  );
}

