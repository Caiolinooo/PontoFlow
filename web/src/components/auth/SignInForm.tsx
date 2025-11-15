"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Alert from "@/components/ui/Alert";
import FloatingInput from "@/components/ui/FloatingInput";

type FormValues = {
  email: string;
  password: string;
};

export default function SignInForm({ redirectTo }: { redirectTo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('auth.signIn');
  const tErr = useTranslations('errors');
  const tVal = useTranslations('validation');

  // Build schema with i18n messages
  const schema = z.object({
    email: z.string().email({ message: tVal('emailInvalid') }),
    password: z.string().min(6, { message: tVal('passwordMin', { min: 6 }) }),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setLoading(true);

    try {
      console.log('[SIGNIN_FORM] Submitting login for:', values.email);
      console.log('[SIGNIN_FORM] Redirect target:', redirectTo);

      // Call custom auth API
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
        credentials: 'same-origin', // Ensure cookies are sent/received
      });

      console.log('[SIGNIN_FORM] Response status:', response.status);
      console.log('[SIGNIN_FORM] Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('[SIGNIN_FORM] Response data:', {
        success: data.success,
        hasUser: !!data.user,
        error: data.error
      });

      if (!response.ok || data.error) {
        console.error('[SIGNIN_FORM] Login failed:', data.error);
        const errorMessage = data.error || tErr('generic');
        console.error('[SIGNIN_FORM] Showing error to user:', errorMessage);
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (!data.success || !data.user) {
        console.error('[SIGNIN_FORM] Invalid response format:', data);
        setError(tErr('generic'));
        setLoading(false);
        return;
      }

      console.log('[SIGNIN_FORM] Login successful, redirecting to:', redirectTo);
      console.log('[SIGNIN_FORM] Current cookies (httpOnly cookies won\'t show):', document.cookie);

      // Small delay to ensure cookie is set before redirecting
      // This helps avoid race conditions on some browsers
      setTimeout(() => {
        console.log('[SIGNIN_FORM] Executing redirect now...');
        window.location.href = redirectTo;
      }, 100);
    } catch (error) {
      console.error('[SIGNIN_FORM] Exception during login:', error);
      setError(tErr('generic'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FloatingInput
        id="email"
        type="email"
        label={t('email')}
        {...register('email')}
        value={watch('email')}
        error={errors.email ? String(errors.email.message) : null}
      />
      <FloatingInput
        id="password"
        type="password"
        label={t('password')}
        {...register('password')}
        value={watch('password')}
        error={errors.password ? String(errors.password.message) : null}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
            {t('signingIn')}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {t('signInButton')}
          </>
        )}
      </button>
    </form>
  );
}
