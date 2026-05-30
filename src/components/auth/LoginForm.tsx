import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _auth = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (_data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Login logic should be handled by backend auth provider
      // For now, just show error
      setError('Аутентификация через backend не настроена. Используйте Clerk или Supabase.');
    } catch {
      setError('Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">{error}</div>}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
        {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Пароль
        </label>
        <input
          {...register('password')}
          type="password"
          id="password"
          className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/30"
        />
        {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Вход...' : 'Войти'}
      </Button>
    </form>
  );
}
