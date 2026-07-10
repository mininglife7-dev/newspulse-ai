# Contributing to NewsPulse AI

Thanks for your interest in NewsPulse AI! This guide covers how to set up a dev environment, file structure conventions, and how to ship a change.

---

## Local development

```bash
git clone https://github.com/<your-username>/newspulse-ai.git
cd newspulse-ai
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000) with hot reload.

---

## Required environment variables

| Variable                        | Required | Where to get it             |
| ------------------------------- | -------- | --------------------------- |
| `FIRECRAWL_API_KEY`             | yes      | https://firecrawl.dev       |
| `OPENAI_API_KEY`                | yes      | https://platform.openai.com |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes      | Supabase → Settings → API   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | Supabase → Settings → API   |
| `SUPABASE_SERVICE_ROLE_KEY`     | yes      | Supabase → Settings → API   |
| `ADMIN_TOKEN`                   | no\*     | Any strong random string    |
| `NEXT_PUBLIC_SITE_URL`          | no       | Used for sitemap/robots     |

\* If `ADMIN_TOKEN` is unset, destructive history actions are disabled
(fail-closed). Set it to enable "Clear History" and per-item delete.

---

## Project conventions

- **TypeScript strict mode** — no `any` unless justified.
- **Server-only secrets** in `lib/openai.ts`, `lib/firecrawl.ts`, server-only Supabase clients. Never import the service-role client from a client component.
- **Tailwind utilities** preferred over custom CSS. Theme tokens live in `tailwind.config.js`.
- **API routes** return `{ ok: boolean, ... }` shape. Errors set `ok: false` and a status code ≥ 400.
- **App Router** — colocate route-specific files (`page.tsx`, `loading.tsx`, `error.tsx`) inside the route folder.

---

## Testing

Unit tests run on [Vitest](https://vitest.dev/):

```bash
npm test           # run the suite once (also runs in CI)
npm run test:watch # watch mode while developing
```

Tests live in `tests/`. Pure logic (`lib/*`) and API-route handlers run in the
Node environment; component tests opt into jsdom with a
`// @vitest-environment jsdom` pragma at the top of the file. Please add or
update tests when you change behaviour.

---

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add /api/health endpoint
fix(history): handle empty results array
docs(readme): clarify Supabase setup
chore: bump openai to 4.67.3
```

---

## Pull request checklist

Before opening a PR:

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] No real secrets in commits or `.env.example`
- [ ] New API routes have request/response examples in the PR description
- [ ] UI changes include a screenshot

---

## Reporting bugs

Open a GitHub issue with:

1. Steps to reproduce
2. What you expected
3. What actually happened
4. Browser / Node version
5. Whether it's reproducible in production or only locally

---

## License

By contributing, you agree your contributions are licensed under the MIT License (see [`LICENSE`](./LICENSE)).
