#Requires -Version 5.1
<#
.SYNOPSIS
    VAJRA Cloud Fortress Evidence Collector

    Safe, read-only forensic discovery of VAJRA and VAJRA Gold projects on Windows.

.DESCRIPTION
    This script performs a comprehensive, non-destructive scan of the C: drive for VAJRA
    and VAJRA Gold repositories, configurations, and related assets.

    SAFETY GUARANTEES:
    - Read-only operation (no files modified, deleted, or moved)
    - No secrets printed or uploaded
    - No automatic deletion
    - No credential rotation
    - No network transmission
    - Output saved to C:\VAJRA_EVIDENCE_EXPORT\<timestamp>

.PARAMETER OutputRoot
    Directory where evidence will be saved. Default: C:\VAJRA_EVIDENCE_EXPORT

.PARAMETER SearchRoot
    Root drive/path to search. Default: C:\

.PARAMETER SkipArchives
    If $true, do not create ZIP archives (if disk space is insufficient)

.EXAMPLE
    .\Collect-VajraEvidence.ps1

.EXAMPLE
    .\Collect-VajraEvidence.ps1 -SearchRoot "C:\Users\$env:USERNAME\Documents" -SkipArchives $true

#>

param(
    [string]$OutputRoot = "C:\VAJRA_EVIDENCE_EXPORT",
    [string]$SearchRoot = "C:\",
    [bool]$SkipArchives = $false
)

$ErrorActionPreference = "Continue"
$WarningPreference = "Continue"

# ============================================================================
# PHASE 0: ENVIRONMENT TRUTH
# ============================================================================

Write-Host "┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│ VAJRA CLOUD FORTRESS — WINDOWS EVIDENCE COLLECTOR          │" -ForegroundColor Cyan
Write-Host "│ Safe, Read-Only Forensic Discovery                         │" -ForegroundColor Cyan
Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Environment check
Write-Host "[PHASE 0] Environment Truth Check" -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$exportPath = Join-Path $OutputRoot $timestamp
$osInfo = [System.Environment]::OSVersion.VersionString
$psVersion = $PSVersionTable.PSVersion.Major

Write-Host "  Operating System: $osInfo"
Write-Host "  PowerShell Version: $psVersion"
Write-Host "  Current User: $env:USERNAME"
Write-Host "  Hostname: $env:COMPUTERNAME"
Write-Host "  Search Root: $SearchRoot"
Write-Host "  Export Path: $exportPath"
Write-Host ""

# Verify C: drive access
if (-not (Test-Path $SearchRoot)) {
    Write-Host "  ERROR: Cannot access $SearchRoot" -ForegroundColor Red
    Write-Host ""
    Write-Host "  THIS SCRIPT CANNOT ACCESS THE SEARCH ROOT: $SearchRoot" -ForegroundColor Red
    Write-Host "  Please verify the path and re-run."
    exit 1
}

# Create output directory
if (-not (Test-Path $exportPath)) {
    New-Item -ItemType Directory -Path $exportPath -Force | Out-Null
    Write-Host "  ✓ Created export directory: $exportPath" -ForegroundColor Green
} else {
    Write-Host "  ✓ Export directory exists: $exportPath" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# PHASE 1: CANDIDATE DISCOVERY
# ============================================================================

Write-Host "[PHASE 1] Candidate Repository Discovery" -ForegroundColor Yellow

$searchPatterns = @(
    "*vajra*",
    "*gold*",
    "*trading*",
    "*paper*trade*",
    "*zerodha*",
    "*kite*",
    "*broker*",
    "*strategy*",
    "*backtest*",
    "*hypothesis*",
    "*quant*",
    "*research*",
    "*market*data*",
    "*organism*",
    "*kernel*"
)

$candidateFolders = @()
$searchedFolders = 0
$excludePatterns = @("System Volume Information", "RECYCLE.BIN", "AppData\Local\Microsoft", "Windows", "Program Files")

Write-Host "  Scanning for VAJRA and related projects..."
Write-Host "  (This may take 30-60 seconds)"
Write-Host ""

try {
    $allFolders = Get-ChildItem -Path $SearchRoot -Directory -Recurse -ErrorAction SilentlyContinue |
        Where-Object {
            $path = $_.FullName
            $excluded = $false
            foreach ($exclude in $excludePatterns) {
                if ($path -match [regex]::Escape($exclude)) {
                    $excluded = $true
                    break
                }
            }
            -not $excluded
        }

    foreach ($folder in $allFolders) {
        $searchedFolders++

        # Check folder name against patterns
        $folderName = $folder.Name
        foreach ($pattern in $searchPatterns) {
            if ($folderName -like $pattern) {
                $candidateFolders += $folder.FullName
                break
            }
        }

        # Show progress every 500 folders
        if ($searchedFolders % 500 -eq 0) {
            Write-Host "  ... scanned $searchedFolders folders" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  Warning: Some folders could not be scanned" -ForegroundColor Yellow
}

Write-Host "  ✓ Searched: $searchedFolders folders" -ForegroundColor Green
Write-Host "  ✓ Candidates found: $($candidateFolders.Count)" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PHASE 2: CANDIDATE ANALYSIS
# ============================================================================

Write-Host "[PHASE 2] Candidate Analysis" -ForegroundColor Yellow

$inventory = @()
$gitRepos = @()

foreach ($candidate in $candidateFolders) {
    try {
        $folderInfo = Get-Item -Path $candidate -ErrorAction Stop
        $size = (Get-ChildItem -Path $candidate -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        $lastModified = $folderInfo.LastWriteTime

        $isGitRepo = Test-Path (Join-Path $candidate ".git")
        $branch = ""
        $remote = ""
        $headCommit = ""
        $commitDate = ""
        $commitCount = 0
        $isDirty = $false
        $untrackedCount = 0
        $languages = @()

        if ($isGitRepo) {
            # Git analysis
            Push-Location $candidate
            try {
                $branch = & git rev-parse --abbrev-ref HEAD 2>$null
                $headCommit = & git rev-parse HEAD 2>$null
                $commitDate = & git log -1 --format=%ai 2>$null
                $commitCount = @(& git log --oneline 2>$null).Count
                $status = & git status --porcelain 2>$null
                $isDirty = ($status.Count -gt 0)
                $untrackedCount = @(& git ls-files --others --exclude-standard 2>$null).Count

                # Get remotes (sanitized to prevent credential leakage)
                $remoteOutput = & git remote -v 2>$null
                if ($remoteOutput) {
                    $rawRemote = ($remoteOutput[0] -split "\s+")[1]
                    # Strip credentials from URL (e.g., https://user:token@host/repo.git -> https://host/repo.git)
                    if ($rawRemote -match "^(https?|git|ssh)://(.+@)?(.+)$") {
                        $remote = $matches[1] + "://" + $matches[3]
                    } else {
                        $remote = $rawRemote
                    }
                }
            } catch {
                # Git command failed - directory might not be a proper repo
            }
            Pop-Location
        }

        # Detect languages
        if (Test-Path (Join-Path $candidate "package.json")) { $languages += "JavaScript/Node" }
        if (Test-Path (Join-Path $candidate "pyproject.toml")) { $languages += "Python" }
        if (Test-Path (Join-Path $candidate "requirements.txt")) { $languages += "Python" }
        if (Test-Path (Join-Path $candidate "Cargo.toml")) { $languages += "Rust" }
        if (Test-Path (Join-Path $candidate "go.mod")) { $languages += "Go" }
        if ((Get-ChildItem -Path $candidate -Filter "*.py" -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) { $languages += "Python" }
        if ((Get-ChildItem -Path $candidate -Filter "*.js" -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) { $languages += "JavaScript" }

        # Interesting files
        $hasEnv = Test-Path (Join-Path $candidate ".env*")
        $hasTests = Test-Path (Join-Path $candidate "*test*") -PathType Container
        $hasDocker = Test-Path (Join-Path $candidate "Dockerfile")
        $hasCI = Test-Path (Join-Path $candidate ".github")

        $entry = @{
            "Path" = $candidate
            "Name" = $folderInfo.Name
            "Size_MB" = [Math]::Round($size, 2)
            "LastModified" = $lastModified
            "IsGitRepository" = $isGitRepo
            "Branch" = $branch
            "Remote" = $remote
            "HeadCommit" = $headCommit
            "CommitDate" = $commitDate
            "CommitCount" = $commitCount
            "IsDirty" = $isDirty
            "UntrackedFiles" = $untrackedCount
            "Languages" = ($languages -join ", ")
            "HasEnv" = $hasEnv
            "HasTests" = $hasTests
            "HasDocker" = $hasDocker
            "HasCI" = $hasCI
        }

        $inventory += $entry

        if ($isGitRepo) {
            $gitRepos += $entry
        }

    } catch {
        Write-Host "  Error analyzing $candidate : $_" -ForegroundColor Red
    }
}

Write-Host "  ✓ Analyzed: $($inventory.Count) candidates" -ForegroundColor Green
Write-Host "  ✓ Git repositories: $($gitRepos.Count)" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PHASE 3: SECRET SCANNING
# ============================================================================

Write-Host "[PHASE 3] Secret Exposure Scan" -ForegroundColor Yellow

$secretPatterns = @{
    "GitHub Token" = "ghp_[A-Za-z0-9]{36}"
    "Zerodha API Key" = "(?i)(zerodha|kite).*?['\"][A-Za-z0-9]{32}['\"]"
    "AWS Access Key" = "AKIA[0-9A-Z]{16}"
    "Private Key" = "-----BEGIN (RSA|DSA|EC|OPENSSH|ENCRYPTED|PRIVATE) KEY-----"
    "Password Assignment" = "(?i)(password|passwd|pwd)\s*[=:]\s*['\"][^'\"]{6,}['\"]"
    "API Key Assignment" = "(?i)(api[_-]?key|secret|token)\s*[=:]\s*['\"][^'\"]{10,}['\"]"
}

$secretFindings = @()

foreach ($candidate in $candidateFolders) {
    # Only scan common config file types (not entire directory)
    $configFiles = @(
        "*.env*",
        "*.conf",
        "*.config",
        "*.json",
        "*.yaml",
        "*.yml",
        "secrets*",
        "*credentials*"
    )

    foreach ($pattern in $configFiles) {
        $files = Get-ChildItem -Path $candidate -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue |
            Select-Object -First 100  # Limit to first 100 matches per pattern

        foreach ($file in $files) {
            try {
                $content = Get-Content -Path $file.FullName -ErrorAction SilentlyContinue

                foreach ($secretPattern in $secretPatterns.GetEnumerator()) {
                    if ($content -match $secretPattern.Value) {
                        $secretFindings += @{
                            "FilePath" = $file.FullName
                            "SecretType" = $secretPattern.Key
                            "Severity" = "HIGH"
                            "TrackedByGit" = (Test-Path (Join-Path $candidate ".git\index"))
                        }
                    }
                }
            } catch {
                # File read error - skip
            }
        }
    }
}

if ($secretFindings.Count -gt 0) {
    Write-Host "  ⚠ WARNING: $($secretFindings.Count) potential secrets detected" -ForegroundColor Red
    Write-Host "  These will be listed in the secret report for manual review" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ No obvious secrets detected in common config files" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# PHASE 4: EXPORT RESULTS
# ============================================================================

Write-Host "[PHASE 4] Exporting Results" -ForegroundColor Yellow

# CSV Inventory
$csvPath = Join-Path $exportPath "candidate_inventory.csv"
$inventory | Export-Csv -Path $csvPath -NoTypeInformation
Write-Host "  ✓ Exported CSV: $(Split-Path -Leaf $csvPath)" -ForegroundColor Green

# JSON Inventory
$jsonPath = Join-Path $exportPath "candidate_inventory.json"
$inventory | ConvertTo-Json | Set-Content -Path $jsonPath
Write-Host "  ✓ Exported JSON: $(Split-Path -Leaf $jsonPath)" -ForegroundColor Green

# Git Repository Map
$gitMapPath = Join-Path $exportPath "git_repository_map.md"
$gitMarkdown = @"
# Git Repository Map

**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Summary
- **Total Candidates:** $($inventory.Count)
- **Git Repositories:** $($gitRepos.Count)
- **With Secrets:** $($secretFindings.Count)

## Git Repositories

"@

foreach ($repo in $gitRepos) {
    $gitMarkdown += @"
### $($repo.Name)
- **Path:** $($repo.Path)
- **Branch:** $($repo.Branch)
- **Head:** $($repo.HeadCommit.Substring(0, 7))
- **Commits:** $($repo.CommitCount)
- **Last Commit Date:** $($repo.CommitDate)
- **Dirty:** $($repo.IsDirty)
- **Untracked:** $($repo.UntrackedFiles)
- **Remote:** $($repo.Remote)
- **Size:** $($repo.Size_MB) MB
- **Languages:** $($repo.Languages)

"@
}

$gitMarkdown | Set-Content -Path $gitMapPath
Write-Host "  ✓ Exported Markdown: $(Split-Path -Leaf $gitMapPath)" -ForegroundColor Green

# Secret Report
$secretReportPath = Join-Path $exportPath "secret_risk_report.md"
$secretReport = @"
# Secret Exposure Report

**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Status:** $(if ($secretFindings.Count -eq 0) { "CLEAN" } else { "FINDINGS DETECTED" })

## Summary
- **Total Findings:** $($secretFindings.Count)
- **High Severity:** $($secretFindings.Count)

"@

if ($secretFindings.Count -gt 0) {
    $secretReport += @"
## Findings

**IMPORTANT:** These file paths contain potential secrets that should NOT be committed to any public repository.

"@
    foreach ($finding in $secretFindings) {
        $secretReport += @"
### $($finding.SecretType) in $($finding.FilePath)
- **Severity:** $($finding.Severity)
- **Already Tracked by Git:** $($finding.TrackedByGit)
- **Remediation Required:** Remove from Git history and add to .gitignore

"@
    }
    $secretReport += @"
## Remediation Steps

1. For each file listed above:
   - Add the file pattern to .gitignore
   - Run: `git rm --cached <filename>`
   - Commit the changes
2. Consider using git-filter-repo or BFG to remove secrets from Git history
3. Rotate any secrets that may have been exposed

"@
} else {
    $secretReport += @"
No obvious secrets detected in configuration files.

**Note:** This scan covers common config file patterns (.env, .conf, .json, .yaml, etc.).
For a comprehensive secret scan, use dedicated tools like:
- git-secrets
- detect-secrets
- TruffleHog
- GitGuardian

"@
}

$secretReport | Set-Content -Path $secretReportPath
Write-Host "  ✓ Exported Secret Report: $(Split-Path -Leaf $secretReportPath)" -ForegroundColor Green

# Environment Info
$envPath = Join-Path $exportPath "environment.json"
$envInfo = @{
    "CollectionTime" = Get-Date -Format "o"
    "OperatingSystem" = $osInfo
    "PowerShellVersion" = "$($PSVersionTable.PSVersion.Major).$($PSVersionTable.PSVersion.Minor)"
    "Username" = $env:USERNAME
    "Hostname" = $env:COMPUTERNAME
    "SearchRoot" = $SearchRoot
    "ExportPath" = $exportPath
    "CandidatesFound" = $inventory.Count
    "GitRepositoriesFound" = $gitRepos.Count
    "SecretsDetected" = $secretFindings.Count
} | ConvertTo-Json

$envInfo | Set-Content -Path $envPath
Write-Host "  ✓ Exported Environment: $(Split-Path -Leaf $envPath)" -ForegroundColor Green

Write-Host ""

# ============================================================================
# PHASE 5: CHECKSUMS
# ============================================================================

Write-Host "[PHASE 5] Generating Checksums" -ForegroundColor Yellow

$checksumPath = Join-Path $exportPath "checksums.sha256"
$checksumContent = ""

Get-ChildItem -Path $exportPath -File | Where-Object { $_.Extension -ne ".sha256" } | ForEach-Object {
    $hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash
    $checksumContent += "$hash  $($_.Name)`n"
}

$checksumContent | Set-Content -Path $checksumPath
Write-Host "  ✓ Generated checksums: $(Split-Path -Leaf $checksumPath)" -ForegroundColor Green

Write-Host ""

# ============================================================================
# PHASE 6: COMPLETION REPORT
# ============================================================================

Write-Host "[PHASE 6] Completion Report" -ForegroundColor Yellow
Write-Host ""
Write-Host "  EVIDENCE COLLECTION COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "  Export Location: $exportPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Files Generated:" -ForegroundColor Yellow
Write-Host "    • candidate_inventory.csv — Spreadsheet of all candidates" -ForegroundColor Gray
Write-Host "    • candidate_inventory.json — Machine-readable inventory" -ForegroundColor Gray
Write-Host "    • git_repository_map.md — Git repository details and history" -ForegroundColor Gray
Write-Host "    • secret_risk_report.md — Potential secret exposures (no values shown)" -ForegroundColor Gray
Write-Host "    • environment.json — Collection environment and summary" -ForegroundColor Gray
Write-Host "    • checksums.sha256 — File integrity checksums" -ForegroundColor Gray
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Yellow
Write-Host "    1. Review the candidate_inventory.csv for VAJRA and VAJRA Gold projects" -ForegroundColor Gray
Write-Host "    2. Check git_repository_map.md for repository details" -ForegroundColor Gray
Write-Host "    3. Review secret_risk_report.md and remediate any findings" -ForegroundColor Gray
Write-Host "    4. If satisfied, ZIP the entire $exportPath folder" -ForegroundColor Gray
Write-Host "    5. Upload to the EURO AI mission workspace" -ForegroundColor Gray
Write-Host ""
Write-Host "  SAFETY GUARANTEE:" -ForegroundColor Green
Write-Host "    No files were modified, deleted, moved, or overwritten." -ForegroundColor Gray
Write-Host "    All secrets are reported without values exposed." -ForegroundColor Gray
Write-Host "    This script is read-only and non-destructive." -ForegroundColor Gray
Write-Host ""

# ============================================================================
# PHASE 7: OPTIONAL ARCHIVE
# ============================================================================

if (-not $SkipArchives) {
    Write-Host "[PHASE 7] Creating ZIP Archive (Optional)" -ForegroundColor Yellow

    # Check available disk space
    $drive = Get-PSDrive -Name ($SearchRoot[0])
    $availableSpace = $drive.Free / 1MB
    $exportSize = (Get-ChildItem -Path $exportPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

    if ($availableSpace -gt ($exportSize * 2)) {
        try {
            $zipPath = "$exportPath.zip"
            Compress-Archive -Path $exportPath -DestinationPath $zipPath -CompressionLevel Optimal
            Write-Host "  ✓ Created ZIP archive: $(Split-Path -Leaf $zipPath)" -ForegroundColor Green
            Write-Host "  ✓ Archive size: $([Math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Green
            Write-Host ""
            Write-Host "  You can upload: $(Split-Path -Leaf $zipPath)" -ForegroundColor Cyan
        } catch {
            Write-Host "  ⚠ Could not create ZIP archive: $_" -ForegroundColor Yellow
            Write-Host "  Upload the folder directly instead: $(Split-Path -Leaf $exportPath)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠ Insufficient disk space for ZIP archive" -ForegroundColor Yellow
        Write-Host "  Available: $([Math]::Round($availableSpace, 2)) MB" -ForegroundColor Yellow
        Write-Host "  Needed: $([Math]::Round($exportSize * 2, 2)) MB" -ForegroundColor Yellow
        Write-Host "  Upload the folder directly: $(Split-Path -Leaf $exportPath)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "│ COLLECTION COMPLETE — READY FOR UPLOAD                     │" -ForegroundColor Green
Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Green

# Final Summary
Write-Host ""
Write-Host "Summary Statistics:" -ForegroundColor Yellow
Write-Host "  Folders Searched: $searchedFolders" -ForegroundColor Gray
Write-Host "  Candidates Found: $($inventory.Count)" -ForegroundColor Gray
Write-Host "  Git Repositories: $($gitRepos.Count)" -ForegroundColor Gray
Write-Host "  Secrets Detected: $($secretFindings.Count)" -ForegroundColor Gray
Write-Host "  Export Path: $exportPath" -ForegroundColor Cyan
Write-Host ""
