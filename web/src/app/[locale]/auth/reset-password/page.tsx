"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import FloatingInput from "@/components/ui/FloatingInput";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { branding } from "@/config/branding";

type FormValues = {
  password: string;
  confirmPassword: string;
};

function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const t = useTranslations('auth.resetPassword');
  const tErr = useTranslations('errors');
  const tVal = useTranslations('validation');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const schema = z.object({
    password: z.string()
      .min(8, { message: tVal('passwordMin', { min: 8 }) })
      .regex(/[A-Z]/, { message: tVal('passwordUppercase') })
      .regex(/[a-z]/, { message: tVal('passwordLowercase') })
      .regex(/[0-9]/, { message: tVal('passwordNumber') })
      .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: tVal('passwordSpecial') }),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: tVal('passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    if (!token) {
      setError(t('invalidToken'));
    }
  }, [token, t]);

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      setError(t('invalidToken'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password })
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        return setError(data.error || tErr('generic'));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch {
      setLoading(false);
      setError(tErr('generic'));
    }
  };

  if (!token) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200 text-sm">
          {t('invalidToken')}
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {t('success')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FloatingInput
        id="password"
        type="password"
        label={t('newPassword')}
        {...register('password')}
        value={watch('password')}
        error={errors.password ? String(errors.password.message) : null}
      />
      <FloatingInput
        id="confirmPassword"
        type="password"
        label={t('confirmPassword')}
        {...register('confirmPassword')}
        value={watch('confirmPassword')}
        error={errors.confirmPassword ? String(errors.confirmPassword.message) : null}
      />

      {/* Password Requirements */}
      <div className="bg-[var(--muted)] border border-[var(--border)] rounded-lg p-3">
        <p className="text-xs text-[var(--foreground)] font-medium mb-1.5">{t('requirements')}</p>
        <ul className="text-xs text-[var(--muted-foreground)] space-y-0.5">
          <li>• {t('req1')}</li>
          <li>• {t('req2')}</li>
          <li>• {t('req3')}</li>
          <li>• {t('req4')}</li>
          <li>• {t('req5')}</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            {t('resetting')}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {t('resetButton')}
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-8 sm:p-10">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl} alt={branding.companyName} className="w-16 h-16 mx-auto mb-3 object-contain drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">{t('title')}</h1>
          <p className="text-[var(--muted-foreground)] text-sm">{t('subtitle')}</p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

