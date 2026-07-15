#!/usr/bin/env node
/**
 * Mock server for the E2E smoke suite.
 *
 * The app is pointed at this server via NEXT_PUBLIC_SUPABASE_URL (see
 * playwright.config.ts). It deliberately implements nothing but a liveness
 * probe: every other request — including Supabase auth — returns 404, so
 * `supabase.auth.getUser()` resolves to "no session". That is exactly what the
 * signed-out smoke suite exercises (public pages render; protected routes and
 * APIs redirect/401). No external services are contacted and no secrets are
 * needed.
 *
 * (The former Firecrawl/OpenAI/news_searches mocks were removed when the app
 * pivoted away from news search — nothing consumed them anymore.)
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 4545);

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
  });
  res.end(data);
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // Liveness probe for playwright's webServer readiness check.
  if (pathname === '/health') return send(res, 200, { ok: true });

  // Everything else (Supabase auth/REST, etc.) → 404 → no session.
  send(res, 404, { error: `mock: no route for ${req.method} ${pathname}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-services] listening on http://127.0.0.1:${PORT}`);
});
