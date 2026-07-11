# EURO AI Technology Roadmap
**Last Updated:** 2026-07-11  
**Next Review:** 2026-07-18 (Post Phase 3 decision)

---

## 6-Month Strategic Goals (Jul 2026 – Jan 2027)

### Q3 2026: Operational Excellence (Now – Sept 2026)
**Goal:** Build a world-class operational platform with enterprise reliability.

- **Observability Infrastructure** (COMPLETE – deployed)
  - Request logging with automatic instrumentation
  - Performance metrics collection (latency p95/p99, throughput)
  - SLA validation and regression detection
  - Real-time monitoring dashboard
  
- **Phase 3 Feature Implementation** (Pending decision 2026-07-17)
  - Candidate: Audit Logging (highest ROI: 3-4 days, lowest risk, highest adoption)
  - Alternative paths: Evidence Linking, Analytics, Template Iteration
  
- **Production Stability** (Ongoing)
  - Deployment safety: Verify every merge works, rollback procedures documented
  - Incident response: Clear escalation paths, MTTD < 5min for critical issues
  - SLA compliance: p95 < 1s for customer-critical paths

### Q4 2026: Scale & Resilience (Oct – Dec 2026)
**Goal:** Prepare for production scale and multi-region deployment.

- **Database Scaling**
  - Query optimization for large datasets (obligations, assessments)
  - Connection pooling and caching strategy
  - Read replicas for reporting
  
- **Reliability Engineering**
  - Chaos engineering tests for failure scenarios
  - Automated rollback procedures
  - Circuit breakers for external dependencies
  
- **Security Hardening**
  - Penetration testing by external firm
  - Rate limiting audit
  - Secrets rotation automation

### Q1 2027: Enterprise Features (Jan – Mar 2027)
**Goal:** Support enterprise customers with advanced governance capabilities.

- **Advanced Analytics**
  - Trend analysis (compliance velocity)
  - Predictive alerts (obligations at risk)
  - Custom reporting for regulators
  
- **Integration Ecosystem**
  - API for third-party tools
  - Webhook system for compliance events
  - Data export (CSV, JSON)
  
- **Compliance Reporting**
  - Automated audit trail export
  - SOC 2 compliance package
  - GDPR data subject access

---

## Architectural Decisions Pending

1. **Audit Logging Implementation** (Depends on Phase 3 decision)
   - Will we store complete audit trail in Supabase or separate audit DB?
   - Immutable append-only log vs. mutable event store?
   
2. **Multi-Tenancy Scaling**
   - Current: Row-Level Security (RLS) per workspace
   - Future: Should we shard databases per region?
   
3. **Real-Time Notifications**
   - Current: Polling
   - Future: WebSocket or server-sent events for compliance alerts?

---

## Known Constraints & Dependencies

- **Supabase Schema:** Deployment of `supabase/schema.sql` is critical blocker (not yet completed in Founder's environment)
- **Email Auth:** Must be enabled in Supabase → Project Settings
- **GitHub Actions:** Currently offline or rate-limited (blocker for CI/CD)
- **Phase 3 Decision:** 2026-07-17 – blocks Audit Logging, Evidence Linking, or other feature implementation

---

## Success Metrics

- **Reliability:** 99.9% uptime, < 5min MTTD for critical issues
- **Performance:** p95 latency < 1s for customer-critical paths
- **Deployment:** 100% pass rate on pre-deployment checks before main
- **Security:** Zero critical vulnerabilities in dependencies
- **Adoption:** 20%+ of Phase 2 features used within 7 days of launch
