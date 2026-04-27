import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email) { toast.error('Введите email'); return; }
    if (!password) { toast.error('Введите пароль'); return; }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      toast.success('Вход выполнен!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
        <input type="email" autoComplete="email" placeholder="trader@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Пароль</label>
        <input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      </div>

      <div className="text-right">
        <button type="button" onClick={onSwitchToReset} className="text-xs text-text-muted hover:text-accent-green transition-colors">Забыли пароль?</button>
      </div>

      <button type="button" onClick={handleLogin} disabled={isLoading} className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50">
        {isLoading ? 'Загрузка...' : 'Войти'}
      </button>

      <p className="text-center text-sm text-text-muted">
        Нет аккаунта?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-accent-green hover:text-accent-green-dim transition-colors font-medium">Зарегистрироваться</button>
      </p>
    </div>
  );
}