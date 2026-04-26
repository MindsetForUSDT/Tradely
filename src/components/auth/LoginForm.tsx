import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
}

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
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          toast.error('Неверный email или пароль');
        } else {
          toast.error('Ошибка: ' + authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        toast.success('Вход выполнен!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error('Ошибка: ' + (err?.message || 'Неизвестная ошибка'));
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          placeholder="trader@example.com"
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50"
          {...register('email', { required: 'Введите email' })}
        />
        {errors.email && (
          <p className="text-xs text-accent-red mt-1">{errors.email.message as string}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Пароль
        </label>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50"
          {...register('password', { required: 'Введите пароль' })}
        />
        {errors.password && (
          <p className="text-xs text-accent-red mt-1">{errors.password.message as string}</p>
        )}
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={onSwitchToReset}
          className="text-xs text-text-muted hover:text-accent-green transition-colors"
        >
          Забыли пароль?
        </button>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Войти
      </Button>

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