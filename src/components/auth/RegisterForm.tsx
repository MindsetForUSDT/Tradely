import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!username || !email || !password) {
      toast.error('Заполните все поля');
      return;
    }
    if (password.length < 8) {
      toast.error('Пароль минимум 8 символов');
      return;
    }
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': key },
        body: JSON.stringify({
          email,
          password,
          data: { username },
        }),
      });

      const data = await res.json();

      if (data.access_token && data.user) {
        localStorage.setItem('tradeumdiary-auth', JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          user: data.user,
        }));
        toast.success('Аккаунт создан!');
        window.location.href = '/dashboard';
      } else if (data.msg) {
        toast.error(data.msg);
        setLoading(false);
      } else {
        toast.error('Ошибка регистрации');
        setLoading(false);
      }
    } catch {
      toast.error('Ошибка сети');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input type="text" placeholder="Имя пользователя" value={username} onChange={e => setUsername(e.target.value)}
        className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <input type="password" placeholder="Пароль (мин. 8 символов)" value={password} onChange={e => setPassword(e.target.value)}
        className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
      <button onClick={handleRegister} disabled={loading}
        className="w-full py-3 rounded-xl bg-accent-green text-surface font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] disabled:opacity-50">
        {loading ? 'Регистрация...' : 'Создать аккаунт'}
      </button>
      <p className="text-center text-sm text-text-muted">
        Уже есть аккаунт?{' '}
        <button onClick={onSwitchToLogin} className="text-accent-green font-medium">Войти</button>
      </p>
    </div>
  );
}