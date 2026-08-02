import { Moon, Sun } from '@phosphor-icons/react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const theme = useStore((state) => state.ui.theme);
  const setTheme = useStore((state) => state.setTheme);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={cn('theme-toggle', compact && 'theme-toggle-compact', className)}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Включить ${nextTheme === 'dark' ? 'тёмную' : 'светлую'} тему`}
      title={`Включить ${nextTheme === 'dark' ? 'тёмную' : 'светлую'} тему`}
    >
      <span className="theme-toggle-icons" aria-hidden="true">
        <Moon size={15} weight={theme === 'dark' ? 'fill' : 'regular'} />
        <Sun size={15} weight={theme === 'light' ? 'fill' : 'regular'} />
        <i className={theme === 'light' ? 'is-light' : ''} />
      </span>
      {compact ? null : <span>{theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}</span>}
    </button>
  );
}
