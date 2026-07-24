-- Execution Reality Engine — Immutable Raw Observation Store
-- ---------------------------------------------------------------------------
-- Founder directive: "Implement immutable raw observation storage" +
-- "Implement append-only historical preservation."
--
-- Design goals:
--   1. Append-only: no UPDATE, no DELETE of raw rows, ever.
--   2. Immutable + tamper-evident: per-row hash + hash chain.
--   3. Provenance and confidence travel WITH the raw payload (never stripped).
--   4. Raw is sacred: corrections are new rows, never edits (see corrections view).
--
-- Dialect: PostgreSQL. Portability notes for SQLite/DuckDB are inline (-- PORT:).
-- Thresholds that depend on VAJRA's real cadence are NOT encoded here; they
-- live in capability contracts and stay UNKNOWN until calibrated.
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS execution_reality;

-- Raw observations: one row per captured observation, validated against the
-- JSON Schemas before insert (validation happens in the writer; see SPEC-05).
CREATE TABLE IF NOT EXISTS execution_reality.raw_observations (
    seq                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- append order
    observation_id     TEXT        NOT NULL UNIQUE,                      -- R-ID-1 dedupe
    observation_type   TEXT        NOT NULL
        CHECK (observation_type IN ('quote','trade','order_lifecycle','fill','rejection')),
    schema_version     TEXT        NOT NULL,
    instrument_symbol  TEXT        NOT NULL,
    venue              TEXT        NOT NULL,
    event_timestamp    TIMESTAMPTZ NOT NULL,                            -- source/exchange time
    ingest_timestamp   TIMESTAMPTZ NOT NULL,                            -- capture time
    stored_at          TIMESTAMPTZ NOT NULL DEFAULT now(),              -- DB write time
    confidence_level   TEXT        NOT NULL
        CHECK (confidence_level IN ('measured','derived','modeled','unknown')),
    provenance_source  TEXT        NOT NULL,
    payload            JSONB       NOT NULL,                            -- full validated envelope+body
    -- Tamper-evidence: hash of this row's canonical content, chained to prior row.
    prev_hash          TEXT,                                           -- row_hash of seq-1 (NULL for first)
    row_hash           TEXT        NOT NULL,                            -- H(canonical(payload) || prev_hash)
    -- Structural sanity (empirical values are NOT asserted here):
    CHECK (ingest_timestamp >= event_timestamp - INTERVAL '5 seconds')  -- clock-skew tolerance; see SPEC-05 R-TS-3
);

-- PORT: SQLite -> use INTEGER PRIMARY KEY AUTOINCREMENT + TEXT timestamps (ISO8601, UTC).
-- PORT: DuckDB -> use a SEQUENCE for seq; JSONB -> JSON.

CREATE INDEX IF NOT EXISTS idx_raw_obs_instr_time
    ON execution_reality.raw_observations (instrument_symbol, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_obs_type_time
    ON execution_reality.raw_observations (observation_type, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_obs_ingest
    ON execution_reality.raw_observations (ingest_timestamp);

-- --- Append-only enforcement --------------------------------------------------
-- Block UPDATE and DELETE at the trigger level so even a privileged writer path
-- cannot mutate history by accident.
CREATE OR REPLACE FUNCTION execution_reality.block_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'raw_observations is append-only: % is prohibited', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_update ON execution_reality.raw_observations;
CREATE TRIGGER trg_block_update BEFORE UPDATE ON execution_reality.raw_observations
    FOR EACH ROW EXECUTE FUNCTION execution_reality.block_mutation();

DROP TRIGGER IF EXISTS trg_block_delete ON execution_reality.raw_observations;
CREATE TRIGGER trg_block_delete BEFORE DELETE ON execution_reality.raw_observations
    FOR EACH ROW EXECUTE FUNCTION execution_reality.block_mutation();
-- Operationally also: GRANT INSERT, SELECT only to the writer role; never UPDATE/DELETE.
-- PORT: SQLite -> CREATE TRIGGER ... BEFORE UPDATE/DELETE ... SELECT RAISE(ABORT,'append-only').

-- --- Capability heartbeat-of-output (freshness) ------------------------------
-- Records the last time each capability actually produced correct output.
-- This is the substrate for capability monitoring (not process heartbeat).
CREATE TABLE IF NOT EXISTS execution_reality.capability_output_log (
    capability_id        TEXT        NOT NULL,
    last_output_at       TIMESTAMPTZ NOT NULL,
    last_output_seq      BIGINT      REFERENCES execution_reality.raw_observations(seq),
    correctness_passed   BOOLEAN     NOT NULL,
    evidence             TEXT,
    PRIMARY KEY (capability_id, last_output_at)
);

-- --- Quarantine (invalid records are preserved, never dropped) ----------------
-- SPEC-05: rejected observations are routed here with a reason. Raw truth is
-- never silently discarded — absence of data must be visible.
CREATE TABLE IF NOT EXISTS execution_reality.quarantine (
    seq              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    failed_rule_ids  TEXT[]      NOT NULL,   -- e.g. {R-PX-2,R-TS-3}
    reason           TEXT        NOT NULL,
    raw_text         TEXT        NOT NULL    -- verbatim payload as received
);

-- --- Corrections (append-only supersession, raw stays intact) -----------------
-- A correction never edits a raw row; it appends a pointer. Readers resolve the
-- latest non-superseded record per observation_id.
CREATE TABLE IF NOT EXISTS execution_reality.corrections (
    seq                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supersedes_obs_id  TEXT        NOT NULL,
    corrected_obs_id   TEXT        NOT NULL,
    reason             TEXT        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (supersedes_obs_id, corrected_obs_id)
);

-- Effective view: raw rows minus any that have been superseded by a correction.
CREATE OR REPLACE VIEW execution_reality.effective_observations AS
SELECT r.*
FROM execution_reality.raw_observations r
WHERE NOT EXISTS (
    SELECT 1 FROM execution_reality.corrections c
    WHERE c.supersedes_obs_id = r.observation_id
);
