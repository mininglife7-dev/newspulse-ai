# NEXT_ACTION — The One Active Mission

> Exactly one mission lives here. Finish it, verify it, replace it.

## Current Mission

**Customer-journey verification against live EU production:** exercise the
full first-customer journey on `https://newspulse-ai-eight.vercel.app`
(the Founder-confirmed production URL) and move every row of
`DEMO_READINESS.md` to VERIFIED (with evidence) or BLOCKED (with exact
failure and owner).

## Why this mission is first

The EU migration is closed (RISK-008 ✅ — DB run `29586277262`, app
runtime run `29596903172`). The platform is live, healthy, and EU-resident
— but no human or agent has ever completed the journey the first customer
(a German accounting firm) will take. Until then, no launch claim is
possible (Law 3).

## Execution notes (hard-won environment facts)

- Governor cloud sandboxes CANNOT reach `vercel.app`/`supabase.co`
  (egress proxy). GitHub Actions runners CAN — use dispatchable
  workflows (`verify-app-supabase-target.yml` is the template) or
  runner-executed Playwright for journey steps.
- `/api/health` now reports `supabase_host` — runtime target evidence.
- `newspulse-ai.vercel.app` (cited ~90× in old docs) is NOT our app.
  Doc sweep to correct the URL is part of this mission's cleanup.

## Success criteria

1. Journey steps 1–9 of `.github/skills/customer-journey/SKILL.md`
   exercised against production (runner-based; disposable test email;
   never real customer data).
2. Every DEMO_READINESS.md row → VERIFIED (date, URL, evidence artifact)
   or BLOCKED (reproduction + owner). Zero UNKNOWN/stale rows.
3. Old-URL doc references corrected or bannered (RISK-004 hygiene).
4. PROJECT_STATE.md customer-readiness section updated; decision-log
   entry if significant calls are made.

## Completion conditions

All rows VERIFIED/BLOCKED with evidence; any BLOCKED row filed as the
next mission candidate. Then replace this file.

## Next owner

Any Governor Ω session (start with the execution loop in AGENTS.md).

## Queued missions (not active — do not start)

1. Fix any BLOCKED journey steps found by this mission.
2. Adopt or close PR #124 (billing/obligations tests) and PR #149
   (test lab) with evidence.
3. Founder-discretion follow-ups: Tokyo project decommission; DB password
   rotation; branch protection (RISK-002); `CEIS_CRON_SECRET` (RISK-006).
