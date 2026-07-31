import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

const publicLinks = [
  { label: 'Продукт', href: '/#workspace' },
  { label: 'Как работает', href: '/#product' },
  { label: 'Тарифы', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
];

export function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className={`mono-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="mono-header-inner">
        <Link className="mono-logo" to={isAuthenticated ? '/dashboard' : '/'}>
          <span className="tailark-brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <strong>TradeumDiary</strong>
        </Link>
        <nav className={open ? 'open' : ''} aria-label="Основная навигация">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">Обзор</Link>
              <Link to="/dashboard/trades">Сделки</Link>
              <Link to="/dashboard/wallets">Источники</Link>
              <Link to="/pro">PRO</Link>
              <button type="button" onClick={() => navigate('/logout')}>
                Выйти
              </button>
            </>
          ) : (
            <>
              {publicLinks.map((item) => (
                <a href={item.href} key={item.href}>
                  {item.label}
                </a>
              ))}
              <Link to="/login">Войти</Link>
              <Link className="mono-header-cta" to="/register">
                <span>Создать дневник</span>
                <i aria-hidden="true">
                  <ArrowRight size={16} />
                </i>
              </Link>
            </>
          )}
        </nav>
        <button
          className="mono-menu"
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
        >
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>
    </header>
  );
}
