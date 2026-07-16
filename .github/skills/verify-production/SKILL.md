# Skill: verify-production

**Purpose:** Establish the true state of production with evidence — never
from documents alone.
**Inputs:** none (read-only against live systems).
**Steps:**

1. Database: latest "Deploy Supabase Schema" run — status, target project
   ID and region from the job logs (env block shows `SUPABASE_PROJECT_ID`
   and host). Do not trust a doc that names a region; trust the log.
2. Application: fetch the production URL — landing page 200, `/api/health`
   response recorded verbatim.
3. Auth surface: confirm protected routes redirect unauthenticated users.
4. CI: last runs on `main` all green.
5. Cross-check every claim in PROJECT_STATE.md against what you found;
   correct drift immediately (Law 9).
   **Expected output:** updated PROJECT_STATE.md, each fact labelled with
   evidence.
   **Verification:** every changed line cites a run ID, URL response, or SHA.
   **Failure handling:** unreachable systems → mark UNKNOWN (never assume);
   contradiction between docs and evidence → evidence wins, banner the doc,
   log the correction.
