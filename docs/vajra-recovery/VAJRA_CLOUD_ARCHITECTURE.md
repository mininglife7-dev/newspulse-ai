# VAJRA Cloud Architecture — Consolidated & Isolated Design

**Status:** Framework established; awaiting Windows evidence for implementation details  
**Date:** 2026-07-22  
**Mission:** OPERATION VAJRA CLOUD FORTRESS — Phase 7

---

## Executive Summary

VAJRA is a sophisticated algorithmic trading research platform. Unlike EURO AI (governance platform), VAJRA requires:

1. **Stateful execution** — Persistent workers, not serverless functions
2. **Real-time market data** — Low-latency feeds, continuous ingestion
3. **Paper trading safety** — Hard limits, kill switches, order isolation
4. **Audit trails** — Every decision logged and verifiable
5. **Separation from EURO AI** — Different databases, deployments, credentials

This document defines VAJRA as a separate cloud platform, architecturally independent from EURO AI while coexisting in the same organization.

---

## Component Architecture

### Layer 1: Cockpit & Dashboard

**Purpose:** User interface for strategy monitoring, performance analysis, and configuration.

**Technology:**

- React 19 (matching EURO AI standards)
- Vercel serverless deployment (free tier compatible)
- Authenticated via OAuth2 or cookie-based SSR

**Features:**

- Strategy performance dashboard (returns, Sharpe, max drawdown)
- Paper trading account status and balance
- Market data subscription status
- Recent trades and execution history
- Risk limit monitoring (real-time)
- Backtest results and comparison
- Deployment and version history

**Deployment:** Vercel preview + production environments

**Access Control:**

- Authenticated users only
- Multi-workspace support (research team, founder, external collaborators)
- Row-level security (RLS) via workspace_id (same pattern as EURO AI)

---

### Layer 2: Authenticated API

**Purpose:** Secure communication between cockpit, workers, and storage.

**Technology:**

- Next.js 16 API routes (or standalone Express server)
- JWT token authentication
- HTTPS only (enforced via middleware)
- Rate limiting (prevent API abuse)

**Endpoints:**

- `GET /api/v1/strategies` — List deployed strategies
- `POST /api/v1/strategies` — Create strategy
- `GET /api/v1/strategies/:id` — Get strategy details
- `GET /api/v1/trades` — List executed trades
- `GET /api/v1/backtest/:id` — Get backtest results
- `GET /api/v1/market-data/status` — Market data health
- `POST /api/v1/config` — Update configuration
- `GET /api/v1/health` — Health check endpoint

**Rate Limits:**

- 1,000 requests/hour per user (reasonable for monitoring)
- 100 requests/hour for order placement endpoints (stricter)
- 10 requests/hour for admin configuration (very strict)

**Request Logging:**

- All API calls logged to audit database
- User ID, timestamp, endpoint, parameters (no values), response status
- 90-day retention minimum

---

### Layer 3: Research Engine

**Purpose:** Backtesting, hypothesis validation, and strategy development.

**Technology:**

- Python (NumPy, Pandas, backtrader or similar)
- Cloud function or container (GCP Cloud Run, AWS Lambda, or similar)
- Triggered via API or scheduled

**Capabilities:**

- Load historical OHLCV data
- Apply technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, etc.)
- Execute backtests against historical data
- Calculate performance metrics (returns, Sharpe, max drawdown, win rate)
- Generate CSV/JSON reports
- Compare multiple strategies
- Optimize parameters (limited scope to prevent overfitting)

**Security:**

- No live market access
- No real credentials stored
- Sandbox data sources only
- Execution time limits (30 minutes max per backtest)

**Storage:**

- Input: Strategy code (read-only ZIP)
- Output: Backtest results (CSV, JSON, images)
- Lifecycle: Results retained 30 days, then archived

---

### Layer 4: Paper Trading Engine

**Purpose:** Execute strategy logic against live market data, without real money.

**Technology:**

- Persistent worker (not serverless; serverless kills state between invocations)
- Architecture: Run on Heroku (free tier), Railway, or similar long-running service
- Language: Python or TypeScript (match existing VAJRA language)
- Database: PostgreSQL (paper trading positions, order queue, execution log)

**Workflow:**

```
1. Load strategy configuration from database
2. Fetch latest market data (every tick or interval)
3. Calculate signal (indicator value, decision)
4. Compare signal against position limits:
   - Max position size (% of account)
   - Max drawdown (% of account)
   - Daily loss limit
   - Per-trade max loss
5. If signal passes limits, queue order
6. Log order to audit trail
7. Execute order against paper trading account
8. Record trade execution (timestamp, price, size, execution price)
9. Update position state
10. Repeat from step 2
```

**Kill Switches (Hard Limits):**

- Maximum position size: Enforced at database layer
- Daily loss limit: Checked before order execution
- Max drawdown: Monitored; close positions if breached
- Time-based: Stop trading after market close (prevent overnight gap risk)
- Signal validation: Reject orders with invalid signals
- Rate limiting: Max N orders per minute (prevent bad logic runaway)

**Order Isolation:**

- Paper trading account completely separate from real money (different database, different API keys)
- Broker connection uses sandbox/paper trading API endpoints only
- No real order placement possible without explicit code change + review

**Persistent State:**

- Strategy state (position, average cost, unrealized P&L)
- Market data cache (last N ticks)
- Order queue (pending orders)
- Execution history (all trades)
- Account balance and equity
- Performance metrics (daily, weekly, monthly returns)

---

### Layer 5: Market Data Collector

**Purpose:** Continuous ingestion of OHLCV data from broker APIs or data sources.

**Technology:**

- Persistent worker or scheduled task
- Data source: Broker API (IB, OANDA, Binance, etc.) or data vendor
- Frequency: Real-time (tick) or interval (1-minute bars, 5-min bars)

**Workflow:**

```
1. Connect to market data source (WebSocket or REST polling)
2. Subscribe to symbols (as configured in strategy)
3. Receive price ticks / OHLCV bars
4. Validate data (sanity checks: no gaps, correct order)
5. Store to time-series database or PostgreSQL
6. Publish to message queue (Redis pub/sub, Kafka, or direct DB query)
7. Notify workers of new data (if using pub/sub)
```

**Data Quality:**

- Check for duplicates (same tick received twice)
- Check for gaps (missing ticks)
- Check for outliers (price spike > 10% without news)
- Log all anomalies
- Fallback to previous close if data missing

**Storage:**

- Format: OHLCV (open, high, low, close, volume)
- Time resolution: 1-minute bars minimum (for backtesting) + tick data for real-time
- Retention: 2 years of 1-minute bars (small storage)
- Symbols: Configurable per strategy

**Multiple Data Sources:**

- Primary: Broker API (live trading accuracy)
- Secondary: Data vendor (historical, more symbols)
- Fallback: Yahoo Finance or Alpha Vantage (if primary unavailable)

---

### Layer 6: Scheduler

**Purpose:** Trigger periodic tasks (strategy initialization, market open/close, reports).

**Technology:**

- Cron service (built into persistent worker or external scheduler)
- APScheduler (Python) or node-schedule (TypeScript)

**Tasks:**

- Daily: Initialize strategy (reset order count, update parameters)
- Hourly: Generate performance report
- At market close: Save end-of-day state, close open positions
- At market open: Load strategy, start workers
- Weekly: Generate performance summary
- Monthly: Archive data, generate tax-relevant reports

---

### Layer 7: Evidence Ledger

**Purpose:** Immutable audit trail of every decision and action.

**Technology:**

- PostgreSQL table: `trading_evidence_log`
- Columns: timestamp, strategy_id, action_type, signal_value, decision, order_id, price, size, execution_price, p&l, reason, user_id

**Entry Types:**

- Signal generated (indicator value, decision: buy/sell/hold)
- Limit check passed (position size OK, drawdown OK, daily loss OK)
- Order queued (order ID, time, size, price)
- Order executed (execution timestamp, price, actual size filled)
- Position closed (close price, P&L realized)
- Limit breached (which limit, value, action taken)
- Kill switch triggered (reason, action)
- Configuration change (old value, new value, user, timestamp)

**Queries:**

- "Show me every decision this strategy made on 2026-07-15"
- "Why did this order not execute?"
- "What was the P&L on this position?"
- "Was this order execution at fair price (compare to mid-market)?"
- "Show me all times this strategy breached position limits"

**Access:**

- Founder: Full read access
- Strategy author: Own strategy evidence
- Auditor role: Any strategy evidence (if enabled)
- Append-only (no deletion)

---

### Layer 8: Persistent Worker

**Purpose:** Long-running background job for real-time trading logic.

**Technology:**

- Heroku Dyno (free or low-cost)
- Railway.app (free tier)
- AWS Lambda with DynamoDB (cost-optimized for long events)
- Self-hosted Linux server (if cost is no object)

**Why Not Vercel Serverless?**

- Vercel functions have ~10-minute timeout (inadequate for day-long trading)
- Functions are ephemeral (state lost between invocations)
- VAJRA needs persistent state (position, order queue, market data cache)
- Polling broker APIs every tick requires continuous connection

**Responsibilities:**

- Load strategy configuration at startup
- Fetch latest market data
- Calculate trading signal
- Check kill switches
- Queue order if signal + limits pass
- Log to evidence ledger
- Update position state
- Generate real-time metrics
- Respond to external API calls (pause, resume, stop)
- Health check (restart if crashed)

**Deployment:**

- Single worker per strategy (isolation)
- Environment variables for strategy configuration
- Crash monitoring (alert if worker dies)
- Auto-restart on failure
- Graceful shutdown (close open positions before restart)

---

### Layer 9: Database

**Purpose:** Durable storage for all state, history, and configuration.

**Technology:**

- PostgreSQL (same as EURO AI; proven, reliable)
- Multiple databases per VAJRA environment:
  - `vajra_config` — Strategy code, parameters, user config
  - `vajra_trading` — Paper trading positions, orders, execution log
  - `vajra_market_data` — OHLCV bars and tick data
  - `vajra_evidence` — Audit trail
  - `vajra_research` — Backtest results, hypotheses
  - `vajra_monitoring` — Performance metrics, health checks

**Schema (Example Trading Database):**

```sql
-- Positions
CREATE TABLE positions (
    id UUID PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id),
    symbol TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    avg_cost DECIMAL NOT NULL,
    current_price DECIMAL,
    unrealized_pnl DECIMAL,
    opened_at TIMESTAMP,
    closed_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    strategy_id UUID REFERENCES strategies(id),
    symbol TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    side TEXT NOT NULL, -- 'BUY' or 'SELL'
    status TEXT NOT NULL, -- 'PENDING', 'FILLED', 'CANCELLED'
    execution_price DECIMAL,
    execution_time TIMESTAMP,
    created_at TIMESTAMP,
    executed_at TIMESTAMP
);

-- Trades (executed orders)
CREATE TABLE trades (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    symbol TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    entry_price DECIMAL NOT NULL,
    exit_price DECIMAL,
    exit_time TIMESTAMP,
    realized_pnl DECIMAL,
    created_at TIMESTAMP
);

-- Evidence Log
CREATE TABLE trading_evidence_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    strategy_id UUID REFERENCES strategies(id),
    action_type TEXT NOT NULL,
    signal_value DECIMAL,
    decision TEXT,
    order_id UUID,
    reason TEXT,
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Evidence indexed by timestamp and strategy_id for efficient queries
CREATE INDEX idx_evidence_strategy_timestamp
    ON trading_evidence_log(strategy_id, timestamp DESC);
```

**Security:**

- No passwords or API keys stored (use environment variables)
- Row-level security (RLS) for multi-user isolation
- Audit logging of schema changes
- Automated backups (daily)

**Scaling:**

- Single PostgreSQL instance adequate for 1-10 strategies (low volume)
- Read replicas if performance degrades
- Time-series extension (pg_partman) for automatic data partitioning (later)

---

### Layer 10: Object Storage

**Purpose:** Store large files (backtest results, strategy code ZIPs, reports).

**Technology:**

- AWS S3, Google Cloud Storage, or Azure Blob Storage
- Alternative: PostgreSQL BYTEA field (simpler for small files)

**Buckets/Containers:**

- `vajra-strategies` — Uploaded strategy code ZIPs
- `vajra-backtest-results` — CSV, JSON, image outputs
- `vajra-market-data-snapshots` — Periodic data exports
- `vajra-reports` — Generated performance reports

**Lifecycle Policies:**

- Backtest results: Delete after 90 days (cost optimization)
- Market data snapshots: Delete after 6 months
- Strategy code: Retain indefinitely (audit trail)

---

### Layer 11: Monitoring & Observability

**Purpose:** Real-time health checks, performance metrics, alerting.

**Technology:**

- Prometheus + Grafana (open-source)
- Alternative: Datadog, New Relic, CloudWatch

**Metrics:**

- Worker uptime (% time trading)
- Order queue depth (pending orders)
- Trade execution latency (signal to execution time)
- Position count and total value
- Daily P&L
- Strategy signal validity (% orders rejected by limits)
- Data ingestion lag (how fresh is market data?)
- Database query performance
- API response latency

**Alerts:**

- Worker crashed (critical)
- No market data for > 5 minutes (critical)
- Position limit breached (warning)
- Daily loss limit breached (critical, close positions)
- Database connection lost (critical)
- API latency > 1 second (warning)

**Dashboards:**

- Real-time trading dashboard (for founder)
- Infrastructure health dashboard (for ops)
- Performance metrics (daily/weekly/monthly)

---

### Layer 12: Backups & Disaster Recovery

**Purpose:** Protect against data loss and enable rapid recovery.

**Technology:**

- PostgreSQL automated backups (daily)
- WAL archiving (write-ahead log to S3)
- Point-in-time recovery (PITR)

**Backup Schedule:**

- Full backup: Daily, 00:00 UTC
- Incremental: Hourly via WAL archiving
- Retention: 30 days of backups + 30 days of WAL

**Recovery Procedures:**

1. **Data Loss (rows deleted):** PITR to point before deletion
2. **Database crashed:** Restore from latest backup
3. **Entire region down:** Failover to secondary region (pre-configured)
4. **Single-strategy corruption:** Recover strategy config from backup

**Testing:**

- Monthly: Restore a backup to a staging database
- Verify: All positions, orders, evidence present and correct
- Document: Recovery time and completeness

---

## Deployment Architecture

### Environment Separation

```
Production (Real Money Disabled)
├── Cockpit (Vercel Production)
├── API (Vercel Production or Railway)
├── Paper Trading Worker (Heroku or Railway)
├── Database (PostgreSQL Prod)
└── Monitoring (Grafana Prod)

Staging (Testing)
├── Cockpit (Vercel Preview)
├── API (Staging server)
├── Paper Trading Worker (Dev Dyno)
├── Database (PostgreSQL Staging)
└── Monitoring (Grafana Dev)

Development (Local)
├── Cockpit (localhost:3000)
├── API (localhost:3001)
├── Paper Trading Worker (local Python process)
├── Database (PostgreSQL local)
└── Monitoring (localhost:9090)
```

### CI/CD Pipeline

```
1. Push to branch → GitHub Actions
2. Lint & type-check (immediate)
3. Unit tests (5 minutes)
4. Integration tests (10 minutes)
5. Deploy to Vercel preview (1 minute)
6. Smoke tests against preview (5 minutes)
7. Manual review (async)
8. Merge to main
9. Auto-deploy to production (1 minute)
10. Post-deployment tests (5 minutes)
11. Monitor for 24 hours (alerts on any issues)
```

### Disaster Recovery Workflow

```
If Production Down:
1. Detect: Monitoring alert (worker dead, DB unavailable, etc.)
2. Immediate: Notify founder, pause all trading (kill switch)
3. Investigate: Check logs, determine root cause
4. If recoverable: Attempt restart (worker, DB connection, etc.)
5. If data loss: Restore from last backup (may lose last N minutes of data)
6. If partial: Restore individual strategy state from backup
7. Resume: Restart workers, resume trading with safety overrides
8. Post-incident: Root cause analysis, preventive measures
```

---

## Integration with EURO AI

### Separation Principles

1. **Completely Independent Deployment**
   - EURO AI deploys to: `euro-ai.vercel.app`
   - VAJRA deploys to: `vajra-trading.vercel.app` (or separate domain)
   - Different GitHub repositories (recommended) or clearly separated in monorepo

2. **Separate Databases**
   - EURO AI: `supabase_euro_ai` (multi-tenant governance)
   - VAJRA: `vajra_trading_prod` (single-purpose trading)
   - Independent backup schedules
   - No shared table structure

3. **Separate Credentials**
   - EURO AI: GitHub Secrets for Supabase credentials
   - VAJRA: Separate GitHub Secrets for PostgreSQL + broker APIs
   - Broker API keys (Alpaca, IB, etc.) stored only in VAJRA environment
   - No cross-environment credential sharing

4. **Separate Teams**
   - EURO AI: Founder + governance team
   - VAJRA: Founder + trading research team (may overlap on founder)
   - Different access controls (workspace-based for EURO AI, user-based for VAJRA)

### Optional: Unified Dashboard

If desired (future enhancement):

- Single login portal (OAuth2 through both systems)
- Dashboard showing both EURO AI and VAJRA status
- But: Trading data never displayed in EURO AI governance portal
- And: Governance decisions never affect trading execution

---

## Security & Compliance

### Trading-Specific Security

1. **Kill Switches (Hard Limits)**
   - Position size limit (cannot exceed via any code path)
   - Daily loss limit (close all positions if breached)
   - Max drawdown limit (close all positions if breached)
   - Order rate limit (max N orders per minute)
   - Price spike filter (reject if price moves > X% in one tick)

2. **Order Path Isolation**
   - Paper trading API key separate from research credentials
   - Order placement requires multiple checks: signal valid + limits passed
   - Broker API configured for paper trading only (live trading disabled at broker level)

3. **Audit Trail**
   - Every signal, decision, order, and trade logged
   - Include decision rationale (which limit check, which indicator)
   - Immutable (append-only evidence log)
   - Query-able for forensic analysis

4. **Credential Management**
   - No secrets in code or logs
   - API keys rotated quarterly
   - Broker credentials stored as environment variables
   - No developer access to production credentials (CI/CD only)

### Data Privacy

1. **No Personal Data**
   - Strategy code is proprietary (founder's intellectual property)
   - Trading results are sensitive (not shared with third parties)
   - Evidence logs contain only timestamps, signals, decisions (no user PII except user_id)

2. **Backup Privacy**
   - Backups encrypted at rest (default on AWS S3, GCS)
   - Backups stored in same region as production (compliance)
   - Access logs for backup downloads

### Compliance Checklist

- ✅ Paper trading only (no real money)
- ✅ No customer data (single user / founder)
- ✅ Audit trail complete
- ✅ Backups automated and tested
- ✅ Disaster recovery procedure documented
- ✅ Monitoring and alerting in place
- ✅ Kill switches functional and tested
- ✅ Credentials secure (never in logs)
- ✅ Access controls (workspace/user based)
- ✅ Code reviewed before production

---

## Cost Estimation (Monthly)

| Component             | Service                            | Free/Low-Cost Option  | Estimated Cost |
| --------------------- | ---------------------------------- | --------------------- | -------------- |
| Cockpit               | Vercel                             | Free tier             | $0             |
| API                   | Vercel or Railway                  | Railway free tier     | $0–$5          |
| Paper Trading Worker  | Heroku or Railway                  | Railway free tier     | $0–$7          |
| Database (PostgreSQL) | Supabase or Railway                | Railway free tier     | $0–$5          |
| Object Storage        | AWS S3                             | Minimal (small files) | $1–$2          |
| Monitoring            | Prometheus + Grafana               | Self-hosted           | $0–$10         |
| Market Data           | Broker API (free) or Yahoo Finance | Free tiers            | $0             |
| **Total**             |                                    | **Free or minimal**   | **$1–$29**     |

**Note:** Costs can scale up significantly if using managed databases (AWS RDS) or premium data sources. Current design targets $0–$30/month for research/paper trading.

---

## Deployment Timeline

### Phase 1: Foundation (Week 1)

- Set up PostgreSQL database
- Create schema for positions, orders, trades, evidence
- Deploy API server (minimal endpoints)
- Deploy cockpit dashboard (read-only)

### Phase 2: Research Engine (Week 2)

- Set up backtest framework (Python + backtrader)
- Integrate historical market data
- Create backtest API endpoint
- Deploy to cloud function

### Phase 3: Market Data (Week 3)

- Set up broker API connection
- Implement market data collector (persistent worker)
- Store OHLCV bars to database
- Validate data quality

### Phase 4: Paper Trading (Week 4)

- Implement order generation logic
- Add position tracking
- Implement kill switches (hard limits)
- Create evidence logging

### Phase 5: Monitoring & Safety (Week 5)

- Set up monitoring dashboards
- Implement alerting
- Create disaster recovery procedures
- Test backup restoration

### Phase 6: Polish & Deploy (Week 6)

- Code review and security audit
- Performance testing
- Documentation and runbooks
- Production deployment

---

## Next Steps (Upon Windows Evidence Arrival)

Once VAJRA code is recovered from Windows C: drive:

1. **Analyze** existing VAJRA architecture
2. **Identify** differences from this design
3. **Map** existing code to components above
4. **Preserve** all unique VAJRA patterns
5. **Consolidate** with VAJRA Gold (if applicable)
6. **Create** target architecture with minimal changes
7. **Design** migration path (preserve state, zero trading interruption)
8. **Implement** cloud deployment
9. **Test** thoroughly with paper trading
10. **Deploy** to production

---

## Conclusion

VAJRA is positioned as an independent, secure, and scalable platform for algorithmic trading research. Architecture prioritizes:

- **Safety:** Multiple kill switches, audit trail, evidence ledger
- **Reliability:** Persistent state, automated backups, disaster recovery
- **Scalability:** Component-based design, database-backed state, stateless APIs
- **Separation:** Independent from EURO AI, no shared databases or credentials
- **Cost:** Targeted at $0–$30/month using free/low-cost cloud services

Implementation proceeds in phases, with each phase adding capability while maintaining safety and verifiability.

---

**Status:** 🟢 **ARCHITECTURE FRAMEWORK ESTABLISHED**

Ready for Windows evidence analysis and implementation planning.
