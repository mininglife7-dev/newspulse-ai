# Mission Plan: German Customer Launch Readiness

**Objective:** Prepare EURO AI for German market (language, accessibility, compliance)

**Timeline:** 2–3 sprints (2 weeks each)

**Success Criteria:**
- Full German UI translation (95%+ coverage)
- WCAG 2.1 AA accessibility compliance verified
- German email templates and customer-facing docs
- Regulatory compliance for German data practices

---

## Phase 1: German Localization Infrastructure (Sprint 1)

### 1.1 i18n Framework Setup

**Current State:** No internationalization framework present. All UI strings hardcoded in English.

**Recommended Framework:** `next-intl` (Next.js 14 native support)

**Setup Work:**
```
1. Install: npm install next-intl
2. Configure middleware.ts to detect locale (de/en)
3. Create messages structure:
   - public/locales/de/common.json (UI strings)
   - public/locales/de/auth.json (auth flows)
   - public/locales/de/onboarding.json (3-step flow)
   - public/locales/de/errors.json (error messages)
   - public/locales/de/governance.json (compliance domain language)
4. Update layout.tsx to wrap with provider
5. Create useTranslation hook for components
```

**Estimated Effort:** 8–12 hours

**Dependencies:** None (framework-only)

---

### 1.2 String Audit & Extraction

**Hardcoded Strings Found (Sample):**

**Authentication:**
- "Welcome back" (signin)
- "Sign up for EURO AI"
- "Verify your email"
- "Check your inbox for a verification link"

**Onboarding:**
- "Set up your workspace"
- "Tell us about your organization"
- "Complete company profile"
- "AI Inventory" / "Risk Assessment"
- "Catalog all AI systems in use"
- "Classify risks and obligations"

**Dashboard:**
- "Welcome, [Name]"
- "Company Setup" / "Completed"
- "AI Inventory" / "add more"
- "Risk Assessment" / "assessments completed"
- "What you can do next"

**Inventory Page:**
- "Add AI system"
- "System registered"
- "Vendor / provider"
- "Status" (active/pilot/deprecated)

**Risk Assessment:**
- 15 questionnaire questions (5 categories)
- Risk levels (unacceptable/high/medium/low)
- Severity labels (critical/high/medium/low)

**Full Audit:** ~120 translatable strings across the app

**Estimated Effort:** 4–6 hours (automated grep + manual review)

---

## Phase 2: German Translation & Testing (Sprint 1–2)

### 2.1 Professional Translation

**Scope:**
- UI strings (120 strings)
- Email templates (signup, verification, password reset)
- Legal pages: `/privacy` and `/terms` (currently marked DRAFT in English)
- Help text and error messages
- Governance domain language (EU AI Act, compliance, obligations)

**Recommendation:** Use professional translator familiar with:
- German tech/compliance terminology
- EU AI Act & GDPR concepts
- Supabase/Next.js industry standard terms

**German Translation Notes:**
- "AI Systems Inventory" → "KI-Systeme-Bestand"
- "Risk Assessment" → "Risikobewertung"
- "Workspace" → "Arbeitsraum" (keep consistent)
- Date/number formatting: German locale (1.234,56 not 1,234.56)

**Estimated Cost:** €300–500 professional translation

**Estimated Effort:** 20–30 hours (source preparation + review + integration)

---

### 2.2 Locale-Aware Features

**Date/Time Formatting:**
- Use `Intl.DateTimeFormat` for German locale
- Example: July 10, 2026 → 10. Juli 2026

**Number Formatting:**
- Use `Intl.NumberFormat` for scores, percentages
- Risk score: 75 → 75% (formatted per locale)

**Form Validation Messages:**
- "This field is required" → locale-specific

**Estimated Effort:** 4–6 hours

---

## Phase 3: Accessibility Audit & Fixes (Sprint 1–2 parallel)

### 3.1 Accessibility Issues Identified

**Critical (WCAG AAA failures):**
1. **Color Contrast** 
   - Slate-600 text on slate-950 background: 2.8:1 (FAIL, need 7:1 for AAA)
   - Issue found in: auth pages, dashboard, inventory
   - Fix: Increase text brightness or darken background

2. **Missing Form Labels**
   - Workspace name input lacks proper `<label>` association
   - Workspace slug, company name inputs similarly affected
   - Fix: Add `htmlFor` to all labels, ensure unique IDs

3. **Keyboard Navigation**
   - Risk assessment collapsible categories not keyboard accessible (no Tab focus)
   - Inventory "Add AI system" button only responds to click
   - Fix: Add keyboard event handlers, focus indicators

4. **Missing Alt Text**
   - Lucide icons used as content (not decorative) lack aria-labels
   - Example: CheckCircle (✓), AlertCircle (⚠️), etc.
   - Fix: Add `aria-label` to all icon uses

5. **Status Indicators** 
   - Badge colors (green/red) sole indicator of status
   - Issue: Color-blind users can't distinguish
   - Fix: Add text labels in addition to color

**High Priority (AA failures):**
1. **Focus Indicators** — Buttons lack visible focus ring (keyboard users can't see where they are)
   - Fix: Add `:focus-visible` styles

2. **Heading Structure** — Multiple `<h1>` tags on same page; should have single primary heading
   - Fix: Audit heading hierarchy (h1 → h2 → h3)

3. **Form Error Messages** — Error text not associated with input fields
   - Fix: Use `aria-invalid` + `aria-describedby`

**Estimated Accessibility Fixes:** 12–16 hours

---

### 3.2 Accessibility Testing Checklist

- [ ] Automated: axe DevTools or WAVE browser extension
- [ ] Manual: Keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- [ ] Manual: Screen reader (NVDA on Windows, VoiceOver on Mac)
- [ ] Color contrast: WebAIM contrast checker on all text
- [ ] Zoom: Test at 200% browser zoom
- [ ] Mobile: Touch targets at least 44×44px

---

## Phase 4: German Compliance & Legal (Sprint 2)

### 4.1 Legal Pages Translation & Review

**Current:** `/privacy` and `/terms` marked DRAFT, English-only, content is stale (NewsPulse references)

**Required:**
- Rewrite `/privacy` for EURO AI German users:
  - GDPR data processing disclosure
  - Supabase data location (EU)
  - Email auth flow and cookie policies
  - Right to access/deletion/portability
- Rewrite `/terms` for EURO AI:
  - EU AI Act compliance obligations
  - Liability limitations
  - Proper German legal language

**Recommendation:** Legal review by German lawyer (regulatory requirement for first customer)

**Estimated Cost:** €500–1000 legal review

**Estimated Effort:** 8–12 hours (content + review cycles)

---

### 4.2 Email Templates

**Localize:**
- Signup confirmation email
- Email verification email
- Password reset email
- Subject lines + body text in German

**Ensure:** Branding consistent, links work, tone matches brand

**Estimated Effort:** 2–3 hours

---

## Phase 5: Quality Assurance (Sprint 2–3)

### 5.1 QA Plan

1. **Functional Testing** — Full 3-step onboarding in German
   - Signup → email verify → company setup → inventory → risk assessment
   - All forms, buttons, validations work in German
   - No English strings leak through

2. **Accessibility QA** — All WCAG AA criteria verified
   - Keyboard navigation end-to-end
   - Screen reader test (at least one flow)
   - High-contrast mode test

3. **German Customer Perspective**
   - Terminology consistency (glossary)
   - Tone and phrasing feel natural
   - No literal translations that sound awkward

4. **Deployment Verification**
   - German locale loads correctly in production
   - Locale switching works (if multi-locale)
   - No missing translations in any view

**Estimated Effort:** 12–16 hours

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Translation quality issues | Professional translator + German customer review |
| Accessibility regressions | Automated testing (axe) in CI pipeline |
| Missing strings in production | String audit + component review checklist |
| Legal compliance gaps | Legal review before launch |
| Founder blocked on Supabase/Vercel setup | These should resolve before localization starts |

---

## Resource Requirements

- **Engineering:** 60–80 hours (setup, extraction, testing, QA)
- **Translation:** €300–500 (professional) + 20–30 hours integration
- **Legal Review:** €500–1000 + 8–12 hours integration
- **Design Review:** 4–6 hours (UX review of German UI)

**Total Project Effort:** ~3 weeks (2–3 sprints) with parallel work

---

## Next Steps (If Founder Approves)

1. **Week 1:** i18n infrastructure setup + string audit + accessibility fixes
2. **Week 2:** Professional translation + German testing + legal review
3. **Week 3:** QA + final verification + production deployment

**Gate:** Supabase schema.sql must be deployed before German launch (prerequisite)

---

## Success Metrics

- [ ] 100% UI string coverage in German
- [ ] WCAG 2.1 AA compliance verified
- [ ] First German customer can complete onboarding in German
- [ ] Legal review passed (privacy/terms compliance)
- [ ] No hard-coded English strings in German experience
- [ ] Performance unaffected by i18n (measure load time)

---

## Appendix: Accessibility Quick Wins (Do Now)

These can be fixed **immediately** without localization work:

1. **Add focus indicators to all buttons**
   ```css
   button:focus-visible {
     outline: 2px solid #3b82f6;
     outline-offset: 2px;
   }
   ```

2. **Add aria-labels to icon-only buttons**
   ```tsx
   <button aria-label="Add AI system">
     <Plus className="h-4 w-4" />
   </button>
   ```

3. **Fix text contrast in auth pages**
   - Change slate-600 → slate-300 on slate-950 backgrounds

4. **Audit heading hierarchy**
   - Dashboard should have one `<h1>`, rest `<h2>`/`<h3>`

**Estimated Quick Wins:** 4–6 hours, immediate customer value

---

**Prepared by:** Governor  
**Date:** 2026-07-10  
**Status:** Ready for Founder review and approval
