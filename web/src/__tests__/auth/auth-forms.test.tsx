import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';

vi.mock('@/lib/supabase/client', () => {
  return {
    supabase: {
      auth: {
        signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
        signUp: vi.fn(async () => ({ data: {}, error: null })),
      },
    },
  };
});

describe('Auth Forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates email and password on SignInForm', async () => {
    render(<SignInForm redirectTo="/pt-BR/dashboard" />);

    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findAllByText(/Mínimo de 6 caracteres|E-mail inválido/i)).toBeTruthy();
  });

  it('submits SignInForm successfully', async () => {
    const { container } = render(<SignInForm redirectTo="/pt-BR/dashboard" />);
    const email = container.querySelector('input[name="email"]') as HTMLInputElement;
    const password = container.querySelector('input[name="password"]') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'a@b.com' } });
    fireEvent.change(password, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button'));

    // no error shown
    expect(await screen.queryByText(/erro/i)).toBeNull();
  });

  it('validates email and password on SignUpForm', async () => {
    render(<SignUpForm />);

    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findAllByText(/Mínimo de 6 caracteres|E-mail inválido/i)).toBeTruthy();
  });
});

