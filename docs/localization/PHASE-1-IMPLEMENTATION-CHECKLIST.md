# Phase 1: i18n Implementation Checklist

**Phase:** 1 of 5 (German Launch Mission)  
**Duration:** 2-3 days (8-16 hours engineering)  
**Status:** Ready to execute (awaiting Founder approval)  
**Prerequisite:** None (can begin immediately upon approval)

---

## Pre-Implementation

- [ ] Founder approves Phase 1 start
- [ ] Create feature branch: `feature/phase-1-i18n` from main
- [ ] Review `docs/localization/PHASE-1-I18N-SPEC.md` (technical specification)

---

## Day 1: Installation & Routing (4-6 hours)

### Task 1.1: Install & Configure next-intl (30 min)

- [ ] `npm install next-intl`
- [ ] Create `next-intl.config.ts`:
  ```typescript
  import { getRequestConfig } from 'next-intl/server';
  
  export default getRequestConfig(async ({ locale }) => ({
    messages: (await import(`./messages/${locale}.json`)).default,
  }));
  ```
- [ ] Update `next.config.js`:
  ```javascript
  const withNextIntl = require('next-intl/build');
  
  module.exports = withNextIntl({
    i18n: {
      locales: ['en', 'de'],
      defaultLocale: 'en',
    },
  });
  ```
- [ ] `npm run type-check` — should pass without errors

**Verify:** No TypeScript errors, build completes

### Task 1.2: Create Middleware (1 hour)

- [ ] Create `middleware.ts` in root:
  ```typescript
  import { NextRequest } from 'next/server';
  import createMiddleware from 'next-intl/middleware';
  
  export default createMiddleware({
    locales: ['en', 'de'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
  });
  
  export const config = {
    matcher: [
      '/((?!api|_next|_static|favicon|robots|sitemap).*)',
    ],
  };
  ```
- [ ] Test: `npm run dev` and visit http://localhost:3000/en and http://localhost:3000/de
- [ ] Both should render (using English strings initially)

**Verify:** Both `/en` and `/de` routes accessible

### Task 1.3: Reorganize Routes (1.5-2 hours)

Current structure:
```
app/
  page.tsx
  layout.tsx
  auth/...
  dashboard/...
```

Target structure:
```
app/
  layout.tsx (moved to root, uses next-intl provider)
  [locale]/
    layout.tsx (specific to locale)
    page.tsx
    auth/...
    dashboard/...
```

**Steps:**
- [ ] Create `app/[locale]` directory
- [ ] Move pages into `app/[locale]/`:
  - `app/[locale]/page.tsx` (landing)
  - `app/[locale]/layout.tsx` (locale provider)
  - `app/[locale]/auth/` (signin, signup, verify-email)
  - `app/[locale]/dashboard/`
  - `app/[locale]/workspace/`
  - `app/[locale]/inventory/`
  - `app/[locale]/risk-assessments/`
  - `app/[locale]/terms/`
  - `app/[locale]/privacy/`

- [ ] Update root `app/layout.tsx` to wrap locale layout
- [ ] Test: Both `/en/` and `/de/` routes work
- [ ] Test: Locale switching via language picker (placeholder for now)

**Verify:** All routes accessible in both locales, no 404 errors

### Task 1.4: Create Message Files (1 hour)

- [ ] Create `messages/` directory in root
- [ ] Create `messages/en.json` with all 99 strings (from audit)
- [ ] Create `messages/de.json` skeleton with same keys (English values as placeholder)

**Structure example:**
```json
{
  "landing": {
    "hero": {
      "title": "AI Governance",
      "subtitle": "Made Simple"
    }
  },
  "auth": {
    "signup": {
      "heading": "Create your account",
      "email": "Email"
    }
  }
}
```

- [ ] `npm run type-check` — TypeScript should recognize message keys
- [ ] No build errors

**Verify:** Both message files exist, TypeScript accepts message keys

---

## Day 2: Component Refactoring (4-6 hours)

### Task 2.1: Update Root Layout (1 hour)

- [ ] Update `app/[locale]/layout.tsx`:
  ```typescript
  import { NextIntlClientProvider } from 'next-intl';
  import { getMessages } from 'next-intl/server';
  
  export default async function RootLayout({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    const messages = await getMessages();
    
    return (
      <html lang={locale}>
        <body>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    );
  }
  ```

- [ ] Test: No errors on page load

**Verify:** App renders with locale provider

### Task 2.2: Refactor Pages to Use useTranslations (3-5 hours)

**Pattern:**
```typescript
'use client';

import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('landing.hero');
  return (
    <h1>{t('title')}</h1>
    <p>{t('subtitle')}</p>
  );
}
```

**Pages to update:**
- [ ] `app/[locale]/page.tsx` (landing)
- [ ] `app/[locale]/auth/signup/page.tsx`
- [ ] `app/[locale]/auth/signin/page.tsx`
- [ ] `app/[locale]/auth/verify-email/page.tsx`
- [ ] `app/[locale]/dashboard/page.tsx`
- [ ] `app/[locale]/workspace/setup/page.tsx`
- [ ] `app/[locale]/inventory/page.tsx`
- [ ] `app/[locale]/risk-assessments/page.tsx`
- [ ] `app/[locale]/terms/page.tsx`
- [ ] `app/[locale]/privacy/page.tsx`
- [ ] `components/language-switcher.tsx` (new component)

**After each page:** Test that strings render correctly

**Verify:** All pages render with English strings, no missing keys

### Task 2.3: Create Language Switcher Component (1 hour)

- [ ] Create `components/language-switcher.tsx`:
  ```typescript
  'use client';
  
  import { useLocale } from 'next-intl';
  import { useRouter } from 'next-intl/client';
  
  export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    
    return (
      <select
        value={locale}
        onChange={(e) => {
          router.push(`/${e.target.value}`);
        }}
        className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    );
  }
  ```

- [ ] Add to layout header or navbar
- [ ] Test: Switcher visible and functional
- [ ] Click switcher: Route changes to `/de`, UI updates (still shows English text, that's expected)

**Verify:** Language switcher works, route changes correctly

---

## Day 3: Testing & Build (2-4 hours)

### Task 3.1: Verify TypeScript & Linting (30 min)

- [ ] `npm run type-check` — All TypeScript checks pass
- [ ] `npm run lint` — No ESLint errors
- [ ] Fix any errors found

**Verify:** Zero TS errors, zero lint errors

### Task 3.2: Run Test Suite (1 hour)

- [ ] `npm test` — All 177 tests still pass
- [ ] `npm run test:e2e` — E2E tests pass for both `/en` and `/de` routes
- [ ] If tests fail: Debug and fix

**Verify:** All tests passing

### Task 3.3: Production Build (30 min)

- [ ] `npm run build` — Build completes without errors
- [ ] Check `.next/server` for both locale directories
- [ ] Verify build size is acceptable

**Verify:** Build successful, both locales included

### Task 3.4: Verification Checklist (1 hour)

Run through manual verification:

- [ ] `/en/` routes accessible
  - [ ] `/en/` → landing page
  - [ ] `/en/auth/signup` → signup form
  - [ ] `/en/dashboard` → dashboard (if signed in, redirects to signin)
  
- [ ] `/de/` routes accessible
  - [ ] `/de/` → landing page
  - [ ] `/de/auth/signup` → signup form
  - [ ] `/de/dashboard` → dashboard
  
- [ ] Language switcher functional
  - [ ] Click "Deutsch" → route changes to `/de/`
  - [ ] Click "English" → route changes to `/en/`
  
- [ ] All text renders correctly
  - [ ] No `[key]` placeholders
  - [ ] No missing strings
  - [ ] No text overflow
  
- [ ] Mobile responsive
  - [ ] Test `/en/` at 375px width
  - [ ] Test `/de/` at 375px width
  - [ ] Language switcher works on mobile
  
- [ ] No console errors
  - [ ] Open DevTools → Console
  - [ ] Navigate to `/en/` and `/de/`
  - [ ] No red errors

**Verify:** All checks pass ✅

---

## After Implementation

### Commit & Push

- [ ] `git add -A`
- [ ] `git commit -m "feat: Implement Phase 1 i18n infrastructure

- next-intl library integration with locale routing
- Middleware for locale detection and redirection
- Message files for English and German (DE skeleton)
- Language switcher component
- All pages refactored to use useTranslations()
- Production build includes both locales
- All 177 tests passing
- TypeScript strict mode clean
- ESLint 0 errors

Ready for Phase 2: Professional translation"`

- [ ] `git push -u origin feature/phase-1-i18n`

### Create Pull Request

- [ ] Create PR from `feature/phase-1-i18n` to `main`
- [ ] Title: "Phase 1: i18n Infrastructure Setup"
- [ ] Description: Summarize changes and testing done
- [ ] Request review

### Merge & Deploy

- [ ] Wait for CI checks to pass
- [ ] Merge to main
- [ ] Verify production deployment

### Next Phase Preparation

- [ ] Export `messages/en.json` for translator
- [ ] Document string context (where each string appears in UI)
- [ ] Create Phase 2 delivery specification

---

## Rollback Plan (If Needed)

If something breaks:

1. Revert commit: `git revert [commit-hash]`
2. Push: `git push`
3. Vercel auto-redeploys
4. No data loss (config-only changes)
5. Back to previous version in ~2 minutes

---

## Success Criteria

Phase 1 is complete when:

✅ All 99 strings in `messages/en.json` and `messages/de.json`  
✅ Both `/en/` and `/de/` routes functional  
✅ Language switcher works  
✅ All pages use `useTranslations()`  
✅ All 177 tests passing  
✅ TypeScript strict mode clean  
✅ ESLint 0 errors  
✅ Production build successful  
✅ No regressions in English version  
✅ Strings ready to export for translator  

---

## Time Tracking

| Task | Estimate | Actual |
|------|----------|--------|
| Day 1: Installation & Routing | 4-6h | — |
| Day 2: Refactoring | 4-6h | — |
| Day 3: Testing & Build | 2-4h | — |
| **Total** | **10-16h** | — |

---

## Helpful Resources

- [next-intl docs](https://next-intl-docs.vercel.app/)
- [App Router guide](https://next-intl-docs.vercel.app/docs/getting-started/app-router-setup)
- [Message format](https://next-intl-docs.vercel.app/docs/usage/messages)

---

## Questions / Blockers

If stuck:
- Review `docs/localization/PHASE-1-I18N-SPEC.md` for technical details
- Check next-intl docs for specific setup issues
- All code changes are non-destructive (can rollback easily)

---

**Document Status:** Implementation Checklist Ready  
**Last Updated:** 2026-07-10  
**Next Phase:** Phase 2 - Professional Translation (starts after this completes)

Ready to implement upon Founder approval. 🚀
