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

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
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
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || tErr('generic'));
        setLoading(false);
        return;
      }

      // Force a hard navigation to ensure middleware runs
      window.location.href = redirectTo;
    } catch {
      setError(tErr('generic'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FloatingInput
        id="email"
        type="email"
        label={t('email')}
        {...register('email')}
        error={errors.email ? String(errors.email.message) : null}
      />
      <FloatingInput
        id="password"
        type="password"
        label={t('password')}
        {...register('password')}
        error={errors.password ? String(errors.password.message) : null}
      />
      {error && (
        <Alert variant="error">{error}</Alert>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] font-medium py-2.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            {t('signingIn')}
          </>
        ) : (
          t('signInButton')
        )}
      </button>
    </form>
  );
}

