import { describe, expect, it } from 'vitest';
import { formatDataMoment, getDataQualityPresentation } from './dataQuality';

describe('data quality presentation', () => {
  it('does not present incomplete data as verified', () => {
    expect(getDataQualityPresentation('needs_review')).toMatchObject({
      label: 'Требует проверки',
      tone: 'warning',
    });
  });

  it('keeps empty import separate from a failed import', () => {
    expect(getDataQualityPresentation('empty').tone).toBe('empty');
    expect(getDataQualityPresentation('failed').tone).toBe('failed');
  });

  it('falls back safely for invalid timestamps', () => {
    expect(formatDataMoment('not-a-date')).toBe('Нет данных');
    expect(formatDataMoment(null)).toBe('Нет данных');
  });
});
