"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

const schema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().optional(),
  firstName: z.string().min(2, { message: "Nome muito curto" }),
  lastName: z.string().min(2, { message: "Sobrenome muito curto" }),
  phoneNumber: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET', 'USER']),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface AdminUserFormProps {
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    position?: string;
    department?: string;
    role: string;
    active: boolean;
  };
}

export default function AdminUserForm({ user }: AdminUserFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const t = useTranslations('admin.users');
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'pt-BR';
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ 
    resolver: zodResolver(schema),
    defaultValues: user ? {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number || '',
      position: user.position || '',
      department: user.department || '',
      role: user.role as 'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER',
      active: user.active,
    } : {
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      position: '',
      department: '',
      role: 'USER',
      active: true,
    }
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const url = user 
        ? `/api/admin/users/${user.id}` 
        : '/api/admin/users';
      
      const method = user ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          first_name: values.firstName,
          last_name: values.lastName,
          phone_number: values.phoneNumber,
          position: values.position,
          department: values.department,
          role: values.role,
          active: values.active,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Erro ao salvar usuário');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/admin/users`);
      }, 1500);
    } catch {
      setError('Erro ao salvar usuário. Tente novamente.');
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Erro ao resetar senha');
        setLoading(false);
        return;
      }

      alert(`Senha temporária: ${data.temporaryPassword}\n\nCopie esta senha e envie ao usuário.`);
      setShowResetPassword(false);
      setLoading(false);
    } catch {
      setError('Erro ao resetar senha. Tente novamente.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-[var(--muted)] border border-[var(--border)] rounded-lg p-6 text-center">
        <svg className="w-16 h-16 mx-auto text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-[var(--card-foreground)] mb-2">{t('successTitle')}</h3>
        <p className="text-[var(--muted-foreground)]">{t('successMessage')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {t('firstName')} <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
            {...register("firstName")}
          />
          {errors.firstName && <p className="text-[var(--destructive)] text-sm mt-1">{errors.firstName.message}</p>}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {t('lastName')} <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
            {...register("lastName")}
          />
          {errors.lastName && <p className="text-[var(--destructive)] text-sm mt-1">{errors.lastName.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          {t('email')} <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
          {...register("email")}
        />
        {errors.email && <p className="text-[var(--destructive)] text-sm mt-1">{errors.email.message}</p>}
      </div>

      {/* Password (only for new users or if editing) */}
      {!user && (
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {t('password')} <span className="text-red-600">*</span>
          </label>
          <input
            type="password"
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
            {...register("password")}
          />
          {errors.password && <p className="text-[var(--destructive)] text-sm mt-1">{errors.password.message}</p>}
        </div>
      )}

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
          {t('phoneNumber')}
        </label>
        <input
          type="tel"
          className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
          {...register("phoneNumber")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {t('position')}
          </label>
          <input
            type="text"
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
            {...register("position")}
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {t('department')}
          </label>
          <input
            type="text"
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
            {...register("department")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {t('role')} <span className="text-red-600">*</span>
          </label>
          <select
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all"
            {...register("role")}
          >
            <option value="USER">{t('roleUser')}</option>
            <option value="MANAGER_TIMESHEET">{t('roleManagerTimesheet')}</option>
            <option value="MANAGER">{t('roleManager')}</option>
            <option value="ADMIN">{t('roleAdmin')}</option>
          </select>
          {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>}
        </div>

        {/* Active Status */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {t('status')}
          </label>
          <div className="flex items-center h-12">
            <input
              type="checkbox"
              className="w-5 h-5 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
              {...register("active")}
            />
            <span className="ml-3 text-sm text-[var(--muted-foreground)]">{t('activeUser')}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-lg p-3">
          <p className="text-[var(--foreground)] text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
        <div>
          {user && (
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="text-sm text-[var(--primary)] hover:opacity-90 transition-colors"
            >
              {t('resetPassword')}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/admin/users`)}
            className="px-6 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)] transition-colors font-medium"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </button>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-xl p-6 max-w-md w-full mx-4 border border-[var(--border)]">
            <h3 className="text-lg font-bold text-[var(--card-foreground)] mb-4">{t('resetPasswordTitle')}</h3>
            <p className="text-[var(--muted-foreground)] mb-6">{t('resetPasswordConfirm')}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="px-4 py-2 bg-[var(--destructive)] text-[var(--destructive-foreground)] rounded-lg hover:opacity-90 transition-colors disabled:opacity-60"
              >
                {loading ? t('resetting') : t('resetPasswordButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

