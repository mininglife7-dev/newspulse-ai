# Phase 1: i18n Infrastructure Specification

**Phase:** 1 of 5 (German Launch Mission)  
**Objective:** Set up internationalization infrastructure for multi-language support  
**Duration:** 2-3 days engineering  
**Dependencies:** None (can begin immediately)  
**Blocking:** Phase 2 (professional translation)

---

## Overview

Phase 1 establishes the technical foundation for supporting German and other languages without waiting for strings to be translated. Once complete, Phase 2 can begin collecting professional translations in parallel.

**What gets done in Phase 1:**
- ✅ i18n library integration (next-intl)
- ✅ Locale configuration and routing
- ✅ Middleware for locale detection
- ✅ Language switcher UI component
- ✅ TypeScript setup for i18n types
- ✅ Build process integration

**What does NOT get done in Phase 1:**
- ❌ String translation (Phase 2)
- ❌ Customer-facing German UI (Phase 2)
- ❌ Legal/compliance translations (Phase 4)

---

## Technical Stack

| Layer | Technology | Decision |
|-------|-----------|----------|
| **i18n Library** | next-intl | Industry standard for Next.js; excellent TypeScript support |
| **File Format** | JSON | Simple, human-readable for translators |
| **Locale Detection** | Middleware | Detect from URL prefix, browser preference, or user setting |
| **Language Switcher** | React component | User-selectable language picker in UI |
| **Build** | next-intl CLI | Pre-build all locales for production |
| **Routing** | Prefix-based | `/en/...` and `/de/...` routes |

---

## Implementation Tasks

### Task 1: Install & Configure next-intl

**Files to create/modify:**
- `package.json` — Add next-intl dependency
- `next.config.js` — Configure plugin
- `.env.local` — Add locale config (dev only)

**Commands:**
```bash
npm install next-intl
```

**Configuration:**
```javascript
// next.config.js
const withNextIntl = require('next-intl/build');

module.exports = withNextIntl({
  i18n: {
    locales: ['en', 'de'],
    defaultLocale: 'en',
  },
});
```

**Estimated effort:** 30 minutes

---

### Task 2: Locale Middleware & Routing

**Files to create/modify:**
- `middleware.ts` — Route-based locale detection
- `app/[locale]/layout.tsx` — Locale-aware root layout
- `app/[locale]/page.tsx` — Reorganize routes under `[locale]` segment

**Implementation:**
```typescript
// middleware.ts
import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed', // Only show /de for German
});

export const config = {
  matcher: [
    // All routes except api, _next, static assets
    '/((?!api|_next|_static|favicon|robots|sitemap).*)',
  ],
};
```

**Routing structure:**
```
app/
  [locale]/
    page.tsx (landing)
    layout.tsx (root with locale provider)
    auth/
      signup/page.tsx
      signin/page.tsx
      verify-email/page.tsx
    dashboard/page.tsx
    inventory/page.tsx
    risk-assessments/page.tsx
    workspace/
      setup/page.tsx
```

**Estimated effort:** 1 day (file reorganization, testing)

---

### Task 3: String Extraction & Translation Setup

**Files to create/modify:**
- `messages/en.json` — English strings (source)
- `messages/de.json` — German strings (skeleton, ready for translation)
- `lib/i18n.ts` — Helper to access translations

**Message structure:**
```json
// messages/en.json
{
  "landing": {
    "hero": {
      "title": "AI Governance",
      "subtitle": "Made Simple"
    },
    "features": {
      "aiInventory": "Catalog all AI systems...",
      "riskAnalysis": "Classify risks based on EU AI Act..."
    }
  },
  "auth": {
    "signup": {
      "heading": "Create your account",
      "email": "Email",
      "password": "Password"
    }
  }
}
```

**Helper function:**
```typescript
// lib/i18n.ts
import { useTranslations } from 'next-intl';

export function useAppTranslations() {
  return useTranslations();
}
```

**Component usage:**
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

**Estimated effort:** 4-6 hours (structured data entry of 99 strings)

---

### Task 4: Language Switcher Component

**Files to create/modify:**
- `components/language-switcher.tsx` — Dropdown UI for language selection
- `app/[locale]/layout.tsx` — Include switcher in header

**Implementation:**
```typescript
// components/language-switcher.tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('navigation');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ];

  return (
    <select
      value={locale}
      onChange={(e) => {
        const newLocale = e.target.value;
        router.push(`/${newLocale}`);
      }}
      className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
```

**Placement:** Top-right corner of layout, visible on all pages

**Estimated effort:** 2 hours

---

### Task 5: Type Safety & Build Integration

**Files to create/modify:**
- `tsconfig.json` — Add next-intl types
- `next.config.js` — Ensure build process includes all locales
- `package.json` — Add build script for i18n

**Type definitions:**
```typescript
// Ensure TypeScript knows about translation keys
declare global {
  interface IntlMessages {
    landing: {
      hero: {
        title: string;
        subtitle: string;
      };
      // ... rest of schema
    };
  }
}
```

**Build configuration:**
```bash
# In package.json scripts
"build": "next build"
# next-intl automatically builds all locales

# Verify build includes both:
# .next/server/app/[locale]/page.js (en)
# .next/server/app/de/page.js (de as static)
```

**Estimated effort:** 1 hour

---

### Task 6: Testing & Verification

**Verification checklist:**

| Test | How to Verify | Expected Result |
|------|---------------|-----------------|
| URL routing | Visit `/en/` and `/de/` | Both render, locale correct |
| Language switcher | Click language selector | Route changes, UI updates |
| Message rendering | Check page HTML | English strings rendered (German skeleton for de) |
| Build | `npm run build` | No errors, all locales included |
| Types | `npm run type-check` | TypeScript finds translation keys |
| Static export (optional) | Check `.next/` | Both `/en` and `/de` folders present |

**Manual testing flow:**
1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000/en/` → English landing page
3. Visit `http://localhost:3000/de/` → German URL, English strings (placeholder)
4. Click language switcher → Route changes, content stays same
5. Check `/de/auth/signup` → Form in English (ready for German translation)

**Estimated effort:** 1 hour

---

## Deliverables

### Code Deliverables
- ✅ Locale middleware and routing structure
- ✅ 99 strings extracted into `messages/en.json` and `messages/de.json` skeleton
- ✅ Language switcher component
- ✅ TypeScript i18n types
- ✅ All pages refactored to use `useTranslations()`
- ✅ Build process verified for multi-locale support

### Documentation Deliverables
- ✅ This specification document (PHASE-1-I18N-SPEC.md)
- ✅ String audit report (strings-audit.json)
- ✅ Developer guide for adding new strings (how-to docs)
- ✅ Translation export format ready for Phase 2

### Testing Deliverables
- ✅ Verification checklist passed
- ✅ No TypeScript errors
- ✅ All routes accessible in both `/en` and `/de`
- ✅ Production build successful with all locales

---

## Phase 1 to Phase 2 Handoff

Once Phase 1 completes:

1. **Export strings for translator:**
   ```bash
   # Prepare JSON export
   cat messages/en.json > for-translator.json
   # Translator receives this file, returns messages/de.json
   ```

2. **Integration point:**
   - Phase 2 receives completed `messages/de.json` from translator
   - Merge into codebase
   - Run verification: `/de` routes should now show German UI

3. **No code changes needed in Phase 1:**
   - Translation is configuration (JSON) only
   - Phase 1 code doesn't require modification for translations to work

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Routing complexity | URLs break, customers lost | Thoroughly test all routes in both locales |
| Missing strings | UI shows `[key]` placeholders | Audit tool ensures 100% coverage |
| Build bloat | Slower production build | Monitor build time; optimize if needed |
| TypeScript drift | Types don't match keys | Use typed translation helper |

---

## Success Criteria

Phase 1 is complete when:

- [ ] All 99 strings extracted and structured in `messages/en.json`
- [ ] Middleware correctly detects locale from URL
- [ ] `/en/` routes show English, `/de/` routes show English (skeleton ready)
- [ ] Language switcher visible and functional
- [ ] TypeScript strict mode passes with i18n types
- [ ] Production build includes both locales
- [ ] Verification checklist passes
- [ ] Strings ready for professional translator (Phase 2)

---

## Next Phase (Phase 2: Professional Translation)

Once Phase 1 complete:

1. **Export strings:** `messages/en.json` → translator
2. **Timeline:** 1-2 weeks for professional translation
3. **Deliverable:** Completed `messages/de.json`
4. **Integration:** Merge JSON into codebase
5. **Testing:** Phase 3 (QA in German)

---

## Implementation Order

**Day 1:**
- [ ] Install next-intl
- [ ] Configure middleware and routing
- [ ] Reorganize app structure under `[locale]`

**Day 2:**
- [ ] Extract strings into message files
- [ ] Create language switcher component
- [ ] Refactor components to use `useTranslations()`

**Day 3:**
- [ ] Type safety and build integration
- [ ] Testing and verification
- [ ] Documentation and handoff prep

---

## Commands Reference

```bash
# Install
npm install next-intl

# Development
npm run dev
# Visit http://localhost:3000/en and http://localhost:3000/de

# Type check
npm run type-check

# Build
npm run build

# Test translations
npm run build -- --debug
```

---

## Resources

- [next-intl documentation](https://next-intl-docs.vercel.app/)
- [Message format guide](https://next-intl-docs.vercel.app/docs/usage/messages)
- [App Router setup](https://next-intl-docs.vercel.app/docs/getting-started/app-router-setup)

---

**Document Status:** Phase 1 Specification Ready  
**Ready to Execute:** Yes (no dependencies)  
**Next Milestone:** Founder approval → Phase 1 execution begins

---

## Appendix: String Audit Summary

- **Total strings:** 99
- **High priority:** 85 (customer-facing, critical)
- **Medium priority:** 14 (UI chrome, help text)
- **Estimated translation:** €300-500 (external vendor)
- **Character count:** ~2,149 characters (manageable for professional translator)
- **Audit export:** `docs/localization/strings-audit.json`

See `docs/localization/strings-audit.json` for complete string list organized by type and priority.
