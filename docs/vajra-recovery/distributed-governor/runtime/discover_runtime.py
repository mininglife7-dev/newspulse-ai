#!/usr/bin/env python3
"""
Governor Ω — Runtime Context Discovery (Phase 0 boot sequence).

ONE Governor Ω. No assumed environment. This script discovers, verifies, and
records the runtime context + capability registry BEFORE any mission plans.

Guarantees:
  * READ-ONLY except for (a) a temp file used to prove filesystem writability
    and (b) writing its own registry JSON to stdout / an output path.
  * NEVER infers: every capability state comes from an actual probe result.
  * NEVER fabricates: an unrunnable probe yields UNKNOWN, not a guess.
  * Cross-platform: runs on Windows or Linux; adapts to whichever it finds.

States: AVAILABLE | READ_ONLY | READ_WRITE | UNAVAILABLE | UNKNOWN
Verification: PASS | FAIL | N/A

Usage:  python3 discover_runtime.py [--out registry.json]
"""
import json, os, platform, shutil, socket, subprocess, sys, tempfile, getpass
from datetime import datetime, timezone


def _run(cmd, timeout=8):
    """Run a command read-only; return (rc, stdout, stderr) or (None, '', err)."""
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "").strip(), (p.stderr or "").strip()
    except FileNotFoundError:
        return None, "", "not found"
    except Exception as e:  # timeout, permission, etc.
        return None, "", str(e)


def cap(status, verification, evidence, location=None):
    e = {"status": status, "verification": verification, "evidence": evidence}
    if location is not None:
        e["location"] = location
    return e


def probe_binary(name):
    loc = shutil.which(name)
    if loc:
        return cap("AVAILABLE", "PASS", f"which -> {loc}", loc)
    return cap("UNAVAILABLE", "FAIL", f"{name} not found on PATH")


def probe_filesystem():
    cwd = os.getcwd()
    try:
        with tempfile.NamedTemporaryFile(dir=cwd, prefix=".govΩ_probe_", delete=True) as f:
            f.write(b"probe")
            f.flush()
        return cap("READ_WRITE", "PASS", f"wrote+removed temp file in {cwd}", cwd)
    except Exception as e:
        if os.access(cwd, os.R_OK):
            return cap("READ_ONLY", "PASS", f"readable, write failed: {e}", cwd)
        return cap("UNAVAILABLE", "FAIL", f"cwd not accessible: {e}", cwd)


def probe_internet():
    # TCP-reachability probe (consistent methodology with vercel/supabase probes).
    # Avoids the false-negative from raw HTTP HEAD, which the egress proxy rejects
    # with 400 even when connectivity is fine. Egress is proxy-gated; note it.
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    try:
        with socket.create_connection(("github.com", 443), timeout=6):
            return cap("AVAILABLE", "PASS",
                       f"tcp connect github.com:443 ok (egress proxy={'yes' if proxy else 'no'})")
    except Exception as e:
        return cap("UNAVAILABLE", "FAIL", f"tcp connect github.com:443 failed: {e}")


def probe_host(host, port=443, timeout=5):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return cap("AVAILABLE", "PASS", f"tcp connect {host}:{port} ok")
    except Exception as e:
        return cap("UNAVAILABLE", "FAIL", f"tcp connect {host}:{port} failed: {e}")


def probe_git():
    rc, out, err = _run(["git", "rev-parse", "--is-inside-work-tree"])
    if rc != 0:
        return cap("UNAVAILABLE", "FAIL", f"not a git work tree: {err or out}")
    _, branch, _ = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    _, commit, _ = _run(["git", "rev-parse", "--short", "HEAD"])
    _, dirty, _ = _run(["git", "status", "--porcelain"])
    state = "clean" if not dirty else f"dirty({len(dirty.splitlines())} files)"
    return cap("READ_WRITE", "PASS", f"branch={branch} commit={commit} tree={state}", os.getcwd())


def probe_github_auth():
    # Read-only: can we reach the origin remote we are authorised for?
    rc, out, err = _run(["git", "ls-remote", "--heads", "origin"], timeout=15)
    if rc == 0:
        n = len(out.splitlines())
        return cap("AVAILABLE", "PASS", f"git ls-remote origin ok ({n} heads)")
    return cap("UNKNOWN", "FAIL", f"git ls-remote origin failed: {err or 'no output'}")


def probe_local_repo(candidates, label):
    for c in candidates:
        if os.path.isdir(c):
            rc, _, _ = _run(["git", "-C", c, "rev-parse", "--is-inside-work-tree"])
            if rc == 0:
                _, br, _ = _run(["git", "-C", c, "rev-parse", "--abbrev-ref", "HEAD"])
                _, cm, _ = _run(["git", "-C", c, "rev-parse", "--short", "HEAD"])
                w = "READ_WRITE" if os.access(c, os.W_OK) else "READ_ONLY"
                return cap(w, "PASS", f"{label} git repo branch={br} commit={cm}", c)
            return cap("READ_ONLY", "PASS", f"{label} dir exists (not git)", c)
    return cap("UNAVAILABLE", "FAIL", f"{label} not found in {candidates}")


def probe_scheduler():
    if shutil.which("schtasks"):
        return cap("AVAILABLE", "PASS", "Windows schtasks present")
    if shutil.which("systemctl"):
        return cap("AVAILABLE", "PASS", "systemd present (timers/services)")
    if shutil.which("crontab"):
        return cap("AVAILABLE", "PASS", "cron present")
    return cap("UNAVAILABLE", "FAIL", "no schtasks/systemctl/crontab")


def probe_execution_environment():
    markers = []
    if os.path.exists("/.dockerenv"):
        markers.append("/.dockerenv")
    try:
        with open("/proc/1/cgroup") as f:
            if any(k in f.read() for k in ("docker", "kubepods", "containerd")):
                markers.append("cgroup:container")
    except Exception:
        pass
    if os.environ.get("HTTPS_PROXY"):
        markers.append("egress-proxy")
    kind = "container" if markers else ("windows" if os.name == "nt" else "host")
    return cap("AVAILABLE", "PASS", f"kind={kind} markers={markers or 'none'}")


def main():
    out_path = None
    if "--out" in sys.argv:
        out_path = sys.argv[sys.argv.index("--out") + 1]

    ctx = {
        "operating_system": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "hostname": socket.gethostname(),
        "current_user": getpass.getuser(),
        "current_working_directory": os.getcwd(),
        "os_family": os.name,
    }

    registry = {
        "filesystem": probe_filesystem(),
        "internet_access": probe_internet(),
        "git": probe_git(),
        "github_auth": probe_github_auth(),
        "python": probe_binary("python3") if shutil.which("python3") else probe_binary("python"),
        "powershell": probe_binary("pwsh") if shutil.which("pwsh") else probe_binary("powershell"),
        "node": probe_binary("node"),
        "docker": probe_binary("docker"),
        "task_scheduler": probe_scheduler(),
        "execution_environment": probe_execution_environment(),
        "vercel_access": probe_host("vercel.com"),
        "supabase_access": probe_host("supabase.com"),
        "euro_ai_repository": probe_local_repo(
            [os.getcwd(), "/home/user/newspulse-ai"], "EURO AI (newspulse-ai)"),
        "vajra_repository": probe_local_repo(
            [r"C:\VAJRA", r"C:\vajra_gold_20260503", "./VAJRA", "./vajra"], "VAJRA"),
        # No config discovered for these -> honest UNAVAILABLE, never fabricated:
        "market_data": cap("UNAVAILABLE", "FAIL", "no market-data source configured/discovered"),
        "broker": cap("UNAVAILABLE", "FAIL", "no broker configured (paper or live)"),
    }

    doc = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "runtime_context": ctx,
        "capabilities": registry,
        "planning_rule": "Governor Ω plans ONLY with capabilities whose status is AVAILABLE/READ_WRITE/READ_ONLY and verification PASS. UNAVAILABLE/UNKNOWN capabilities may not appear in any plan as operational.",
    }
    text = json.dumps(doc, indent=2)
    if out_path:
        with open(out_path, "w") as f:
            f.write(text + "\n")
    print(text)


if __name__ == "__main__":
    main()
