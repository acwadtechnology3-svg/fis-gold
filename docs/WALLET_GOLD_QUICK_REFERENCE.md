# Wallet + Gold Investment System - Quick Reference

## 📁 File Locations

| File | Purpose |
|------|---------|
| `gold-price-api/` | Gold price scraper API (Next.js) |
| `gold-price-api/supabase-schema.sql` | Price tables schema with bid/ask |
| `supabase/migrations/001_wallet_gold_schema.sql` | Complete wallet + investment schema |
| `supabase/migrations/002_rls_policies.sql` | Row-level security policies |
| `supabase/migrations/003_transaction_functions.sql` | PostgreSQL transaction functions |
| `supabase/functions/wallet-api/index.ts` | Main Edge Functions API |
| `supabase/functions/price-sync/index.ts` | Price sync (calls gold-price-api) |
| `docs/WALLET_GOLD_ARCHITECTURE.md` | Architecture documentation |
| `docs/TEST_PLAN.md` | Test plan and scenarios |
| `docs/PRODUCTION_OBSERVABILITY.md` | Monitoring & alerting |

---

## 💰 Price Naming Convention

Both naming conventions are supported:

| Name | Alias | Meaning | Customer Action |
|------|-------|---------|-----------------|
| `sell_price` | `ask` | Dealer sells to customer | Customer **BUYS** at this price |
| `buy_price` | `bid` | Dealer buys from customer | Customer **SELLS** at this price |
| `mid` | - | Average of bid and ask | Reference only |
| `spread` | - | Difference (ask - bid) | Dealer margin |

### API Response Example
```json
{
  "gold": {
    "karat": "24",
    "sell_price": 7030,
    "buy_price": 7000,
    "ask": 7030,
    "bid": 7000,
    "mid": 7015,
    "spread": 30,
    "currency": "EGP"
  }
}
```

---

## 🔄 Price Update Flow

```
goldpricedata.com (External)
        │
        ▼ (scrapes)
gold-price-api (Next.js on Vercel)
        │
        ▼ (stores)
Supabase: gold_prices + silver_prices tables
        │
        ▼ (reads)
wallet-api Edge Function
        │
        ▼ (creates snapshot)
gold_price_snapshots (30s TTL)
        │
        ▼ (buy order uses snapshot)
gold_positions
```

### Cron Job Setup (cron-job.org)
1. Go to https://console.cron-job.org
2. Create new job pointing to: `https://your-app.vercel.app/api/cron/update-prices`
3. Set schedule: Every 1 minute (`* * * * *`)
4. Add header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 🔐 RLS Summary

| Table | Client Read | Client Write | Server Write |
|-------|-------------|--------------|--------------|
| `gold_prices` | All (public) | ❌ | ✅ |
| `silver_prices` | All (public) | ❌ | ✅ |
| `wallet_accounts` | Own only | ❌ | ✅ |
| `wallet_ledger` | Own only | ❌ | ✅ |
| `deposits` | Own only | Initiate only | ✅ |
| `gold_price_snapshots` | Own only | Create only | ✅ |
| `gold_positions` | Own only | ❌ | ✅ |
| `withdrawals` | Own only | ❌ | ✅ |

---

## 📡 API Endpoints

### gold-price-api (Next.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prices` | Get latest gold & silver prices |
| GET | `/api/prices?history=true&type=gold` | Get price history |
| GET | `/api/gold` | Live scrape all karats |
| GET | `/api/gold/24` | Live scrape 24K gold |
| GET | `/api/cron/update-prices` | Cron job to update prices |

### wallet-api (Edge Functions)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wallet/deposit/initiate` | Start deposit flow |
| POST | `/wallet/deposit/webhook` | Payment provider callback |
| GET | `/wallet/balance` | Get user balance |
| GET | `/gold/price/today` | Get current prices |
| POST | `/gold/price/snapshot` | Lock price for 30s |
| POST | `/gold/buy` | Buy gold position |
| POST | `/withdraw/request` | Normal withdrawal |
| POST | `/withdraw/forced-request` | Early withdrawal with fee |

---

## 💰 Fee Structure

| Type | Percent | Min Fee | Max Fee |
|------|---------|---------|---------|
| Forced Withdrawal | 5% | 10 EGP | 5,000 EGP |
| Normal Withdrawal | 0.1% | 5 EGP | 100 EGP |

---

## 🔧 Environment Variables

### gold-price-api (.env.local)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

### Supabase Edge Functions
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
GOLD_PRICE_API_URL=https://your-gold-price-api.vercel.app
WEBHOOK_SECRET=your-webhook-secret
CRON_SECRET=your-cron-secret
```

---

## 🚀 Deployment Checklist

### 1. Database Setup
- [ ] Run `gold-price-api/supabase-schema.sql` in Supabase SQL Editor
- [ ] Run `supabase/migrations/001_wallet_gold_schema.sql`
- [ ] Run `supabase/migrations/003_transaction_functions.sql`

### 2. gold-price-api Deployment
- [ ] Deploy to Vercel: `cd gold-price-api && vercel`
- [ ] Set environment variables in Vercel dashboard
- [ ] Test: `https://your-app.vercel.app/api/prices`

### 3. Cron Job Setup
- [ ] Go to https://console.cron-job.org
- [ ] Create job: `GET https://your-app.vercel.app/api/cron/update-prices`
- [ ] Schedule: Every 1 minute
- [ ] Add Authorization header with CRON_SECRET

### 4. Edge Functions Deployment
- [ ] `supabase functions deploy wallet-api`
- [ ] `supabase functions deploy price-sync`
- [ ] Set secrets: `supabase secrets set GOLD_PRICE_API_URL=...`

### 5. Verification
- [ ] Check prices update: `SELECT * FROM gold_prices ORDER BY created_at DESC LIMIT 5;`
- [ ] Test wallet endpoint: `curl /wallet/balance`
- [ ] Test price endpoint: `curl /gold/price/today`

---

## 🧪 Quick Test Commands

```bash
# Test gold-price-api locally
cd gold-price-api
npm run dev
curl http://localhost:3000/api/prices

# Test cron manually
curl http://localhost:3000/api/cron/update-prices

# Check prices in database
psql -c "SELECT karat, sell_price, buy_price, created_at FROM gold_prices ORDER BY created_at DESC LIMIT 5;"

# Check ledger consistency
psql -c "SELECT * FROM verify_wallet_ledger_consistency('USER_UUID');"
```

---

## 🚨 Critical Alerts

1. **Ledger Imbalance** - wallet_accounts ≠ wallet_ledger sum
2. **Negative Balance** - Should never happen
3. **Webhook Failures** - Payment processing issues
4. **Price Stale** - No price update in 5+ minutes

---

## 📊 Key Metrics to Monitor

| Metric | Target | Alert If |
|--------|--------|----------|
| API p95 Latency | < 200ms | > 500ms |
| Error Rate | < 0.1% | > 1% |
| Webhook Success | > 99.9% | < 99% |
| DB Lock Waits | < 100ms | > 500ms |
| Ledger Mismatches | 0 | > 0 |
| Price Freshness | < 2 min | > 5 min |

---

## 📚 Database Schema Diagram

```
┌─────────────────┐     ┌─────────────────┐
│   gold_prices   │     │  silver_prices  │
├─────────────────┤     ├─────────────────┤
│ sell_price (ask)│     │ price_per_gram  │
│ buy_price (bid) │     │ sell_price (ask)│
│ bid, ask, mid   │     │ buy_price (bid) │
│ spread          │     │ bid, ask, mid   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────────┐
│ gold_price_snapshots│
├─────────────────────┤      ┌───────────────┐
│ price_id → gold_price│     │ wallet_accounts│
│ sell_price (ask)    │      ├───────────────┤
│ buy_price (bid)     │      │ available_bal │
│ expires_at (30s TTL)│      │ locked_bal    │
└──────────┬──────────┘      │ version       │
           │                  └───────┬───────┘
           ▼                          │
    ┌──────────────┐                  │
    │gold_positions│                  │
    ├──────────────┤                  │
    │ grams        │                  ▼
    │ buy_amount   │           ┌─────────────┐
    │ lock_until   │           │wallet_ledger│
    │ status       │           ├─────────────┤
    └──────┬───────┘           │ event_type  │
           │                   │ direction   │
           ▼                   │ amount      │
    ┌───────────┐              │ idempotency │
    │withdrawals│              └─────────────┘
    ├───────────┤
    │ gross_amt │
    │ fee_amt   │
    │ net_amt   │
    └───────────┘
```
