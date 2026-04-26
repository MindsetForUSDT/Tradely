// ============================================================
// TradeumDiary — Форма восстановления пароля
// Отправляет ссылку для сброса через Supabase Auth
// ============================================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

const resetSchema = z.object({
  email: z
    .string()
    .min(1, 'Введите email')
    .email('Некорректный email'),
});

type ResetFormData = z.infer<typeof resetSchema>;

interface PasswordResetProps {
  onSwitchToLogin: () => void;
}

export function PasswordReset({ onSwitchToLogin }: PasswordResetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?reset=true`,
      });

      if (error) {
        toast.error('Ошибка отправки. Проверьте email.');
        return;
      }

      setIsSent(true);
      toast.success('Ссылка для сброса отправлена на email');
    } catch {
      toast.error('Неизвестная ошибка. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Проверьте почту</h3>
        <p className="text-sm text-text-muted">
          Мы отправили ссылку для сброса пароля. Если письмо не пришло в течение 5 минут, проверьте папку «Спам».
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSwitchToLogin}
        >
          Вернуться ко входу
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="reset-email" className="block text-xs font-medium text-text-secondary mb-1.5">
          Email
        </label>
        <input
          id="reset-email"
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

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Отправить ссылку
      </Button>

      <p className="text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm text-text-muted hover:text-accent-green transition-colors"
        >
          ← Вернуться ко входу
        </button>
      </p>
    </form>
  );
}