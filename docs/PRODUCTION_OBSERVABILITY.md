# ============================================================================
# WALLET + GOLD INVESTMENT SYSTEM - PRODUCTION OBSERVABILITY
# ============================================================================
# (I) Production Monitoring & Alerting Checklist
# ============================================================================

## Overview

This document defines the complete observability strategy for the Wallet + Gold Investment system,
covering monitoring, alerting, logging, and operational runbooks.

---

## 1. MONITORING DASHBOARDS

### 1.1 Business Metrics Dashboard

```yaml
Dashboard: "Gold Investment - Business Metrics"
Panels:
  - title: "Total Deposits (24h)"
    query: |
      SELECT COUNT(*), SUM(amount) 
      FROM deposits 
      WHERE status = 'settled' 
      AND settled_at > NOW() - INTERVAL '24 hours'

  - title: "Active Positions Value"
    query: |
      SELECT 
        COUNT(*) as position_count,
        SUM(buy_amount) as total_invested,
        SUM(grams) as total_grams
      FROM gold_positions 
      WHERE status = 'active'

  - title: "Forced Withdrawals (24h)"
    query: |
      SELECT 
        COUNT(*) as count,
        SUM(fee_amount) as total_fees_collected
      FROM withdrawals 
      WHERE withdrawal_type = 'forced' 
      AND requested_at > NOW() - INTERVAL '24 hours'

  - title: "Total Wallet Balances"
    query: |
      SELECT 
        SUM(available_balance) as total_available,
        SUM(locked_balance) as total_locked,
        SUM(available_balance + locked_balance) as total_value
      FROM wallet_accounts
```

### 1.2 Technical Metrics Dashboard

```yaml
Dashboard: "Gold Investment - System Health"
Panels:
  - title: "API Latency Percentiles"
    metric: http_request_duration_seconds
    percentiles: [50, 90, 95, 99]
    
  - title: "Request Rate by Endpoint"
    query: rate(http_requests_total[5m])
    groupBy: endpoint
    
  - title: "Error Rate by Endpoint"
    query: |
      rate(http_requests_total{status=~"5.."}[5m]) 
      / rate(http_requests_total[5m]) * 100
    
  - title: "Database Connection Pool"
    metrics:
      - pgbouncer_pools_cl_active
      - pgbouncer_pools_cl_waiting
      - pgbouncer_pools_sv_active
      
  - title: "Database Lock Wait Time"
    query: pg_stat_activity_wait_event_type{wait_event_type="Lock"}
    
  - title: "Edge Function Invocations"
    metric: supabase_edge_function_invocations_total
    groupBy: function_name
```

### 1.3 Financial Integrity Dashboard

```yaml
Dashboard: "Gold Investment - Financial Integrity"
Panels:
  - title: "Ledger vs Wallet Consistency"
    query: |
      SELECT * FROM reconcile_all_wallets()
    alert_if: any_rows_returned
    
  - title: "Unprocessed Deposits"
    query: |
      SELECT COUNT(*), SUM(amount) 
      FROM deposits 
      WHERE status = 'pending' 
      AND created_at < NOW() - INTERVAL '1 hour'
    
  - title: "Double Credit Detection"
    query: |
      SELECT user_id, idempotency_key, COUNT(*)
      FROM wallet_ledger
      WHERE event_type = 'deposit_credit'
      GROUP BY user_id, idempotency_key
      HAVING COUNT(*) > 1
    
  - title: "Negative Balance Detection"
    query: |
      SELECT user_id, available_balance, locked_balance
      FROM wallet_accounts
      WHERE available_balance < 0 OR locked_balance < 0
    alert_if: any_rows_returned
```

---

## 2. ALERTING RULES

### 2.1 Critical Alerts (P1 - Immediate Response)

```yaml
alerts:
  - name: "Ledger Imbalance Detected"
    severity: critical
    condition: |
      SELECT COUNT(*) > 0 FROM reconcile_all_wallets()
    message: "CRITICAL: Wallet balance does not match ledger entries"
    runbook: /runbooks/ledger-imbalance.md
    notify: [pagerduty, slack-critical]
    
  - name: "Negative Balance Detected"
    severity: critical
    condition: |
      SELECT COUNT(*) FROM wallet_accounts 
      WHERE available_balance < 0 OR locked_balance < 0
    threshold: "> 0"
    runbook: /runbooks/negative-balance.md
    notify: [pagerduty, slack-critical]
    
  - name: "Webhook Processing Failure Spike"
    severity: critical
    condition: |
      rate(webhook_failures_total[5m]) > 0.1
    message: "More than 10% of webhooks failing"
    runbook: /runbooks/webhook-failures.md
    notify: [pagerduty, slack-critical]
    
  - name: "Database Lock Wait Spike"
    severity: critical
    condition: |
      avg(pg_stat_activity_wait_event_type{wait_event_type="Lock"}) > 100
    message: "High database lock contention"
    runbook: /runbooks/db-locks.md
    notify: [pagerduty]
```

### 2.2 High Alerts (P2 - Response within 30 min)

```yaml
alerts:
  - name: "API Latency Degradation"
    severity: high
    condition: |
      histogram_quantile(0.95, http_request_duration_seconds) > 2
    message: "95th percentile latency exceeds 2 seconds"
    notify: [slack-alerts]
    
  - name: "High Forced Withdrawal Rate"
    severity: high
    condition: |
      SELECT COUNT(*) FROM withdrawals 
      WHERE withdrawal_type = 'forced' 
      AND requested_at > NOW() - INTERVAL '1 hour'
    threshold: "> 100"
    message: "Unusual spike in forced withdrawals"
    notify: [slack-alerts]
    
  - name: "Deposit Settlement Delay"
    severity: high
    condition: |
      SELECT COUNT(*) FROM deposits 
      WHERE status = 'pending' 
      AND created_at < NOW() - INTERVAL '30 minutes'
    threshold: "> 10"
    notify: [slack-alerts]
    
  - name: "Price Data Stale"
    severity: high
    condition: |
      SELECT MAX(effective_at) < NOW() - INTERVAL '5 minutes'
      FROM gold_prices
    message: "Gold price data is stale (>5 min old)"
    runbook: /runbooks/price-stale.md
    notify: [slack-alerts]
```

### 2.3 Warning Alerts (P3 - Response within 4 hours)

```yaml
alerts:
  - name: "Elevated Error Rate"
    severity: warning
    condition: |
      rate(http_requests_total{status=~"5.."}[15m]) 
      / rate(http_requests_total[15m]) > 0.01
    message: "Error rate above 1%"
    notify: [slack-monitoring]
    
  - name: "Database Connection Pool Exhaustion"
    severity: warning
    condition: |
      pgbouncer_pools_cl_waiting > 10
    message: "Clients waiting for database connections"
    notify: [slack-monitoring]
    
  - name: "Idempotency Key Table Growth"
    severity: warning
    condition: |
      SELECT pg_table_size('idempotency_keys') > 1073741824 -- 1GB
    message: "Idempotency keys table needs cleanup"
    notify: [slack-monitoring]
```

---

## 3. LOGGING STANDARDS

### 3.1 Log Format (Structured JSON)

```json
{
  "timestamp": "2024-01-14T20:00:00.000Z",
  "level": "info",
  "service": "wallet-api",
  "function": "handleBuyGold",
  "correlation_id": "uuid",
  "user_id": "uuid (hashed for privacy)",
  "action": "gold_buy",
  "duration_ms": 245,
  "metadata": {
    "amount": 10000,
    "grams": 1.423,
    "snapshot_id": "uuid"
  },
  "result": "success"
}
```

### 3.2 What to Log

```yaml
ALWAYS LOG:
  - correlation_id (for request tracing)
  - user_id (hashed or partial for privacy)
  - action type
  - timestamp
  - duration
  - result (success/failure)
  - error message (if failure)

NEVER LOG:
  - Full authentication tokens
  - Passwords or secrets
  - Full credit card numbers
  - Personal identification numbers
  - Webhook secrets or signatures

AUDIT LOG (separate table):
  - All money-changing operations
  - All status transitions
  - Admin actions
  - Failed authentication attempts
```

### 3.3 Log Levels

```yaml
ERROR:
  - Failed transactions
  - Database errors
  - External service failures
  - Validation failures that shouldn't happen

WARN:
  - Rate limit hits
  - Retried operations
  - Slow queries (>1s)
  - Deprecated API usage

INFO:
  - Successful operations
  - State transitions
  - Webhook received

DEBUG (production disabled):
  - Full request/response bodies
  - SQL queries
  - Cache hits/misses
```

---

## 4. OPERATIONAL RUNBOOKS

### 4.1 Runbook: Ledger Imbalance

```markdown
# Runbook: Ledger Imbalance Detected

## Severity: CRITICAL

## Symptoms
- Alert: "Ledger Imbalance Detected"
- Wallet balance does not match sum of ledger entries

## Immediate Actions
1. **DO NOT PAUSE THE SYSTEM** unless instructed
2. Identify affected users:
   ```sql
   SELECT * FROM reconcile_all_wallets();
   ```

3. Check for recent failed transactions:
   ```sql
   SELECT * FROM idempotency_keys 
   WHERE status = 'processing'
   AND created_at > NOW() - INTERVAL '1 hour';
   ```

4. Check for duplicate ledger entries:
   ```sql
   SELECT user_id, idempotency_key, COUNT(*) 
   FROM wallet_ledger
   GROUP BY user_id, idempotency_key
   HAVING COUNT(*) > 1;
   ```

## Resolution
1. If caused by stuck transaction:
   ```sql
   -- Recompute balance from ledger
   UPDATE wallet_accounts wa
   SET 
     available_balance = (
       SELECT SUM(CASE 
         WHEN balance_type = 'available' AND direction = 'credit' THEN amount
         WHEN balance_type = 'available' AND direction = 'debit' THEN -amount
         ELSE 0 END)
       FROM wallet_ledger WHERE user_id = wa.user_id
     ),
     locked_balance = (
       SELECT SUM(CASE 
         WHEN balance_type = 'locked' AND direction = 'credit' THEN amount
         WHEN balance_type = 'locked' AND direction = 'debit' THEN -amount
         ELSE 0 END)
       FROM wallet_ledger WHERE user_id = wa.user_id
     )
   WHERE user_id IN (SELECT user_id FROM reconcile_all_wallets());
   ```

2. Create incident report

## Escalation
- If more than 10 users affected: Escalate to Engineering Lead
- If total discrepancy > 10,000 EGP: Escalate to Finance
```

### 4.2 Runbook: Webhook Failures

```markdown
# Runbook: Webhook Processing Failures

## Severity: CRITICAL

## Symptoms
- High rate of webhook failures
- Deposits stuck in "pending" status

## Diagnosis
1. Check webhook error logs:
   ```sql
   SELECT * FROM audit_logs 
   WHERE action = 'webhook_received' 
   AND success = false
   ORDER BY created_at DESC
   LIMIT 50;
   ```

2. Check provider connectivity:
   ```bash
   curl -I https://provider-api.example.com/health
   ```

3. Verify webhook secret:
   ```bash
   echo $WEBHOOK_SECRET | head -c 5
   # Should match first 5 chars of stored secret
   ```

## Resolution
1. If signature mismatch:
   - Verify webhook secret in environment
   - Check if provider rotated secrets

2. If timeout:
   - Check database connection pool
   - Scale up Edge Functions if needed

3. Replay failed webhooks:
   ```sql
   -- Get failed deposits to retry
   SELECT id, provider, provider_ref 
   FROM deposits 
   WHERE status = 'pending'
   AND created_at > NOW() - INTERVAL '2 hours';
   ```

## Prevention
- Webhook retries with exponential backoff
- Dead letter queue for failed webhooks
```

---

## 5. HEALTH CHECK ENDPOINTS

```typescript
// /health - Basic health check
{
  "status": "healthy",
  "timestamp": "2024-01-14T20:00:00Z",
  "version": "1.0.0"
}

// /health/detailed - Detailed health (internal only)
{
  "status": "healthy",
  "components": {
    "database": {
      "status": "healthy",
      "latency_ms": 5,
      "connection_pool": {
        "active": 10,
        "idle": 40,
        "waiting": 0
      }
    },
    "gold_price_api": {
      "status": "healthy",
      "last_update": "2024-01-14T19:59:30Z",
      "latency_ms": 120
    },
    "ledger_integrity": {
      "status": "healthy",
      "last_check": "2024-01-14T19:55:00Z",
      "mismatches": 0
    }
  }
}
```

---

## 6. BACKUP & RECOVERY

### 6.1 Backup Strategy

```yaml
Database:
  type: Supabase PITR (Point-in-Time Recovery)
  retention: 30 days
  frequency: Continuous WAL archiving
  
Daily Exports:
  - wallet_ledger (append-only, critical)
  - deposits (financial records)
  - gold_positions
  - withdrawals
  destination: S3 with encryption
  retention: 7 years (financial compliance)
```

### 6.2 Recovery Procedures

```markdown
## Ledger Recovery
1. Never delete ledger entries
2. Use reversal entries for corrections
3. All corrections require audit log entry

## Balance Recovery
1. Wallets can be recomputed from ledger:
   ```sql
   SELECT * FROM reconcile_all_wallets();
   -- Apply fixes as needed
   ```

## Point-in-Time Recovery
1. Contact Supabase support
2. Specify exact timestamp
3. Recover to separate database first
4. Verify integrity before swap
```

---

## 7. CAPACITY PLANNING

### 7.1 Current Baselines

```yaml
Database:
  size: 5GB
  connections: 100 max
  queries_per_second: 500
  
API:
  requests_per_second: 1000
  avg_latency: 50ms
  p99_latency: 200ms
  
Edge Functions:
  concurrent_executions: 100
  memory: 256MB each
```

### 7.2 Scaling Triggers

```yaml
Scale Up When:
  - Database CPU > 70% sustained
  - Connection pool waiting > 5
  - API latency p99 > 500ms
  - Error rate > 1%

Scale Down When:
  - Database CPU < 30% for 1 hour
  - All metrics green for 24 hours
```

---

## 8. INCIDENT RESPONSE

### 8.1 Severity Definitions

| Severity | Impact | Response Time | Examples |
|----------|--------|---------------|----------|
| SEV1 | System down, money at risk | 15 min | Ledger imbalance, negative balance |
| SEV2 | Major feature degraded | 30 min | Deposits failing, high latency |
| SEV3 | Minor feature degraded | 4 hours | Slow reports, UI issues |
| SEV4 | Cosmetic/low impact | Next sprint | Typos, minor UX issues |

### 8.2 Communication Templates

```markdown
## Initial Alert (SEV1/SEV2)
Subject: [SEV{X}] {Brief Description}

**Status:** Investigating
**Impact:** {Description of user impact}
**Started:** {Timestamp}
**Team:** {On-call engineer}
**Next Update:** {Time}

---

## Resolution
Subject: [RESOLVED] {Brief Description}

**Status:** Resolved
**Duration:** {Total time}
**Root Cause:** {Brief description}
**Fix:** {What was done}
**Postmortem:** {Link} (within 48h)
```

---

## 9. COMPLIANCE CHECKLIST

- [ ] All financial transactions logged to audit_logs
- [ ] Ledger entries are immutable (no DELETE/UPDATE)
- [ ] User data encrypted at rest (Supabase default)
- [ ] TLS 1.3 for all connections
- [ ] Secrets rotated quarterly
- [ ] Access logs retained for 1 year
- [ ] Financial records retained for 7 years
- [ ] GDPR data export capability verified
- [ ] Disaster recovery tested quarterly

