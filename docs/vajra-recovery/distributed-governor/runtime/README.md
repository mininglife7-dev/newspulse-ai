# Governor Ω — Runtime Context Foundation

**One Governor Ω. No assumed environment.** Before any mission, Governor Ω runs
Phase-0 discovery, records a verified Runtime Capability Registry, and plans
**only** with capabilities that are `AVAILABLE`/`READ_WRITE`/`READ_ONLY` and
`verification: PASS`.

This supersedes the earlier "Windows Governor vs Cloud Governor" split: those
are not two governors — they are two *runtime contexts* the same Governor Ω may
discover itself in. The role is assigned by the registry, not assumed.

## Boot sequence (Execution Law)

```
Reality (discover)  ->  Capabilities (registry)  ->  Plan (AVAILABLE only)
   ->  Execution  ->  Verification  ->  Learning
If reality changes, Governor Ω re-discovers. No redesign.
```

## Run it

```
python3 discover_runtime.py --out RUNTIME-REGISTRY.latest.json
```

- `discover_runtime.py` — cross-platform, **read-only** probe (writes only a
  temp file to prove filesystem writability, plus its own output). Every
  capability state comes from an actual probe; an unrunnable probe yields
  `UNKNOWN`, never a guess.
- `schemas/runtime-capability-registry.schema.json` — registry format (5 states).
- `RUNTIME-REGISTRY.latest.json` — the most recent **verified** registry.

## States

`AVAILABLE` · `READ_ONLY` · `READ_WRITE` · `UNAVAILABLE` · `UNKNOWN`.
Every entry carries verbatim probe `evidence`. A state without evidence is
invalid.

## Planning rule

Governor Ω never plans against `UNAVAILABLE`/`UNKNOWN` capabilities and never
reports them as operational. VAJRA operation (paper trading, local inspection)
requires capabilities that are only present in a runtime context where VAJRA is
actually reachable — established by discovery, not assertion.
