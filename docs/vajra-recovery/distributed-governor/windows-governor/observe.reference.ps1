# =============================================================================
# Windows Governor — Read-Only Observation Reference Skeleton
# =============================================================================
# STATUS: UNVERIFIED REFERENCE. This script has NOT been executed or tested from
#         the cloud environment. Validate it on the Windows workstation before
#         relying on its output. It is a starting point, not a certified tool.
#
# GUARANTEES (by construction):
#   * READ ONLY  — it only reads; it never writes to, moves, renames, or deletes
#                  anything under the observed roots, and starts/stops no process.
#   * NO SECRET VALUES — secrets are reported by presence/type only (see below).
#   * NO FABRICATION — anything not observed is emitted as $null / "unknown".
#
# It emits ONE evidence bundle (evidence-bundle.schema.json shape) to the
# evidence path. It does NOT push; publishing (commit/push, hash-chaining
# against the previous bundle) is a separate, deliberate step (ARCH-02).
#
# Aligns with the existing read-only precedent: tools/windows/Collect-VajraEvidence.ps1
# -----------------------------------------------------------------------------
param(
  [string[]] $Roots        = @('C:\vajra', 'C:\vajra_gold'),
  [string]   $EvidenceDir  = 'C:\VAJRA_EVIDENCE_EXPORT\bundles',
  [int]      $Sequence     = 0,          # caller supplies monotonic sequence
  [string]   $PrevHash     = $null       # bundle_hash of sequence-1, or $null
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# --- helpers -----------------------------------------------------------------
function Now-Iso { (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }

# Secret DETECTION only — never emits values. Returns type:count strings.
$secretPatterns = @{
  'aws_key'      = 'AKIA[0-9A-Z]{16}'
  'private_key'  = '-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----'
  'generic_token'= '(?i)(api[_-]?key|secret|token|password)\s*[:=]'
}
function Scrub-SecretsByType([string]$path) {
  $findings = @{}
  Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -lt 1MB -and $_.Extension -match '\.(env|json|ya?ml|ini|cfg|config|txt|ps1|py)$' } |
    ForEach-Object {
      $text = Get-Content -Raw -ErrorAction SilentlyContinue $_.FullName
      if ($null -ne $text) {
        foreach ($k in $secretPatterns.Keys) {
          if ($text -match $secretPatterns[$k]) { $findings[$k] = ($findings[$k] + 1) }
        }
      }
    }
  return ($findings.GetEnumerator() | ForEach-Object { "$($_.Key):$($_.Value)" })
}

# READ-ONLY git metadata via porcelain (no fetch/pull/checkout).
function Observe-Repo([string]$root) {
  if (-not (Test-Path $root)) {
    return [ordered]@{ capability_id = (Split-Path $root -Leaf); status = 'absent'; observed_at = (Now-Iso); last_artifact_at = $null; evidence_ref = $root }
  }
  $isGit = Test-Path (Join-Path $root '.git')
  $head  = if ($isGit) { (git -C $root rev-parse HEAD 2>$null) } else { $null }
  $dirty = if ($isGit) { [bool]((git -C $root status --porcelain 2>$null)) } else { $null }
  return [ordered]@{
    capability_id    = (Split-Path $root -Leaf)
    status           = 'unverified'      # readable, not yet health-checked
    observed_at      = (Now-Iso)
    last_artifact_at = $null             # UNKNOWN until artifact freshness observed
    evidence_ref     = ($head ? "HEAD=$head dirty=$dirty" : "path=$root git=$isGit")
  }
}

# --- observe (READ ONLY) -----------------------------------------------------
$statuses = @()
$secretFindings = @()
foreach ($r in $Roots) {
  $statuses      += (Observe-Repo $r)
  $secretFindings += (Scrub-SecretsByType $r)
}

# NOTE: collectors, schedulers, paper-trading, logs, system_health observers are
# intentionally left as TODO stubs — fill them in on the workstation where their
# real entry points are known. Do NOT invent statuses for them here; emit 'unknown'.

# --- assemble bundle (schema-shaped; hashing/signing done by publisher) ------
$bundle = [ordered]@{
  schema_version = '1.0.0'
  bundle_id      = [guid]::NewGuid().ToString()
  publisher      = [ordered]@{ governor = 'windows_governor'; host_fingerprint = ''; collector_version = 'reference-0' }
  sequence       = $Sequence
  produced_at    = (Now-Iso)
  observation_window = $null
  integrity      = [ordered]@{ prev_bundle_hash = $PrevHash; bundle_hash = 'TO_BE_COMPUTED_BY_PUBLISHER'; hash_algo = 'sha256'; signature = $null }
  capability_statuses = $statuses
  observations   = @()                  # empty = nothing measurable this pass (legitimate)
  anomalies      = $null
  self_declared_confidence = 'measured' # of the statuses actually observed
  secret_exposure_guard = [ordered]@{ scrubbed = $true; secret_findings_by_type = $secretFindings }
}

New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
$out = Join-Path $EvidenceDir ("{0:D6}-{1}.json" -f $Sequence, $bundle.bundle_id)
$bundle | ConvertTo-Json -Depth 8 | Set-Content -Path $out -Encoding UTF8
Write-Host "Wrote evidence bundle (unverified reference): $out"
Write-Host "NEXT: compute bundle_hash over canonical(bundle - bundle_hash) || prev_bundle_hash, then commit+push (ARCH-02)."
