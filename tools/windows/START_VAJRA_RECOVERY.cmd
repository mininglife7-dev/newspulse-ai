@echo off
REM ============================================================================
REM VAJRA CLOUD FORTRESS — EVIDENCE COLLECTOR LAUNCHER
REM Safe, Read-Only Windows Forensic Discovery
REM ============================================================================

setlocal enabledelayedexpansion

cls
echo.
echo ┌─────────────────────────────────────────────────────────────┐
echo │ VAJRA CLOUD FORTRESS — EVIDENCE COLLECTOR                  │
echo │ Windows Forensic Discovery Tool                            │
echo └─────────────────────────────────────────────────────────────┘
echo.

REM Determine the script directory
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%Collect-VajraEvidence.ps1"

REM Verify PowerShell script exists
if not exist "%PS_SCRIPT%" (
    echo ERROR: Cannot find Collect-VajraEvidence.ps1
    echo Expected location: %PS_SCRIPT%
    echo.
    pause
    exit /b 1
)

echo WHAT THIS TOOL DOES:
echo.
echo  • Searches your C: drive for VAJRA and VAJRA Gold projects
echo  • Inspects Git repositories and their history
echo  • Detects potential secret exposures (without showing values)
echo  • Creates an inventory of findings
echo  • Exports results to C:\VAJRA_EVIDENCE_EXPORT\[timestamp]
echo.
echo  READ-ONLY: No files will be modified, deleted, or moved.
echo.
echo.
echo WHAT YOU SHOULD DO AFTER:
echo.
echo  1. Wait for the scan to complete (may take 30-60 seconds)
echo  2. Review the generated report files
echo  3. Check candidate_inventory.csv for VAJRA and VAJRA Gold folders
echo  4. Review the secret_risk_report.md for any findings
echo  5. If satisfied, ZIP or upload the VAJRA_EVIDENCE_EXPORT folder
echo  6. Upload results to the mission workspace
echo.
echo ═════════════════════════════════════════════════════════════
echo.

REM Launch PowerShell
echo Starting evidence collection...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

REM After completion
echo.
echo ═════════════════════════════════════════════════════════════
echo.
echo COLLECTION COMPLETE
echo.
echo Check your VAJRA_EVIDENCE_EXPORT folder for the results.
echo.

pause
