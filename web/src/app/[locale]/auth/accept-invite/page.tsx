"use client";

import React, { useState, useEffect, use } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const schema = z.object({
  password: z.string()
    .min(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
    .regex(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula' })
    .regex(/[a-z]/, { message: 'A senha deve conter pelo menos uma letra minúscula' })
    .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número' })
    .regex(/[^A-Za-z0-9]/, { message: 'A senha deve conter pelo menos um caractere especial' }),
  confirmPassword: z.string(),
  phone_number: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function AcceptInvitePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const locale = resolvedParams.locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      phone_number: '',
      position: '',
      department: '',
    },
  });

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError('Token de convite não fornecido');
      setValidating(false);
    }
  }, [token]);

  const validateToken = async () => {
    setValidating(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/accept-invite?token=${token}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Convite inválido ou expirado');
        setValidating(false);
        return;
      }

      setInvitation(data.invitation);
      
      // Pre-fill form with invitation data
      if (data.invitation.phone_number) {
        setValue('phone_number', data.invitation.phone_number);
      }
      if (data.invitation.position) {
        setValue('position', data.invitation.position);
      }
      if (data.invitation.department) {
        setValue('department', data.invitation.department);
      }

      setValidating(false);
    } catch (err) {
      setError('Erro ao validar convite');
      setValidating(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: values.password,
          phone_number: values.phone_number,
          position: values.position,
          department: values.department,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Erro ao aceitar convite');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/auth/signin?email=${invitation.email}`);
      }, 2000);
    } catch (err) {
      setError('Erro ao aceitar convite');
      setLoading(false);
    }
  };

  const roleNames: Record<string, string> = {
    USER: 'Usuário',
    MANAGER_TIMESHEET: 'Gerente de Timesheet',
    MANAGER: 'Gerente',
    ADMIN: 'Administrador',
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Validando convite...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Convite Inválido</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <Link
              href={`/${locale}/auth/signin`}
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ir para Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🎉 Bem-vindo ao PontoFlow!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Complete seu cadastro para começar
          </p>
        </div>

        {/* Invitation Info */}
        {invitation && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Nome:</strong> {invitation.first_name} {invitation.last_name}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Email:</strong> {invitation.email}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Função:</strong> {roleNames[invitation.role] || invitation.role}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-200 font-medium text-center">
              ✅ Cadastro concluído com sucesso! Redirecionando para o login...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && invitation && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              {...register('password')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3"
              placeholder="Digite sua senha"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Confirmar Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              {...register('confirmPassword')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3"
              placeholder="Confirme sua senha"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Telefone
              </label>
              <input
                type="tel"
                {...register('phone_number')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3"
                placeholder="+55 11 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Cargo
              </label>
              <input
                type="text"
                {...register('position')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3"
                placeholder="Seu cargo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Departamento
            </label>
            <input
              type="text"
              {...register('department')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3"
              placeholder="Seu departamento"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : success ? 'Conta criada!' : '✨ Completar Cadastro'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Já tem uma conta?{' '}
          <Link href={`/${locale}/auth/signin`} className="text-purple-600 dark:text-purple-400 hover:underline">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}

