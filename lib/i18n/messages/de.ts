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
  history: {
    title: 'Suchverlauf',
    subtitle:
      'Jede Suche, die Sie mit NewsPulse AI durchgeführt haben, gespeichert in Supabase.',
    refresh: 'Aktualisieren',
    refreshTitle: 'Suchverlauf aktualisieren',
    clear: 'Verlauf löschen',
    emptyTitle: 'Noch keine Suchen',
    emptyDescription:
      'Führen Sie Ihre erste Suche durch, dann erscheint sie hier.',
    emptyCta: 'Suche starten',
    colKeyword: 'Suchbegriff',
    colDate: 'Suchdatum',
    colArticles: 'Gefundene Artikel',
    colActions: 'Aktionen',
    expand: 'Ausklappen',
    collapse: 'Einklappen',
    viewResults: 'Ergebnisse anzeigen',
    hide: 'Ausblenden',
    rerun: 'Erneut suchen',
    rerunTitle: 'Diese Suche erneut ausführen',
    openSavedSearch: 'Diese gespeicherte Suche öffnen',
    delete: 'Löschen',
    deleteTitle: 'Diese gespeicherte Suche löschen',
    deleteAria: 'Gespeicherte Suche „{keyword}“ löschen',
    noSavedResults: 'Keine gespeicherten Ergebnisse für diese Suche.',
    confirmClearAll:
      'Alle {count} gespeicherten Suchen löschen? Dies kann nicht rückgängig gemacht werden.',
    confirmDeleteOne: 'Gespeicherte Suche „{keyword}“ löschen?',
    adminTokenPrompt:
      'Das Löschen ist in dieser Umgebung geschützt. Geben Sie den Admin-Token ein:',
    failedLoad: 'Verlauf konnte nicht geladen werden.',
    failedClear: 'Verlauf konnte nicht gelöscht werden.',
    failedDelete: 'Suche konnte nicht gelöscht werden.',
    failed: 'Fehlgeschlagen ({status})',
    deleteFailed: 'Löschen fehlgeschlagen ({status})',
  },
  detail: {
    allSearches: 'Alle Suchen',
    savedSearch: 'Gespeicherte Suche',
    runOn: 'Ausgeführt am',
    articlesCaptured_one:
      '{count} Artikel zum Suchzeitpunkt erfasst. Zusammenfassungen erstellt von {model}.',
    articlesCaptured_other:
      '{count} Artikel zum Suchzeitpunkt erfasst. Zusammenfassungen erstellt von {model}.',
    noResultsSaved: 'Für diese Suche wurden keine Ergebnisse gespeichert.',
    rerun: 'Diese Suche erneut ausführen',
  },
  notFound: {
    title: 'Seite nicht gefunden',
    body: 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
    startSearch: 'Neue Suche starten',
    viewHistory: 'Verlauf anzeigen',
  },
  error: {
    title: 'Etwas ist schiefgelaufen',
    body: 'Beim Laden dieser Seite ist ein unerwarteter Fehler aufgetreten.',
    errorId: 'Fehler-ID:',
    tryAgain: 'Erneut versuchen',
    backHome: 'Zurück zur Startseite',
  },
};
