"use client";
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { branding } from "@/config/branding";
import FloatingInput from "@/components/ui/FloatingInput";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface FormValues { email: string }

export default function ResetPage() {
  const locale = useLocale();
  const t = useTranslations('auth.reset');
  const tSignIn = useTranslations('auth.signIn');
  const tVal = useTranslations('validation');
  const tErr = useTranslations('errors');

  const redirectTo = `/${locale}/auth/signin`;
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = z.object({ email: z.string().email({ message: tVal('emailInvalid') }) });
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null); setOk(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, redirectTo, locale })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) return setError(data.error || tErr('generic'));
      setOk(t('successMessage'));
    } catch {
      setLoading(false);
      setError(tErr('generic'));
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl} alt={branding.companyName} className="w-16 h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--foreground)] mb-2">{t('title')}</h1>
          <p className="text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FloatingInput id="reset-email" type="email" label={t('email')} {...register('email')} error={errors.email ? String(errors.email.message) : null} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {ok && <p className="text-green-700 text-sm">{ok}</p>}
          <div className="flex items-center justify-between">
            <a href={redirectTo} className="text-sm text-[var(--primary)] hover:opacity-90 transition-colors">{t('backToSignIn')}</a>
            <button type="submit" disabled={loading} className="inline-flex items-center px-4 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">
              {loading ? t('sending') : t('sendLink')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

