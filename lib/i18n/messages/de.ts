import type { Messages } from './en';

/**
 * German (Deutsch) message catalog.
 *
 * Typed as `Messages`, so it must define exactly the same keys as en.ts —
 * a missing or renamed key is a compile error, not a runtime surprise.
 * Translations are formal-neutral (Sie-free where possible) and keep the
 * product's proper nouns (NewsPulse AI, Firecrawl, …) untranslated.
 */
export const de: Messages = {
  common: {
    appName: 'NewsPulse AI',
    search: 'Suche',
    history: 'Verlauf',
    dashboard: 'Dashboard',
    language: 'Sprache',
  },
  nav: {
    brandSuffix: 'AI',
  },
  home: {
    badge: 'KI-gestützte Nachrichten-Intelligenz',
    heroSearch: 'Suchen.',
    heroScrape: 'Auslesen.',
    heroSummarize: 'Zusammenfassen.',
    subtitle:
      'NewsPulse AI liest die neuesten Artikel aus dem gesamten Web aus und erstellt prägnante, neutrale Zusammenfassungen — damit Sie in Sekunden informiert sind.',
    inputPlaceholder: 'Versuchen Sie „KI-Regulierung“, „SpaceX“, „Klimagipfel“…',
    searchButton: 'Suchen',
    searching: 'Suche läuft…',
    tryOneOfThese: 'Versuchen Sie eines davon:',
    demoBanner:
      'Demomodus aktiv — die Ergebnisse sind Beispieldaten. Konfigurieren Sie API-Schlüssel für die echte Nachrichtensuche.',
    validationEmpty: 'Bitte geben Sie einen Suchbegriff ein.',
    errorGeneric: 'Etwas ist schiefgelaufen.',
    searchFailed: 'Suche fehlgeschlagen ({status})',
    resultsFor_one: '{count} Ergebnis für „{query}“',
    resultsFor_other: '{count} Ergebnisse für „{query}“',
    summariesBy: 'Zusammenfassungen von {model}',
    noResultsTitle: 'Keine Ergebnisse für „{query}“',
    noResultsDescription:
      'Versuchen Sie einen anderen Suchbegriff oder ein breiteres Thema.',
  },
  card: {
    aiSummary: 'KI-generierte Zusammenfassung',
    read: 'Lesen',
    openInNewTab: 'Artikel in neuem Tab öffnen',
  },
  footer: {
    builtWith: 'Erstellt mit Next.js · Firecrawl · OpenAI · Supabase ·',
    privacy: 'Datenschutzerklärung',
    terms: 'Nutzungsbedingungen',
  },
};
