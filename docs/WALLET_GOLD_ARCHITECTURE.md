# Wallet + Gold Investment System Architecture

## Production-Ready, Scalable Financial System Design

**Version:** 1.0.0  
**Stack:** React (Frontend) + Supabase (Postgres, RLS, Edge Functions, Realtime, Storage)  
**Target Scale:** 100k users, real money operations

---

## (A) Flow Diagram - States & Transitions

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WALLET + GOLD INVESTMENT FLOW                         │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   USER AUTH      │
                              │  (Supabase Auth) │
                              └────────┬─────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DEPOSIT FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────┐   ┌────────────────────┐     │
│  │ INITIATE │──▶│   PENDING    │──▶│ PROCESSING  │──▶│  SETTLED/FAILED    │     │
│  │ DEPOSIT  │   │ (awaiting    │   │ (webhook    │   │ (ledger entry +    │     │
│  │          │   │  payment)    │   │  received)  │   │  balance update)   │     │
│  └──────────┘   └──────────────┘   └─────────────┘   └────────────────────┘     │
│                                                                                  │
│  States: initiated → pending → processing → settled | failed | expired          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ (on settled)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              WALLET STATE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐          │
│  │                      wallet_accounts                              │          │
│  ├───────────────────────┬───────────────────────────────────────────┤          │
│  │   available_balance   │   locked_balance (in active positions)    │          │
│  │   (can buy/withdraw)  │   (cannot touch until lock expires)       │          │
│  └───────────────────────┴───────────────────────────────────────────┘          │
│                                                                                  │
│  Source of Truth: wallet_ledger (append-only)                                   │
│  wallet_accounts = materialized view / cached snapshot for fast reads           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BUY GOLD FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. Request Price Snapshot (TTL: 30s)                                           │
│     GET /gold/price/snapshot                                                    │
│     → Returns: snapshot_id, bid, ask, expires_at                                │
│                                                                                  │
│  2. Submit Buy Order                                                            │
│     POST /gold/buy { amount, duration_days, snapshot_id, idempotency_key }      │
│     → Validates snapshot not expired                                            │
│     → Calculates grams = amount / ask_price                                     │
│     → Moves amount from available_balance → locked_balance                      │
│     → Creates gold_position with lock_until = now + duration                    │
│                                                                                  │
│  Position States: active → matured → closed                                     │
│                                                                                  │
│  ┌───────────┐      ┌────────────┐      ┌────────────┐      ┌─────────┐        │
│  │  ACTIVE   │─────▶│  MATURED   │─────▶│  CLOSING   │─────▶│ CLOSED  │        │
│  │(locked)   │      │(unlock ok) │      │(processing)│      │(settled)│        │
│  └───────────┘      └────────────┘      └────────────┘      └─────────┘        │
│        │                                                                        │
│        │ (forced)                                                               │
│        ▼                                                                        │
│  ┌───────────────┐                                                              │
│  │FORCED_CLOSING │ → applies penalty fee                                        │
│  └───────────────┘                                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WITHDRAWAL FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  NORMAL WITHDRAWAL (position matured):                                          │
│  ┌──────────┐   ┌───────────┐   ┌────────────┐   ┌────────────┐                │
│  │ REQUEST  │──▶│ APPROVED  │──▶│ PROCESSING │──▶│ COMPLETED  │                │
│  └──────────┘   └───────────┘   └────────────┘   └────────────┘                │
│                                                                                  │
│  FORCED WITHDRAWAL (before lock expires):                                       │
│  ┌──────────┐   ┌───────────────┐   ┌────────────┐   ┌────────────┐            │
│  │ REQUEST  │──▶│ FEE CALCULATED│──▶│ PROCESSING │──▶│ COMPLETED  │            │
│  │ (forced) │   │ (penalty app) │   │            │   │ (net amt)  │            │
│  └──────────┘   └───────────────┘   └────────────┘   └────────────┘            │
│                                                                                  │
│  Withdrawal Types: normal | forced                                              │
│  Status: requested → approved → processing → completed | failed | cancelled     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

```

---

## Key Architectural Principles

### 1. **Financial Correctness**
- Append-only ledger as single source of truth
- No DELETE/UPDATE on ledger entries (use reversal entries)
- Atomic transactions with row-level locking
- Idempotency keys prevent double operations

### 2. **Concurrency Safety**
- `SELECT ... FOR UPDATE` on wallet_accounts
- Advisory locks for user-level operations
- Unique constraints on idempotency keys
- Optimistic locking with version numbers

### 3. **Audit Trail**
- Every money movement creates ledger entry
- Immutable audit_logs table
- Correlation IDs across all operations
- Price snapshots preserved for dispute resolution

### 4. **Security**
- All money mutations via Edge Functions only
- Service role key never exposed to client
- RLS policies enforce row-level access
- Webhook signature verification

---

## Gold Price Integration

The system integrates with the `gold-price-api` for real-time prices:

```
┌────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│  Client Request    │─────▶│  Edge Function      │─────▶│  gold-price-api  │
│  GET /gold/price   │      │  (cache check)      │      │  /api/prices     │
└────────────────────┘      └─────────────────────┘      └──────────────────┘
                                     │
                                     ▼
                            ┌─────────────────────┐
                            │  gold_prices table  │
                            │  (cached, TTL 60s)  │
                            └─────────────────────┘
```

**Price Flow:**
1. Cron job fetches prices every minute from gold-price-api
2. Prices stored in `gold_prices` with effective_at timestamp
3. Client requests create `gold_price_snapshots` with 30s TTL
4. Buy operations must reference valid, unexpired snapshot

