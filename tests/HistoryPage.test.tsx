// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import HistoryPage from '@/app/history/page';

const rows = [
  {
    id: 'id-a',
    keyword: 'Tesla',
    results: [],
    result_count: 3,
    created_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 'id-b',
    keyword: 'NASA',
    results: [],
    result_count: 5,
    created_at: '2025-06-02T10:00:00Z',
  },
];

let fetchMock: any;

function okJson(body: any, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('confirm', vi.fn(() => true));
  vi.stubGlobal('prompt', vi.fn(() => 'secret'));
  fetchMock = vi.fn(async (_url: string, opts?: any) => {
    const method = opts?.method ?? 'GET';
    if (method === 'GET') return okJson({ ok: true, history: rows, count: 2 });
    return okJson({ ok: true, deleted: 1 }); // DELETE
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('HistoryPage', () => {
  it('loads and renders saved searches', async () => {
    render(<HistoryPage />);
    expect(await screen.findByText('Tesla')).toBeTruthy();
    expect(screen.getByText('NASA')).toBeTruthy();
  });

  it('deletes a single row via the admin-gated :id endpoint', async () => {
    render(<HistoryPage />);
    await screen.findByText('Tesla');

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete saved search: Tesla' })
    );

    await waitFor(() => expect(screen.queryByText('Tesla')).toBeNull());
    expect(screen.getByText('NASA')).toBeTruthy(); // other rows preserved

    const del = fetchMock.mock.calls.find(
      (c: any[]) => c[1]?.method === 'DELETE'
    );
    expect(del[0]).toContain('/api/history/id-a');
    expect(del[1].headers['x-admin-token']).toBe('secret');
  });

  it('clears all history', async () => {
    render(<HistoryPage />);
    await screen.findByText('Tesla');

    fireEvent.click(screen.getByRole('button', { name: /Clear History/i }));

    await waitFor(() => expect(screen.queryByText('Tesla')).toBeNull());
    expect(screen.queryByText('NASA')).toBeNull();

    const del = fetchMock.mock.calls.find(
      (c: any[]) => c[1]?.method === 'DELETE'
    );
    expect(del[0]).toBe('/api/history');
  });

  it('surfaces a disabled-deployment (503) error in the alert region', async () => {
    fetchMock.mockImplementation(async (_url: string, opts?: any) => {
      const method = opts?.method ?? 'GET';
      if (method === 'GET') return okJson({ ok: true, history: rows });
      return okJson(
        { ok: false, error: 'Admin actions are disabled on this deployment.' },
        503
      );
    });

    render(<HistoryPage />);
    await screen.findByText('Tesla');
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete saved search: Tesla' })
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/disabled/i);
    expect(screen.getByText('Tesla')).toBeTruthy(); // row NOT removed on failure
  });
});
