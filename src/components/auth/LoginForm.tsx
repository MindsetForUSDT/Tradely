// ============================================================
// TradeumDiary — Форма входа
// Валидация Zod, обработка ошибок Supabase, тактильная кнопка
// ============================================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Схема валидации
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Введите email')
    .email('Некорректный email'),
  password: z
    .string()
    .min(1, 'Введите пароль')
    .min(8, 'Пароль должен быть не менее 8 символов'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Обработка специфичных ошибок Supabase
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Неверный email или пароль');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Подтвердите email. Проверьте почту.');
        } else {
          toast.error('Ошибка входа. Попробуйте позже.');
        }
        return;
      }

      toast.success('Успешный вход!');
      navigate('/dashboard');
    } catch {
      toast.error('Неизвестная ошибка. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-xs font-medium text-text-secondary mb-1.5">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="trader@example.com"
          className={`
            w-full px-4 py-2.5 bg-surface-elevated border rounded-xl text-sm
            placeholder:text-text-muted
            transition-colors duration-200
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
        <label htmlFor="login-password" className="block text-xs font-medium text-text-secondary mb-1.5">
          Пароль
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={`
            w-full px-4 py-2.5 bg-surface-elevated border rounded-xl text-sm
            placeholder:text-text-muted
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50
            ${errors.password ? 'border-accent-red' : 'border-surface-border'}
          `}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-accent-red mt-1">{errors.password.message}</p>
        )}
      </div>

      {/* Забыли пароль */}
      <div className="text-right">
        <button
          type="button"
          onClick={onSwitchToReset}
          className="text-xs text-text-muted hover:text-accent-green transition-colors"
        >
          Забыли пароль?
        </button>
      </div>

      {/* Кнопка входа */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Войти
      </Button>

      {/* Переключение на регистрацию */}
      <p className="text-center text-sm text-text-muted">
        Нет аккаунта?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-accent-green hover:text-accent-green-dim transition-colors font-medium"
        >
          Зарегистрироваться
        </button>
      </p>
    </form>
  );
}