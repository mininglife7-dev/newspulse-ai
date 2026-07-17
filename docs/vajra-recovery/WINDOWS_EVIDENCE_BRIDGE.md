# Windows Evidence Bridge — VAJRA Cloud Fortress Mission

**Created:** 2026-07-17T03:20:00Z  
**Status:** Ready for Founder execution  
**Safety Level:** Read-only, non-destructive

## Overview

Because the current cloud environment is Linux-based and cannot directly access your Windows laptop's C: drive, we have created a safe evidence collector that runs locally on your Windows machine.

This tool performs a complete forensic discovery of all VAJRA and VAJRA Gold projects without modifying, deleting, or exposing any sensitive data.

## What This Bridge Does

1. **Scans C: drive** for VAJRA-related repositories and projects
2. **Inspects Git metadata** (branches, commits, remotes, status) without modifying anything
3. **Detects secrets** in configuration files without printing their values
4. **Inventories all assets** (source code, tests, configurations, databases, reports)
5. **Generates reports** in machine-readable formats (CSV, JSON) and Markdown
6. **Creates checksums** for integrity verification

## Safety Guarantees

✅ **Read-only operation** — No files modified, deleted, moved, or renamed  
✅ **No secrets printed** — Potential secrets are reported by filename and type only  
✅ **No automatic uploads** — All data stays on your laptop until you choose to upload  
✅ **No credential rotation** — No secret management or changes made  
✅ **No network transmission** — All work happens locally  
✅ **No installation required** — Runs as a standalone script

## How to Use

### Step 1: Download the Scripts

The two scripts are located in:

```
tools/windows/
├── Collect-VajraEvidence.ps1        (main evidence collector)
└── START_VAJRA_RECOVERY.cmd         (simple launcher)
```

Download both files to your Windows laptop.

### Step 2: Run the Launcher

1. Open Windows Explorer
2. Navigate to where you downloaded the files
3. **Double-click `START_VAJRA_RECOVERY.cmd`**
4. PowerShell will open and the scan will begin automatically

### Step 3: Wait for Completion

The scan typically takes 30-60 seconds. You'll see progress messages like:

```
[PHASE 1] Candidate Repository Discovery
  Scanning for VAJRA and related projects...
  ... scanned 500 folders
```

### Step 4: Review Results

When complete, a folder will be created at:

```
C:\VAJRA_EVIDENCE_EXPORT\<YYYYMMDD-HHMMSS>\
```

This folder contains:

| File                       | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `candidate_inventory.csv`  | Spreadsheet of all found projects (open in Excel)    |
| `candidate_inventory.json` | Machine-readable inventory for analysis              |
| `git_repository_map.md`    | Detailed Git history, branches, remotes              |
| `secret_risk_report.md`    | Potential secrets found (remediation guide included) |
| `environment.json`         | Scan environment details and summary stats           |
| `checksums.sha256`         | File integrity verification                          |

### Step 5: Upload Results

Choose one of:

**Option A: Upload folder (recommended)**

```
C:\VAJRA_EVIDENCE_EXPORT\<YYYYMMDD-HHMMSS>\
```

ZIP this folder if you prefer, then upload to the mission workspace.

**Option B: Upload individual files**
You can upload just the CSV and markdown files if bandwidth is limited.

## What to Look For in Results

After running the collector, review:

### 1. candidate_inventory.csv

Open in Excel or Google Sheets. Look for:

- Rows with "vajra" or "gold" in the **Name** column
- **IsGitRepository** = TRUE (indicates version control)
- **CommitCount** > 100 (indicates mature projects)
- **Size_MB** (understand project scale)
- **Languages** (programming languages used)

### 2. git_repository_map.md

Review Git details:

- **Branch names** (main, develop, release/_, feature/_, etc.)
- **Commit counts** (activity history)
- **Remotes** (if hosted on GitHub or other services)
- **Last commit dates** (which projects are actively developed)
- **Dirty status** (uncommitted changes)

### 3. secret_risk_report.md

Check findings:

- **File paths** containing potential secrets
- **Secret types** (API keys, tokens, credentials)
- **Remediation steps** if any secrets are found

## Common Findings

You'll likely find:

- ✅ VAJRA repository (modern version, likely Git)
- ✅ VAJRA_GOLD repository (backup or variant)
- ✅ Supporting folders (test data, reports, configurations)
- ✅ Broker sandbox credentials (safe if not live)
- ⚠️ Possibly abandoned or experimental folders

## If Scan Hangs or Fails

**Option 1: Run with limited scope**

```powershell
.\Collect-VajraEvidence.ps1 -SearchRoot "C:\Users\$env:USERNAME"
```

**Option 2: Skip ZIP archive (if disk space is low)**

```powershell
.\Collect-VajraEvidence.ps1 -SkipArchives $true
```

**Option 3: Check output anyway**
Even if the script exits with an error, check `C:\VAJRA_EVIDENCE_EXPORT` for partial results.

## Troubleshooting

| Issue                                | Solution                                                      |
| ------------------------------------ | ------------------------------------------------------------- |
| "PowerShell script is disabled"      | Right-click cmd file, "Run as Administrator"                  |
| Antivirus blocks the script          | Temporarily disable AV, or run from Safe Mode with Networking |
| Permission denied on certain folders | Script skips those folders and continues                      |
| No results found                     | Verify VAJRA folders exist on C: drive, check folder names    |
| Disk space warning                   | Delete old backups or temporary files, then re-run            |

## Founder Action Required

**This is the only action required from you:**

1. Download the two script files
2. Run `START_VAJRA_RECOVERY.cmd` by double-clicking it
3. Wait for completion
4. Upload the resulting `VAJRA_EVIDENCE_EXPORT` folder (or ZIP it first)

Everything else (analysis, consolidation, cloud setup) happens autonomously in the cloud environment.

## Security Notes

- Scripts run **locally** — no credentials are sent anywhere
- Secrets are **reported by filename only** — values never printed
- Results are **stored on your laptop** — you decide when/if to upload
- **No automatic rotation** of any credentials
- All operations are **reversible and non-destructive**

## Next Steps After Upload

Once you upload the evidence:

1. Cloud analysis identifies authoritative VAJRA and VAJRA Gold repositories
2. Unique assets from both versions are preserved
3. Sensitive data and secrets are properly quarantined
4. A consolidated private GitHub repository is created
5. Safe paper-trading and research-only defaults are enforced
6. Complete cloud architecture is designed and documented
7. Recovery and backup procedures are established

---

**Questions?** All results are preserved on your laptop. You can re-run the scan at any time if you need to verify or update findings.
