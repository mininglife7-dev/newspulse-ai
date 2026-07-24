# Capability Register v1 — Current Environment Only

**Source of truth:** `RUNTIME-REGISTRY.latest.json`, produced by
`discover_runtime.py` (every state is a real probe, never assumed).
**Last verified:** 2026-07-24T07:58:39Z (this session's boot discovery).
**Environment:** Linux (Ubuntu 24.04) container, egress-proxied, user `root`,
cwd `/home/user/newspulse-ai`.

Confidence key: **High** = direct probe passed this session · **N/A** = probe
returned UNAVAILABLE (also a verified fact).

| Capability | Status | Evidence | Last Verified | Confidence | Required Action |
| ---------- | ------ | -------- | ------------- | ---------- | --------------- |
| filesystem | READ_WRITE | temp file written+removed in cwd | 2026-07-24 | High | none |
| git | READ_WRITE | branch/commit read; tree clean | 2026-07-24 | High | none |
| github_auth | AVAILABLE | `git ls-remote origin` → 67 heads | 2026-07-24 | High | none |
| internet_access | AVAILABLE | TCP github.com:443 ok (via proxy) | 2026-07-24 | High | none |
| python | AVAILABLE | `/usr/local/bin/python3` (3.11) | 2026-07-24 | High | none |
| node | AVAILABLE | `/opt/node22/bin/node` (v22) | 2026-07-24 | High | none |
| docker | AVAILABLE | `/usr/bin/docker` present | 2026-07-24 | High | not exercised (presence only) |
| task_scheduler | AVAILABLE | systemd present | 2026-07-24 | Medium | scheduling not exercised |
| vercel_access | AVAILABLE | TCP vercel.com:443 ok | 2026-07-24 | Medium | apex only; app-host reachability not probed |
| supabase_access | AVAILABLE | TCP supabase.com:443 ok | 2026-07-24 | Medium | apex only; project-host not probed |
| euro_ai_repository | READ_WRITE | this repo (newspulse-ai) | 2026-07-24 | High | none |
| powershell | UNAVAILABLE | not on PATH | 2026-07-24 | N/A | requires a Windows host |
| vajra_repository | UNAVAILABLE | `C:\VAJRA` / `C:\vajra_gold_20260503` absent | 2026-07-24 | N/A | make readable (Windows-hosted session, or push VAJRA to a repo in scope) |
| market_data | UNAVAILABLE | no feed configured/discovered | 2026-07-24 | N/A | provide a read-only feed as a secret |
| broker | UNAVAILABLE | none configured | 2026-07-24 | N/A | not needed (paper only); Founder-gated |

## Planning rule (enforced)

Governor Ω plans only with `AVAILABLE`/`READ_WRITE`/`READ_ONLY` + PASS
capabilities. It never reports an `UNAVAILABLE` capability as operational.
Every VAJRA-dependent objective is blocked until `vajra_repository` is
AVAILABLE — that single transition unblocks the OPERATION VAJRA audits.
