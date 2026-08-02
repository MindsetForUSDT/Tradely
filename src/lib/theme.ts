export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'tradeumdiary-store';

export function readStoredTheme(storage: Pick<Storage, 'getItem'>): Theme {
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    if (!raw) return 'dark';
    const parsed = JSON.parse(raw) as { state?: { ui?: { theme?: unknown } } };
    return parsed.state?.ui?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[data-tradeum-theme-color]');
  themeColor?.setAttribute('content', theme === 'dark' ? '#090a0c' : '#ffffff');
}
