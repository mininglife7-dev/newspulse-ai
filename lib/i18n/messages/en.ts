/**
 * English message catalog — the source of truth for i18n.
 *
 * The German catalog (de.ts) is typed as `typeof en`, so the compiler rejects
 * any missing or misspelled key. Values may contain {named} placeholders that
 * translate()'s params argument fills in.
 */
export const en = {
  common: {
    appName: 'NewsPulse AI',
    search: 'Search',
    history: 'History',
    dashboard: 'Dashboard',
    language: 'Language',
  },
  nav: {
    brandSuffix: 'AI',
  },
  home: {
    badge: 'AI-Powered News Intelligence',
    // The hero headline is three staccato verbs; the last is highlighted.
    heroSearch: 'Search.',
    heroScrape: 'Scrape.',
    heroSummarize: 'Summarize.',
    subtitle:
      'NewsPulse AI scrapes the latest articles from across the web and generates concise, neutral summaries — so you can stay informed in seconds.',
    inputPlaceholder: 'Try "AI regulation", "SpaceX", "climate summit"…',
    searchButton: 'Search',
    searching: 'Searching…',
    tryOneOfThese: 'Try one of these:',
    demoBanner:
      'Running in demo mode — results are sample data. Configure API keys for real news search.',
    validationEmpty: 'Please enter a keyword to search.',
    errorGeneric: 'Something went wrong.',
    searchFailed: 'Search failed ({status})',
    resultsFor_one: '{count} result for "{query}"',
    resultsFor_other: '{count} results for "{query}"',
    summariesBy: 'Summaries by {model}',
    noResultsTitle: 'No results for "{query}"',
    noResultsDescription: 'Try a different keyword or a broader topic.',
  },
  card: {
    aiSummary: 'AI-generated summary',
    read: 'Read',
    openInNewTab: 'Open article in new tab',
  },
  footer: {
    builtWith: 'Built with Next.js · Firecrawl · OpenAI · Supabase ·',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
} as const;

/**
 * Widen the `as const` literal types (which pin exact English strings) to
 * plain `string`, while preserving the exact key structure. This lets the
 * German catalog supply different values yet still be checked for the same
 * shape — a missing or misspelled key stays a compile error.
 */
type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : Widen<T[K]>;
};

export type Messages = Widen<typeof en>;
