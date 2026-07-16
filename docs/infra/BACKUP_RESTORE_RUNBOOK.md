# Backup & Restore Runbook — EURO AI

**Addresses:** R-06 (no database backups / no restore test), part of R-12 (no rollback plan).
**Cost:** €0 — uses the free GitHub Actions backup workflow. Supabase Pro daily backups / PITR remain the paid upgrade path (see `CLOUD_DEPLOYMENT_BLUEPRINT.md`).

> **Status:** the backup mechanism is committed but **inert until the two secrets below are set** — the same opt-in pattern as `ADMIN_TOKEN`. Setting them is a Founder action (needs the Supabase database URL). Until then, backups do not run and nothing is spent or exposed.

---

## 1. Enable backups (one-time, Founder — ~5 min)

Add two **repository secrets** (GitHub → Settings → Secrets and variables → Actions → New repository secret):

| Secret              | Where to get it                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_DB_URL`   | Supabase → Project Settings → Database → **Connection string → URI**. Use the connection-pooler URI. Keep the password in it.                                          |
| `BACKUP_PASSPHRASE` | Any strong passphrase you generate. **Store it in the password manager** — it is required to decrypt every backup. If you lose it, existing backups are unrecoverable. |

The workflow (`.github/workflows/backup.yml`) then runs automatically **every Monday 03:17 UTC**, and can be run on demand via **Actions → Database Backup → Run workflow**.

Each run produces an AES-256-encrypted `euro-ai-db-<timestamp>.dump.gpg` stored as a **private** Actions artifact, retained 90 days.

## 2. Verify a backup ran

Actions → **Database Backup** → latest run → confirm the `Upload encrypted backup artifact` step is green and an artifact `db-backup-<timestamp>` is attached. If a run shows "Backup skipped", a secret is missing.

## 3. Restore drill (do this once before Alpha — ~20 min)

**Rehearsing the restore is the point of R-06 — an untested backup is not a backup.** Do this into a _scratch_ Supabase project, never production.

```bash
# 1. Download the artifact from the Actions run, then unzip it. You now have:
#    euro-ai-db-<timestamp>.dump.gpg

# 2. Decrypt with the same BACKUP_PASSPHRASE:
gpg --batch --yes --decrypt \
  --passphrase 'YOUR_BACKUP_PASSPHRASE' \
  --output newspulse.dump \
  euro-ai-db-<timestamp>.dump.gpg

# 3. Restore into a SCRATCH project's database URL (never production):
#    (create a throwaway Supabase project; copy its Database connection URI)
pg_restore \
  --no-owner --no-privileges \
  --clean --if-exists \
  --dbname "postgresql://postgres:PASSWORD@HOST:PORT/postgres" \
  newspulse.dump

# 4. Verify row counts match expectations:
psql "postgresql://postgres:PASSWORD@HOST:PORT/postgres" \
  -c "select count(*) from public.news_searches;"
```

**Write down how long steps 1–4 took** — that number is your recovery-time evidence (RTO) for the Alpha checklist and for German-customer procurement.

## 4. Real recovery (production data loss)

1. Stop writes if feasible (put the app in maintenance / disable the deploy).
2. Follow §3 steps 1–2 to obtain a decrypted `newspulse.dump`.
3. Restore into the **production** database URL using the §3 step-3 command (`--clean --if-exists` replaces existing objects). Take a fresh manual `pg_dump` of current prod first if any data exists you might still want.
4. Verify row counts and spot-check `/history` in the app.
5. Record the incident in the decision/incident log.

**RPO:** with weekly backups, worst-case data loss is ~7 days. To reduce it, either raise the cron frequency in `backup.yml` (e.g. daily `17 3 * * *`) or move to Supabase Pro daily backups / PITR before paid customers.

## 5. Limits & upgrade path

- GitHub artifacts are private to repo collaborators and expire after 90 days — fine for Alpha/Beta; for long retention, add an offsite copy to EU object storage (Hetzner) per the blueprint.
- This covers the **database** only. Application code is already durably in Git; secrets live in Vercel env + the password manager.
- For paid customers requiring minutes-level RPO, enable Supabase PITR (paid) — the free path here is deliberately weekly.
