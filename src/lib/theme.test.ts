import { describe, expect, it } from 'vitest';
import { readStoredTheme, THEME_STORAGE_KEY } from './theme';

function storageWith(value: string | null) {
  return {
    getItem(key: string) {
      return key === THEME_STORAGE_KEY ? value : null;
    },
  };
}

describe('readStoredTheme', () => {
  it('restores a persisted light theme', () => {
    expect(readStoredTheme(storageWith('{"state":{"ui":{"theme":"light"}}}'))).toBe('light');
  });

  it('keeps dark as the safe default', () => {
    expect(readStoredTheme(storageWith(null))).toBe('dark');
    expect(readStoredTheme(storageWith('broken json'))).toBe('dark');
    expect(readStoredTheme(storageWith('{"state":{"ui":{"theme":"unknown"}}}'))).toBe('dark');
  });
});
