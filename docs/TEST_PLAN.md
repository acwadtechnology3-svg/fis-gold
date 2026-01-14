# ============================================================================
# WALLET + GOLD INVESTMENT SYSTEM - TEST PLAN
# ============================================================================
# (H) Test Plan - Unit, Integration, E2E, and Load Scenarios
# ============================================================================

## Test Categories

### 1. Unit Tests
### 2. Integration Tests  
### 3. E2E Tests
### 4. Load/Stress Tests
### 5. Chaos Tests

---

## 1. UNIT TESTS

### 1.1 Fee Calculation Tests

```typescript
// tests/unit/fee-calculation.test.ts
import { describe, it, expect } from '@jest/globals';
import { supabase } from '../lib/supabase';

describe('Fee Calculation', () => {
  it('should calculate 5% fee for forced withdrawal', async () => {
    const { data } = await supabase.rpc('calculate_forced_withdrawal_fee', {
      p_amount: 10000,
      p_days_remaining: 30
    });
    
    expect(data[0].fee_amount).toBe(500); // 5% of 10000
    expect(data[0].fee_percent).toBe(0.05);
  });

  it('should apply minimum fee of 10 EGP', async () => {
    const { data } = await supabase.rpc('calculate_forced_withdrawal_fee', {
      p_amount: 100,
      p_days_remaining: 30
    });
    
    expect(data[0].fee_amount).toBe(10); // Min 10 EGP
  });

  it('should apply maximum fee cap', async () => {
    const { data } = await supabase.rpc('calculate_forced_withdrawal_fee', {
      p_amount: 200000,
      p_days_remaining: 30
    });
    
    expect(data[0].fee_amount).toBe(5000); // Max 5000 EGP
  });
});
```

### 1.2 Balance Validation Tests

```typescript
describe('Balance Constraints', () => {
  it('should reject negative available balance', async () => {
    const { error } = await supabase
      .from('wallet_accounts')
      .update({ available_balance: -100 })
      .eq('user_id', testUserId);
    
    expect(error).toBeTruthy();
    expect(error.code).toBe('23514'); // Check constraint violation
  });

  it('should reject negative locked balance', async () => {
    const { error } = await supabase
      .from('wallet_accounts')
      .update({ locked_balance: -100 })
      .eq('user_id', testUserId);
    
    expect(error).toBeTruthy();
  });
});
```

---

## 2. INTEGRATION TESTS

### 2.1 Idempotency Collision Tests

```typescript
// tests/integration/idempotency.test.ts
describe('Idempotency', () => {
  const idempotencyKey = 'test-key-' + Date.now();
  
  it('should process deposit only once with same idempotency key', async () => {
    // First request
    const res1 = await fetch('/wallet/deposit/initiate', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 1000,
        provider: 'test',
        idempotency_key: idempotencyKey
      })
    });
    
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    const depositId = data1.data.deposit_id;
    
    // Second request with same key
    const res2 = await fetch('/wallet/deposit/initiate', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 1000,
        provider: 'test',
        idempotency_key: idempotencyKey
      })
    });
    
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    expect(data2.data.deposit_id).toBe(depositId); // Same deposit
    expect(data2.data.cached).toBe(true);
  });

  it('should reject duplicate ledger entries', async () => {
    const key = 'ledger-test-' + Date.now();
    
    // First insert
    const { error: error1 } = await supabase
      .from('wallet_ledger')
      .insert({
        user_id: testUserId,
        event_type: 'deposit_credit',
        direction: 'credit',
        amount: 100,
        balance_type: 'available',
        balance_after: 100,
        idempotency_key: key
      });
    
    expect(error1).toBeNull();
    
    // Duplicate insert
    const { error: error2 } = await supabase
      .from('wallet_ledger')
      .insert({
        user_id: testUserId,
        event_type: 'deposit_credit',
        direction: 'credit',
        amount: 100,
        balance_type: 'available',
        balance_after: 200,
        idempotency_key: key
      });
    
    expect(error2).toBeTruthy();
    expect(error2.code).toBe('23505'); // Unique violation
  });
});
```

### 2.2 Concurrency Tests (Two Requests at Same Millisecond)

```typescript
describe('Concurrency Safety', () => {
  it('should handle two concurrent buy requests correctly', async () => {
    // Setup: User has 10000 available
    await setupBalance(testUserId, 10000, 0);
    
    // Create two snapshots
    const [snapshot1, snapshot2] = await Promise.all([
      createPriceSnapshot(testUserId),
      createPriceSnapshot(testUserId)
    ]);
    
    // Send two buy requests simultaneously
    const buyRequests = Promise.all([
      fetch('/gold/buy', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: 7000,
          duration_days: 90,
          snapshot_id: snapshot1.id,
          idempotency_key: 'buy-1-' + Date.now()
        })
      }),
      fetch('/gold/buy', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: 7000,
          duration_days: 90,
          snapshot_id: snapshot2.id,
          idempotency_key: 'buy-2-' + Date.now()
        })
      })
    ]);
    
    const [res1, res2] = await buyRequests;
    const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
    
    // One should succeed, one should fail (insufficient balance)
    const successes = [data1.success, data2.success].filter(Boolean);
    expect(successes.length).toBe(1);
    
    // Verify final balance
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('available_balance, locked_balance')
      .eq('user_id', testUserId)
      .single();
    
    expect(wallet.available_balance).toBe(3000);
    expect(wallet.locked_balance).toBe(7000);
  });

  it('should prevent double spending with rapid requests', async () => {
    await setupBalance(testUserId, 5000, 0);
    
    // Send 10 concurrent requests, each trying to spend all balance
    const requests = Array.from({ length: 10 }, (_, i) =>
      fetch('/gold/buy', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: 5000,
          duration_days: 90,
          snapshot_id: snapshots[i].id,
          idempotency_key: `rapid-${i}-${Date.now()}`
        })
      })
    );
    
    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(r => r.json()));
    
    // Exactly ONE should succeed
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);
    
    // Final balance should be 0 available, 5000 locked
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    expect(wallet.available_balance).toBe(0);
    expect(wallet.locked_balance).toBe(5000);
  });
});
```

### 2.3 Webhook Replay Tests

```typescript
describe('Webhook Handling', () => {
  it('should handle webhook replay (duplicate)', async () => {
    const depositId = await createPendingDeposit(1000);
    
    const webhookPayload = {
      reference: depositId,
      status: 'success',
      amount: 1000,
      provider_ref: 'TXN123'
    };
    
    // First webhook
    const res1 = await sendWebhook(webhookPayload);
    expect(res1.success).toBe(true);
    
    // Verify balance increased
    const balance1 = await getBalance(testUserId);
    expect(balance1.available).toBe(1000);
    
    // Replay webhook (duplicate)
    const res2 = await sendWebhook(webhookPayload);
    expect(res2.success).toBe(true);
    expect(res2.data.message).toBe('Already processed');
    
    // Balance should NOT increase again
    const balance2 = await getBalance(testUserId);
    expect(balance2.available).toBe(1000);
  });

  it('should handle out-of-order webhooks', async () => {
    const depositId = await createPendingDeposit(1000);
    
    // Send "failure" webhook first
    await sendWebhook({
      reference: depositId,
      status: 'failed',
      amount: 1000
    });
    
    // Then "success" webhook (should not process - already failed)
    const res = await sendWebhook({
      reference: depositId,
      status: 'success',
      amount: 1000,
      provider_ref: 'TXN123'
    });
    
    // Verify status is still failed (first webhook wins)
    const { data: deposit } = await supabase
      .from('deposits')
      .select('status')
      .eq('id', depositId)
      .single();
    
    expect(deposit.status).toBe('failed');
  });
});
```

---

## 3. E2E TESTS

### 3.1 Full Investment Journey

```typescript
describe('E2E: Full Investment Journey', () => {
  it('should complete full deposit -> buy -> wait -> withdraw cycle', async () => {
    // 1. Initiate deposit
    const depositRes = await api.post('/wallet/deposit/initiate', {
      amount: 10000,
      provider: 'paymob',
      idempotency_key: 'e2e-test-' + Date.now()
    });
    expect(depositRes.data.success).toBe(true);
    
    // 2. Simulate webhook (deposit settled)
    await simulateWebhook(depositRes.data.data.deposit_id, 'success', 10000);
    
    // 3. Verify balance
    const balance1 = await api.get('/wallet/balance');
    expect(balance1.data.data.available_balance).toBe(10000);
    
    // 4. Get price snapshot
    const snapshotRes = await api.post('/gold/price/snapshot', {
      metal_type: 'gold'
    });
    expect(snapshotRes.data.success).toBe(true);
    
    // 5. Buy gold
    const buyRes = await api.post('/gold/buy', {
      amount: 10000,
      duration_days: 1, // 1 day for testing
      snapshot_id: snapshotRes.data.data.snapshot_id,
      idempotency_key: 'buy-e2e-' + Date.now()
    });
    expect(buyRes.data.success).toBe(true);
    
    // 6. Verify position created
    const positionsRes = await api.get('/gold/positions');
    expect(positionsRes.data.data.length).toBe(1);
    expect(positionsRes.data.data[0].status).toBe('active');
    
    // 7. Verify balance moved to locked
    const balance2 = await api.get('/wallet/balance');
    expect(balance2.data.data.available_balance).toBe(0);
    expect(balance2.data.data.locked_balance).toBe(10000);
    
    // 8. Wait for maturity (simulate time passing)
    await advanceTime(1, 'day');
    
    // 9. Normal withdrawal
    const withdrawRes = await api.post('/withdraw/request', {
      position_id: buyRes.data.data.position_id,
      idempotency_key: 'withdraw-e2e-' + Date.now()
    });
    expect(withdrawRes.data.success).toBe(true);
    expect(withdrawRes.data.data.fee_amount).toBe(0); // No fee for normal
    
    // 10. Verify final balance
    const balance3 = await api.get('/wallet/balance');
    expect(balance3.data.data.locked_balance).toBe(0);
    // Available = sale proceeds (may have profit/loss based on price)
    expect(balance3.data.data.available_balance).toBeGreaterThan(0);
  });
});
```

### 3.2 Forced Withdrawal Journey

```typescript
describe('E2E: Forced Withdrawal', () => {
  it('should apply penalty for early withdrawal', async () => {
    // Setup: Active position with 90 day lock
    const position = await createActivePosition(10000, 90);
    
    // Attempt forced withdrawal (60 days before maturity)
    const withdrawRes = await api.post('/withdraw/forced-request', {
      position_id: position.id,
      idempotency_key: 'forced-e2e-' + Date.now()
    });
    
    expect(withdrawRes.data.success).toBe(true);
    expect(withdrawRes.data.data.fee_amount).toBeGreaterThan(0);
    expect(withdrawRes.data.data.fee_percent).toBe(0.05); // 5%
    expect(withdrawRes.data.data.net_amount).toBeLessThan(
      withdrawRes.data.data.gross_amount
    );
    
    // Verify ledger has fee entry
    const { data: ledger } = await supabase
      .from('wallet_ledger')
      .select('*')
      .eq('related_id', withdrawRes.data.data.withdrawal_id)
      .eq('event_type', 'forced_withdrawal_fee');
    
    expect(ledger.length).toBe(1);
    expect(ledger[0].amount).toBe(withdrawRes.data.data.fee_amount);
  });
});
```

---

## 4. LOAD TESTS

### 4.1 Price Endpoint Load Test (10k users)

```yaml
# k6 load test: price-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 1000 },  // Ramp up to 1000 users
    { duration: '3m', target: 10000 }, // Stay at 10k users
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests < 200ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

export default function () {
  const res = http.get('https://api.example.com/gold/price/today');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has bid price': (r) => r.json().data.gold.bid > 0,
  });
  
  sleep(0.1); // 100ms between requests
}
```

**Target SLOs:**
- p50 latency: < 50ms
- p95 latency: < 200ms
- p99 latency: < 500ms
- Error rate: < 0.1%
- Throughput: > 10,000 RPS

### 4.2 Concurrent Buy Test (2k users)

```yaml
# k6 load test: buy-load.js
export const options = {
  vus: 2000,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 2s for transactions
    http_req_failed: ['rate<0.05'],    // <5% errors (some will be balance errors)
  },
};

export default function () {
  // Get snapshot
  const snapshotRes = http.post(
    'https://api.example.com/gold/price/snapshot',
    JSON.stringify({ metal_type: 'gold' }),
    { headers: authHeaders }
  );
  
  if (snapshotRes.status !== 200) return;
  
  const snapshot = snapshotRes.json().data;
  
  // Try to buy
  const buyRes = http.post(
    'https://api.example.com/gold/buy',
    JSON.stringify({
      amount: 1000,
      duration_days: 90,
      snapshot_id: snapshot.snapshot_id,
      idempotency_key: `load-${__VU}-${__ITER}-${Date.now()}`
    }),
    { headers: authHeaders }
  );
  
  check(buyRes, {
    'buy succeeded or insufficient balance': (r) => 
      r.status === 200 || 
      r.json().error === 'Insufficient balance'
  });
  
  sleep(1);
}
```

### 4.3 Forced Withdrawal Load Test (1k users)

```yaml
export const options = {
  vus: 1000,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const res = http.post(
    'https://api.example.com/withdraw/forced-request',
    JSON.stringify({
      position_id: getRandomActivePosition(),
      idempotency_key: `forced-${__VU}-${__ITER}-${Date.now()}`
    }),
    { headers: authHeaders }
  );
  
  check(res, {
    'withdrawal processed': (r) => r.status === 200,
    'fee calculated': (r) => r.json().data?.fee_amount >= 0,
  });
  
  sleep(0.5);
}
```

---

## 5. CHAOS TESTS

### 5.1 Database Connection Failure

```typescript
describe('Chaos: Database Failure', () => {
  it('should handle database timeout gracefully', async () => {
    // Simulate slow query
    await supabase.rpc('pg_sleep', { seconds: 35 });
    
    const res = await api.post('/gold/buy', { ... });
    
    expect(res.status).toBe(503);
    expect(res.data.error).toContain('timeout');
    
    // Verify no partial state
    const balance = await getBalance(testUserId);
    expect(balance.available).toBe(originalBalance);
  });
});
```

### 5.2 Webhook Provider Timeout

```typescript
describe('Chaos: Webhook Retry', () => {
  it('should retry webhook processing on failure', async () => {
    // First attempt fails
    mockWebhookProcessing.mockRejectedValueOnce(new Error('Timeout'));
    
    // Second attempt succeeds
    mockWebhookProcessing.mockResolvedValue({ success: true });
    
    await sendWebhookWithRetry(payload, { maxRetries: 3 });
    
    expect(mockWebhookProcessing).toHaveBeenCalledTimes(2);
  });
});
```

---

## 6. MONITORING METRICS (SLOs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Latency p95 | < 200ms | > 500ms |
| API Latency p99 | < 1s | > 2s |
| Error Rate | < 0.1% | > 1% |
| Database Lock Waits | < 100ms avg | > 500ms |
| Ledger/Wallet Mismatch | 0 | > 0 |
| Webhook Success Rate | > 99.9% | < 99% |
| Deposit Settlement Time | < 5s | > 30s |
| Buy Transaction Time | < 2s | > 5s |

---

## 7. TEST DATA GENERATORS

```typescript
// tests/helpers/generators.ts
export async function createTestUser() {
  const { data, error } = await supabase.auth.signUp({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  });
  return data.user;
}

export async function setupBalance(userId: string, available: number, locked: number) {
  await supabase.from('wallet_accounts').upsert({
    user_id: userId,
    available_balance: available,
    locked_balance: locked,
    currency: 'EGP'
  });
}

export async function createActivePosition(userId: string, amount: number, days: number) {
  // ... create position with proper flow
}

export async function advanceTime(value: number, unit: 'day' | 'hour') {
  // For testing: Update lock_until on positions
  const interval = unit === 'day' ? value * 24 * 60 * 60 * 1000 : value * 60 * 60 * 1000;
  
  await supabase.rpc('advance_test_time', { milliseconds: interval });
}
```

