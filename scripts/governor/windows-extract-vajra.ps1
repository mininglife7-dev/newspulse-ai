<#
  windows-extract-vajra.ps1 — Windows Governor VAJRA discovery + export helper.

  PURPOSE: the Founder's ONE command on the Windows machine. It (read-only) verifies the
  VAJRA repos, inventories candidate return/backtest files, and writes a manifest the Cloud
  Governor can act on. It does NOT guess a returns schema or fabricate data — it surfaces
  candidates and tells you the exact next step.

  STATUS: authored by Cloud Governor; NOT executed on Windows (Cloud has no Windows access).
  Review before running. Read-only against C:\VAJRA — it never modifies VAJRA.

  USAGE (from the repo root on Windows, PowerShell):
    ./scripts/governor/windows-extract-vajra.ps1
  Then follow the printed NEXT STEP.
#>

$ErrorActionPreference = 'Stop'
$paths = @('C:\VAJRA', 'C:\VAJRA Gold')
$outDir = Join-Path (Get-Location) 'data/vajra'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$manifest = [ordered]@{
  generated_utc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  host          = $env:COMPUTERNAME
  repos         = @()
  candidates    = @()
}

foreach ($p in $paths) {
  $exists = Test-Path $p
  $repo = [ordered]@{ path = $p; exists = $exists; is_git = $false; commit_count = $null; latest_commit = $null }
  if ($exists) {
    if (Test-Path (Join-Path $p '.git')) {
      $repo.is_git = $true
      try {
        $repo.commit_count  = (git -C $p rev-list --count HEAD).Trim()
        $repo.latest_commit = (git -C $p log -1 --format='%h %ci %s').Trim()
      } catch { }
    }
    # read-only inventory of candidate data files (returns / equity / pnl / backtests)
    $patterns = '*return*','*equity*','*pnl*','*backtest*','*performance*','*trades*','*.csv'
    foreach ($pat in $patterns) {
      Get-ChildItem -Path $p -Recurse -File -Filter $pat -ErrorAction SilentlyContinue |
        Select-Object -First 200 | ForEach-Object {
          $manifest.candidates += [ordered]@{
            file = $_.FullName; size_kb = [math]::Round($_.Length/1KB,1); modified = $_.LastWriteTimeUtc.ToString('yyyy-MM-dd')
          }
        }
    }
  }
  $manifest.repos += $repo
}

# de-dup candidates by path
$manifest.candidates = $manifest.candidates | Sort-Object file -Unique
$manifestPath = Join-Path $outDir 'vajra-manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host "===== VAJRA DISCOVERY ====="
foreach ($r in $manifest.repos) {
  Write-Host ("  {0} : exists={1} git={2} commits={3}" -f $r.path, $r.exists, $r.is_git, $r.commit_count)
  if ($r.latest_commit) { Write-Host ("      latest: {0}" -f $r.latest_commit) }
}
Write-Host ("  candidate data files found: {0}" -f $manifest.candidates.Count)
$manifest.candidates | Select-Object -First 20 | ForEach-Object { Write-Host ("      {0}  ({1} KB, {2})" -f $_.file, $_.size_kb, $_.modified) }
Write-Host "  manifest written: $manifestPath"
Write-Host ""
Write-Host "===== NEXT STEP (choose the daily net-return source) ====="
Write-Host "  1) Identify the file holding VAJRA's DAILY NET RETURNS."
Write-Host "  2) Export/normalize it to:  data/vajra/returns-$(Get-Date -Format yyyyMMdd).csv"
Write-Host "     with a header row exactly: date,net_return   (date=YYYY-MM-DD, net_return=decimal e.g. 0.008)"
Write-Host "  3) Validate + analyze locally (Node required):"
Write-Host "       node scripts/governor/analyze-returns.mjs data/vajra/returns-$(Get-Date -Format yyyyMMdd).csv"
Write-Host "  4) Commit the CSV (NO secrets/credentials/account numbers) and push, or open a PR."
Write-Host "  Cloud Governor will re-validate and produce the North-Star verdict on the real series."
