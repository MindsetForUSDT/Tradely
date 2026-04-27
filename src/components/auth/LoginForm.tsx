import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email) { toast.error('Введите email'); return; }
    if (!password) { toast.error('Введите пароль'); return; }

    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': key },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('ОТВЕТ:', JSON.stringify(data, null, 2));

      const token = data.access_token || data.accessToken;

      if (token) {
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: data.refresh_token || data.refreshToken || '',
        });
        toast.success('Вход выполнен!');
        navigate('/dashboard');
      } else if (data.user?.id) {
        // Может быть другой формат ответа
        toast.success('Вход выполнен!');
        navigate('/dashboard');
      } else {
        toast.error(data.error_description || data.msg || 'Ошибка входа');
        setLoading(false);
      }
    } catch (e) {
      toast.error('Ошибка сети');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)}
        className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <button onClick={handleLogin} disabled={loading}
        className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50">
        {loading ? 'Загрузка...' : 'Войти'}
      </button>
      <p className="text-center text-sm text-text-muted">
        Нет аккаунта?{' '}
        <button onClick={onSwitchToRegister} className="text-accent-green font-medium">Регистрация</button>
      </p>
    </div>
  );
}