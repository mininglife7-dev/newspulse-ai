import { describe, it, expect } from 'vitest';
import { en } from '@/lib/i18n/messages/en';
import { de } from '@/lib/i18n/messages/de';
import {
  translate,
  translatePlural,
  detectLocale,
  LOCALES,
} from '@/lib/i18n';

/** Recursively collect every dotted leaf key from a nested catalog. */
function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? [path]
      : leafKeys(value as Record<string, unknown>, path);
  });
}

describe('i18n catalogs', () => {
  it('German defines exactly the same keys as English (no gaps, no extras)', () => {
    const enKeys = leafKeys(en).sort();
    const deKeys = leafKeys(de).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it('has no empty translations in any locale', () => {
    for (const catalog of [en, de]) {
      const values = leafKeys(catalog).map((k) =>
        k.split('.').reduce<any>((o, part) => o[part], catalog)
      );
      expect(values.every((v) => typeof v === 'string' && v.trim().length > 0)).toBe(
        true
      );
    }
  });

  it('preserves {named} placeholders across both locales', () => {
    // If English interpolates a token, German must expose the same token,
    // or the rendered string would leak a literal {placeholder}.
    const withParams = ['home.resultsFor_other', 'home.summariesBy'] as const;
    for (const key of withParams) {
      const enTokens = (translate('en', key) as string).match(/\{(\w+)\}/g);
      const deTokens = (translate('de', key) as string).match(/\{(\w+)\}/g);
      expect(new Set(deTokens)).toEqual(new Set(enTokens));
    }
  });
});

describe('translate', () => {
  it('interpolates named params', () => {
    expect(translate('en', 'home.summariesBy', { model: 'gpt-4o-mini' })).toBe(
      'Summaries by gpt-4o-mini'
    );
    expect(translate('de', 'home.summariesBy', { model: 'gpt-4o-mini' })).toBe(
      'Zusammenfassungen von gpt-4o-mini'
    );
  });

  it('leaves unknown placeholders untouched rather than blanking them', () => {
    expect(translate('en', 'home.searchFailed', {})).toContain('{status}');
  });
});

describe('translatePlural', () => {
  it('selects singular for 1 and plural otherwise', () => {
    expect(translatePlural('en', 'home.resultsFor', 1, { query: 'AI' })).toBe(
      '1 result for "AI"'
    );
    expect(translatePlural('en', 'home.resultsFor', 3, { query: 'AI' })).toBe(
      '3 results for "AI"'
    );
    expect(translatePlural('de', 'home.resultsFor', 1, { query: 'KI' })).toBe(
      '1 Ergebnis für „KI“'
    );
    expect(translatePlural('de', 'home.resultsFor', 5, { query: 'KI' })).toBe(
      '5 Ergebnisse für „KI“'
    );
  });
});

describe('detectLocale', () => {
  it('maps German browser languages to de', () => {
    expect(detectLocale('de')).toBe('de');
    expect(detectLocale('de-DE')).toBe('de');
    expect(detectLocale('de-AT,de;q=0.9')).toBe('de');
  });

  it('falls back to en for unsupported or missing hints', () => {
    expect(detectLocale('fr-FR')).toBe('en');
    expect(detectLocale('')).toBe('en');
    expect(detectLocale(null)).toBe('en');
    expect(detectLocale(undefined)).toBe('en');
  });

  it('only supports the advertised locales', () => {
    expect(LOCALES).toEqual(['en', 'de']);
  });
});
