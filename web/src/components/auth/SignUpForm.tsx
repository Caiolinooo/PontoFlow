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
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">{t('successTitle')}</h3>
        <p className="text-green-700 dark:text-green-300">{t('successMessage')}</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatingInput id="firstName" label={t('firstName')} required {...register('firstName')} error={errors.firstName ? String(errors.firstName.message) : null} />
          <FloatingInput id="lastName" label={t('lastName')} required {...register('lastName')} error={errors.lastName ? String(errors.lastName.message) : null} />
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Contact Information</h3>
        <FloatingInput id="email" type="email" label={t('email')} required {...register('email')} error={errors.email ? String(errors.email.message) : null} />
        <FloatingInput id="phoneNumber" type="tel" label={t('phoneNumber')} {...register('phoneNumber')} error={errors.phoneNumber ? String(errors.phoneNumber.message) : null} />
      </div>

      {/* Professional Information (Optional) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Professional Information <span className="text-xs font-normal text-gray-500">(Optional)</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatingInput id="position" label={t('position')} {...register('position')} error={errors.position ? String(errors.position.message) : null} />
          <FloatingInput id="department" label={t('department')} {...register('department')} error={errors.department ? String(errors.department.message) : null} />
        </div>
      </div>

      {/* Security */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Security</h3>
        <FloatingInput id="password" type="password" label={t('password')} required {...register('password')} error={errors.password ? String(errors.password.message) : null} />
        <FloatingInput id="confirmPassword" type="password" label={t('confirmPassword')} required {...register('confirmPassword')} error={errors.confirmPassword ? String(errors.confirmPassword.message) : null} />

        {/* Password Requirements */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-800 dark:text-blue-200 font-medium mb-2">Password must contain:</p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              At least 8 characters
            </li>
            <li className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              One uppercase letter (A-Z)
            </li>
            <li className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              One lowercase letter (a-z)
            </li>
            <li className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              One number (0-9)
            </li>
            <li className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              One special character (!@#$%^&*)
            </li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 animate-in fade-in duration-300">
          <p className="text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            {t('creating')}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {t('createButton')}
          </>
        )}
      </button>
    </form>
  );
}

