"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Stepper, { Step } from '@/components/ui/Stepper';

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

interface InviteUserFormWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
  currentTenantId: string | null;
  userRole: string | null;
}

export default function InviteUserFormWizard({ onSuccess, onCancel, currentTenantId, userRole }: InviteUserFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
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

  const { register, handleSubmit, formState: { errors }, watch, reset, trigger } = useForm<FormValues>({
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

  // Check if user is admin (full access mode)
  const isAdmin = userRole === 'ADMIN';

  // Define wizard steps
  const steps: Step[] = [
    { id: 1, label: t('wizard.step1.label'), description: t('wizard.step1.description') },
    { id: 2, label: t('wizard.step2.label'), description: t('wizard.step2.description') },
    { id: 3, label: t('wizard.step3.label'), description: t('wizard.step3.description') },
    { id: 4, label: t('wizard.step4.label'), description: t('wizard.step4.description') },
  ];

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

  // Load tenants and groups
  useEffect(() => {
    loadTenants();
    loadGroups();
  }, []);

  // Pre-select current tenant if available (only for non-admin users)
  useEffect(() => {
    if (!isAdmin && currentTenantId && tenants.length > 0 && selectedTenants.length === 0) {
      setSelectedTenants([currentTenantId]);
    }
    // For admin users, pre-select current tenant but allow access to all
    if (isAdmin && currentTenantId && tenants.length > 0 && selectedTenants.length === 0) {
      setSelectedTenants([currentTenantId]);
    }
  }, [currentTenantId, tenants, isAdmin]);

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

  // When tenants change, remove groups that are no longer valid
  useEffect(() => {
    if (selectedTenants.length > 0) {
      const validGroupIds = filteredGroups.map(g => g.id);
      setSelectedGroups(prev => prev.filter(id => validGroupIds.includes(id)));
      setSelectedManagedGroups(prev => prev.filter(id => validGroupIds.includes(id)));
    }
  }, [selectedTenants]);

  // Navigation handlers
  const handleNext = async () => {
    let isValid = false;

    // Validate current step before proceeding
    if (currentStep === 1) {
      isValid = await trigger(['email', 'first_name', 'last_name', 'phone_number', 'position', 'department']);
      if (isValid && !emailError && !emailValidating) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      isValid = await trigger(['role']);
      if (isValid) {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  // Helper function to parse and format error messages
  const parseErrorMessage = (data: any, status: number): string => {
    let errorMessage = t('errors.submitError');
    
    if (typeof data.error === 'string' && data.error) {
      errorMessage = data.error;
    } else if (typeof data.error === 'object' && data.error !== null) {
      errorMessage = data.error.message || JSON.stringify(data.error);
    } else if (data.message) {
      errorMessage = data.message;
    }

    return errorMessage;
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(false);
    setLoading(true);

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
        setCurrentStep(1);
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
      {/* Stepper */}
      <div className="px-6 pt-4 pb-2 border-b border-[var(--border)] flex-shrink-0 bg-[var(--muted)]">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          allowClickNavigation={true}
        />
      </div>

      {/* Content Area - No scrolling needed! */}
      <div className="flex-1 p-6 min-h-0 overflow-y-auto">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 dark:text-green-200 font-medium">
                {t('messages.success')}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
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

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">{t('wizard.step1.title')}</h3>

            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                {t('form.email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email')}
                className={emailError ? 'border-red-500' : ''}
                placeholder={t('form.emailPlaceholder')}
              />
              {emailValidating && (
                <p className="text-[var(--primary)] text-sm mt-1 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('form.validation.checking')}
                </p>
              )}
              {emailError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{emailError}</p>
              )}
              {errors.email && !emailError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                  {t('form.firstName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('first_name')}
                  placeholder={t('form.firstNamePlaceholder')}
                />
                {errors.first_name && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                  {t('form.lastName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('last_name')}
                  placeholder={t('form.lastNamePlaceholder')}
                />
                {errors.last_name && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                  {t('form.phone')}
                </label>
                <input
                  type="tel"
                  {...register('phone_number')}
                  placeholder={t('form.phonePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--card-foreground)]">
                  {t('form.position')}
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
                {t('form.department')}
              </label>
              <input
                type="text"
                {...register('department')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                placeholder={t('form.departmentPlaceholder')}
              />
            </div>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">{t('wizard.step2.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">{t('wizard.step2.subtitle')}</p>

            <div className="grid grid-cols-1 gap-3">
              {(['USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN'] as const).map((role) => (
                <label
                  key={role}
                  className={`
                    relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${watch('role') === role
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-[var(--border)] hover:border-purple-300 dark:hover:border-purple-700'
                    }
                  `}
                >
                  <input
                    type="radio"
                    {...register('role')}
                    value={role}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--card-foreground)]">
                      {t(`form.roles.${role}`)}
                    </div>
                    <div className="text-sm text-[var(--muted-foreground)] mt-1">
                      {t(`form.roleDescriptions.${role}`)}
                    </div>
                  </div>
                  {watch('role') === role && (
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Tenants & Groups */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--card-foreground)]">{t('wizard.step3.title')}</h3>
              {isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-xs font-semibold shadow-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admin Mode: Full Access</span>
                </div>
              )}
            </div>

            {/* Tenants Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-[var(--card-foreground)]">{t('form.tenants')}</h4>
                {currentTenantId && !isAdmin && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                    {t('wizard.step3.contextTenant')}
                  </span>
                )}
                {currentTenantId && isAdmin && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    {t('wizard.step3.contextTenant')} • All tenants available
                  </span>
                )}
              </div>
              {tenants.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {tenants.map((tenant) => (
                    <label key={tenant.id} className="flex items-center space-x-2 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--muted)]/50 transition-colors">
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
                      <span className="text-sm text-[var(--foreground)] font-medium">{tenant.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] italic">{t('form.noTenants')}</p>
              )}
            </div>

            {/* Groups Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-[var(--card-foreground)]">{t('form.groups')}</h4>
                {selectedTenants.length > 0 && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {t('wizard.step3.filteredGroups', { count: selectedTenants.length })}
                  </span>
                )}
              </div>
              {filteredGroups.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-[var(--border)] rounded-lg">
                  {filteredGroups.map((group) => (
                    <label key={group.id} className="flex items-center space-x-2 p-2 hover:bg-[var(--muted)]/50 rounded transition-colors cursor-pointer">
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
                  {selectedTenants.length > 0
                    ? t('form.noGroupsForTenants')
                    : t('form.selectTenantFirst')}
                </p>
              )}
            </div>

            {/* Managed Groups (only for MANAGER and MANAGER_TIMESHEET) */}
            {(selectedRole === 'MANAGER' || selectedRole === 'MANAGER_TIMESHEET') && (
              <div className="space-y-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h4 className="text-md font-semibold text-purple-900 dark:text-purple-100">{t('form.managedGroups')}</h4>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">{t('form.managedGroupsDescription')}</p>
                {filteredGroups.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 rounded-lg">
                    {filteredGroups.map((group) => (
                      <label key={group.id} className="flex items-center space-x-2 p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors cursor-pointer">
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
                  <p className="text-sm text-purple-700 dark:text-purple-300 italic">{t('form.managedGroupsEmpty')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">{t('wizard.step4.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">{t('wizard.step4.subtitle')}</p>

            {/* Review Summary */}
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="bg-[var(--muted)]/30 rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[var(--card-foreground)]">{t('wizard.step1.label')}</h4>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {t('wizard.edit')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[var(--muted-foreground)]">{t('form.email')}:</span>
                    <p className="font-medium text-[var(--foreground)]">{watch('email')}</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)]">{t('form.firstName')}:</span>
                    <p className="font-medium text-[var(--foreground)]">{watch('first_name')}</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)]">{t('form.lastName')}:</span>
                    <p className="font-medium text-[var(--foreground)]">{watch('last_name')}</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)]">{t('form.phone')}:</span>
                    <p className="font-medium text-[var(--foreground)]">{watch('phone_number') || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)]">{t('form.position')}:</span>
                    <p className="font-medium text-[var(--foreground)]">{watch('position') || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)]">{t('form.department')}:</span>
                    <p className="font-medium text-[var(--foreground)]">{watch('department') || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="bg-[var(--muted)]/30 rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[var(--card-foreground)]">{t('wizard.step2.label')}</h4>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {t('wizard.edit')}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                    {t(`form.roles.${watch('role')}`)}
                  </span>
                </div>
              </div>

              {/* Tenants & Groups */}
              <div className="bg-[var(--muted)]/30 rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[var(--card-foreground)]">{t('wizard.step3.label')}</h4>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {t('wizard.edit')}
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-[var(--muted-foreground)] font-medium">{t('form.tenants')}:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedTenants.length > 0 ? (
                        selectedTenants.map(tenantId => {
                          const tenant = tenants.find(t => t.id === tenantId);
                          return (
                            <span key={tenantId} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                              {tenant?.name || tenantId}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[var(--muted-foreground)] italic">{t('wizard.step4.noSelection')}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--muted-foreground)] font-medium">{t('form.groups')}:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedGroups.length > 0 ? (
                        selectedGroups.map(groupId => {
                          const group = groups.find(g => g.id === groupId);
                          return (
                            <span key={groupId} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                              {group?.name || groupId}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[var(--muted-foreground)] italic">{t('wizard.step4.noSelection')}</span>
                      )}
                    </div>
                  </div>
                  {(selectedRole === 'MANAGER' || selectedRole === 'MANAGER_TIMESHEET') && (
                    <div>
                      <span className="text-[var(--muted-foreground)] font-medium">{t('form.managedGroups')}:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedManagedGroups.length > 0 ? (
                          selectedManagedGroups.map(groupId => {
                            const group = groups.find(g => g.id === groupId);
                            return (
                              <span key={groupId} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                {group?.name || groupId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[var(--muted-foreground)] italic">{t('wizard.step4.noSelection')}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Final Confirmation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">{t('wizard.step4.confirmTitle')}</p>
                  <p>{t('wizard.step4.confirmMessage')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="flex items-center justify-between gap-3 p-6 border-t border-[var(--border)] flex-shrink-0 bg-[var(--muted)]">
        <button
          type="button"
          onClick={currentStep === 1 ? onCancel : handleBack}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] bg-[var(--card)] hover:bg-[var(--muted)] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {currentStep === 1 ? t('form.cancel') : t('wizard.back')}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted-foreground)] font-medium">
            {t('wizard.stepIndicator', { current: currentStep, total: steps.length })}
          </span>
        </div>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || emailValidating || !!emailError}
            className="px-6 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {t('wizard.next')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || emailValidating || !!emailError}
            className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('form.submitting')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('form.submit')}
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}

