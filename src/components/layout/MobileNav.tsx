import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Дашборд', href: '/dashboard', icon: '📊' },
  { label: 'Кошельки', href: '/dashboard/wallets', icon: '💳' },
  { label: 'Сделки', href: '/dashboard/trades', icon: '📈' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-surface-border/50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link key={item.href} to={item.href} className={cn('flex flex-col items-center gap-1 min-w-[56px] py-1 px-2 rounded-xl transition-all', isActive ? 'text-accent-green' : 'text-text-muted hover:text-text-secondary')}>
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}