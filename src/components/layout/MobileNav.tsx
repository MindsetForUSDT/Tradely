import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icons';

const navItems = [
  { label: 'Дашборд', href: '/dashboard', icon: 'wallet' as const },
  { label: 'Сделки', href: '/dashboard/trades', icon: 'trades' as const },
  { label: 'Журнал', href: '/dashboard/journal', icon: 'journal' as const },
  { label: 'Кошельки', href: '/dashboard/wallets', icon: 'wallet-add' as const },
  { label: 'Риск', href: '/dashboard/risk', icon: 'risk' as const },
  { label: 'PRO', href: '/pro', icon: 'pro' as const },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-surface-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-[48px] py-1 px-1 rounded-xl transition-all duration-200 relative',
                isActive ? 'text-accent-green' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -top-px w-8 h-0.5 bg-accent-green rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ✅ Исправлено: все эмодзи заменены на Icon, добавлен индикатор активного элемента */
