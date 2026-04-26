// ============================================================
// TradeumDiary — Форма регистрации
// ============================================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Минимум 3 символа')
    .max(30, 'Максимум 30 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Только латиница, цифры и _'),
  email: z
    .string()
    .min(1, 'Введите email')
    .email('Некорректный email'),
  password: z
    .string()
    .min(1, 'Введите пароль')
    .min(8, 'Минимум 8 символов')
    .regex(/[A-Z]/, 'Хотя бы одна заглавная буква')
    .regex(/[0-9]/, 'Хотя бы одна цифра'),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо принять условия' }),
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          toast.error('Пользователь с таким email уже существует');
        } else if (authError.message.includes('password')) {
          toast.error('Пароль слишком простой. Минимум 8 символов, заглавная буква и цифра.');
        } else {
          toast.error('Ошибка: ' + authError.message);
        }
        return;
      }

      if (authData.user) {
        toast.success('Аккаунт создан!');

        // Небольшая задержка, чтобы триггер создал профиль
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      }
    } catch (err: any) {
      toast.error('Ошибка: ' + (err?.message || 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Имя пользователя */}
      <div>
        <label htmlFor="reg-username" className="block text-xs font-medium text-text-secondary mb-1.5">
          Имя пользователя
        </label>
        <input
          id="reg-username"
          type="text"
          autoComplete="username"
          placeholder="crypto_trader"
          className={`
            w-full px-4 py-2.5 bg-surface-elevated border rounded-xl text-sm
            placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50
            ${errors.username ? 'border-accent-red' : 'border-surface-border'}
          `}
          {...register('username')}
        />
        {errors.username && (
          <p className="text-xs text-accent-red mt-1">{errors.username.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="reg-email" className="block text-xs font-medium text-text-secondary mb-1.5">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="trader@example.com"
          className={`
            w-full px-4 py-2.5 bg-surface-elevated border rounded-xl text-sm
            placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50
            ${errors.email ? 'border-accent-red' : 'border-surface-border'}
          `}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-accent-red mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Пароль */}
      <div>
        <label htmlFor="reg-password" className="block text-xs font-medium text-text-secondary mb-1.5">
          Пароль
        </label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          className={`
            w-full px-4 py-2.5 bg-surface-elevated border rounded-xl text-sm
            placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50
            ${errors.password ? 'border-accent-red' : 'border-surface-border'}
          `}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-accent-red mt-1">{errors.password.message}</p>
        )}
        <p className="text-[10px] text-text-muted mt-1">
          Минимум 8 символов, одна заглавная буква и цифра
        </p>
      </div>

      {/* Согласие */}
      <div className="flex items-start gap-2">
        <input
          id="reg-terms"
          type="checkbox"
          className="mt-0.5 w-4 h-4 rounded border-surface-border bg-surface-elevated text-accent-green focus:ring-accent-green/30"
          {...register('agreeToTerms')}
        />
        <label htmlFor="reg-terms" className="text-xs text-text-muted leading-relaxed">
          Я принимаю{' '}
          <a href="/terms" target="_blank" className="text-accent-green hover:underline">
            условия использования
          </a>{' '}
          и{' '}
          <a href="/privacy" target="_blank" className="text-accent-green hover:underline">
            политику конфиденциальности
          </a>
        </label>
      </div>
      {errors.agreeToTerms && (
        <p className="text-xs text-accent-red">{errors.agreeToTerms.message}</p>
      )}

      {/* Кнопка */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Создать аккаунт
      </Button>

      {/* Переключение на вход */}
      <p className="text-center text-sm text-text-muted">
        Уже есть аккаунт?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-accent-green hover:text-accent-green-dim transition-colors font-medium"
        >
          Войти
        </button>
      </p>
    </form>
  );
}