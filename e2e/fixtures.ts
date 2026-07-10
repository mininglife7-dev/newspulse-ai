/**
 * Shared API fixtures for e2e tests. Shapes mirror types/index.ts —
 * if the API contract changes, update both (the routes are typed against
 * the same interfaces, so tsc catches drift on the server side).
 */

export const ARTICLES = [
  {
    title: 'AI regulation moves forward in the EU',
    url: 'https://example.com/eu-ai-act',
    source: 'example.com',
    date: '2026-07-01T10:00:00.000Z',
    description: 'The EU parliament voted on the AI Act.',
    ai_summary:
      'The EU parliament advanced the AI Act, setting compliance deadlines for general-purpose models and high-risk systems.',
  },
  {
    title: 'Chipmakers respond to new export rules',
    url: 'https://example.org/chips',
    source: 'example.org',
    date: '2026-07-02T08:30:00.000Z',
    description: 'Semiconductor firms adjust plans.',
    ai_summary:
      'Leading chipmakers outlined adjustments to supply chains after new export controls were announced.',
  },
];

export const SEARCH_OK = {
  ok: true,
  keyword: 'ai',
  count: ARTICLES.length,
  saved: true,
  search_id: '11111111-1111-4111-8111-111111111111',
  results: ARTICLES,
};

export const SEARCH_UNSAVED = { ...SEARCH_OK, saved: false, search_id: null };

export const SEARCH_EMPTY = {
  ok: true,
  keyword: 'zzz',
  count: 0,
  saved: false,
  search_id: null,
  results: [],
};

export const HISTORY_ROWS = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    keyword: 'artificial intelligence',
    // result_count deliberately WRONG (99): the UI must derive counts from
    // the results array, never trust this stored column. Regression-tests
    // the single-source-of-truth fix.
    result_count: 99,
    results: ARTICLES,
    created_at: '2026-07-05T12:00:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    keyword: 'quantum computing',
    result_count: 0,
    results: [],
    created_at: '2026-07-04T09:00:00.000Z',
  },
];

export const HISTORY_OK = {
  ok: true,
  count: HISTORY_ROWS.length,
  history: HISTORY_ROWS,
};

export const HISTORY_EMPTY = { ok: true, count: 0, history: [] };

export const HISTORY_ERROR = {
  ok: false,
  error: 'Failed to load search history: connection refused',
};
