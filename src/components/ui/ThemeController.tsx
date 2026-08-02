import { useEffect, type ReactNode } from 'react';
import { applyTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

export function ThemeController({ children }: { children: ReactNode }) {
  const theme = useStore((state) => state.ui.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return children;
}
