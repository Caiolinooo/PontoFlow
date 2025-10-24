"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import FloatingInput from "@/components/ui/FloatingInput";

interface FormValues {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  position?: string;
  department?: string;
}

export default function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('auth.signUp');
  const tSignIn = useTranslations('auth.signIn');
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'pt-BR';

  const tErr = useTranslations('errors');
  const tVal = useTranslations('validation');

  const schema = z.object({
    email: z.string().email({ message: tVal('emailInvalid') }),
    password: z.string()
      .min(8, { message: tVal('passwordMin', { min: 8 }) })
      .regex(/[A-Z]/, { message: tVal('passwordRequiresUpper') })
      .regex(/[a-z]/, { message: tVal('passwordRequiresLower') })
      .regex(/[0-9]/, { message: tVal('passwordRequiresNumber') })
      .regex(/[^A-Za-z0-9]/, { message: tVal('passwordRequiresSpecial') }),
    confirmPassword: z.string(),
    firstName: z.string().min(2, { message: tVal('firstNameTooShort') }),
    lastName: z.string().min(2, { message: tVal('lastNameTooShort') }),
    phoneNumber: z.string().optional(),
    position: z.string().optional(),
    department: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: tVal('passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });


  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      position: '',
      department: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
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
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || tErr('generic'));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/auth/signin`);
      }, 2000);
    } catch {
      setError(tErr('generic'));
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg className="w-16 h-16 mx-auto text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-green-900 mb-2">{t('successTitle')}</h3>
        <p className="text-green-700">{t('successMessage')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* First Name */}
        <FloatingInput id="firstName" label={t('firstName')} required {...register('firstName')} error={errors.firstName ? String(errors.firstName.message) : null} />

        {/* Last Name */}
        <FloatingInput id="lastName" label={t('lastName')} required {...register('lastName')} error={errors.lastName ? String(errors.lastName.message) : null} />
      </div>

      {/* Email */}
      <FloatingInput id="email" type="email" label={t('email')} required {...register('email')} error={errors.email ? String(errors.email.message) : null} />

      {/* Phone Number */}
      <FloatingInput id="phoneNumber" type="tel" label={t('phoneNumber')} {...register('phoneNumber')} error={errors.phoneNumber ? String(errors.phoneNumber.message) : null} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Position */}
        <FloatingInput id="position" label={t('position')} {...register('position')} error={errors.position ? String(errors.position.message) : null} />

        {/* Department */}
        <FloatingInput id="department" label={t('department')} {...register('department')} error={errors.department ? String(errors.department.message) : null} />
      </div>

      {/* Password */}
      <FloatingInput id="password" type="password" label={t('password')} required {...register('password')} error={errors.password ? String(errors.password.message) : null} />

      {/* Confirm Password */}
      <FloatingInput id="confirmPassword" type="password" label={t('confirmPassword')} required {...register('confirmPassword')} error={errors.confirmPassword ? String(errors.confirmPassword.message) : null} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] font-medium py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('creating')}
          </>
        ) : (
          t('createButton')
        )}
      </button>
    </form>
  );
}

