# Egypt Gold & Silver Price API 🥇🥈

Real-time gold (24K) and silver prices API for Egypt, powered by Next.js, Vercel Cron, and Supabase.

## Features

- ✅ **24 Karat Gold Prices** - Buy and sell prices
- ✅ **Silver Prices** - Per gram and per ounce
- ✅ **Auto-updates every 1 minute** via Vercel Cron
- ✅ **Price history** stored in Supabase
- ✅ **RESTful API** for easy integration

## Data Source

Prices are scraped from [goldpricedata.com](https://www.goldpricedata.com/gold-rates/egypt/) which updates prices per second.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API documentation |
| `GET /api/prices` | Get latest gold & silver prices from database |
| `GET /api/prices?history=true&type=gold` | Get gold price history |
| `GET /api/prices?history=true&type=silver` | Get silver price history |
| `GET /api/gold` | Live scrape all gold karat prices |
| `GET /api/gold/24` | Live scrape 24K gold price only |

## Example Response

```json
{
  "success": true,
  "data": {
    "gold": {
      "karat": "24",
      "sell_price": 218638.60,
      "buy_price": 218660.47,
      "opening_price": 218848.01,
      "change_value": 1801.52,
      "change_percent": 0.83,
      "currency": "EGP",
      "updated_at": "2026-01-14T14:00:00.000Z"
    },
    "silver": {
      "price_per_gram": 139.24,
      "price_per_ounce": 4331.05,
      "sell_price": 139.24,
      "buy_price": 139.24,
      "currency": "EGP",
      "updated_at": "2026-01-14T14:00:00.000Z"
    }
  }
}
```

## Setup

### 1. Create Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=your_optional_cron_secret
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Settings > Environment Variables
```

### 4. Verify Cron Job

After deployment, the cron job will automatically run every minute. Check:
- Vercel Dashboard > Logs for cron execution
- Supabase Dashboard > Table Editor to see stored prices

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test the cron endpoint manually
curl http://localhost:3000/api/cron/update-prices
```

## Cron Job Setup with cron-job.org

Since Vercel's free plan only allows daily cron jobs, we use [cron-job.org](https://cron-job.org) for 1-minute price updates.

### Setup Steps:

1. **Create an account** at [console.cron-job.org](https://console.cron-job.org)

2. **Create a new cron job** with these settings:
   - **Title**: `Update Gold Prices`
   - **URL**: `https://YOUR-VERCEL-URL.vercel.app/api/cron/update-prices`
   - **Schedule**: Every 1 minute (`*/1 * * * *`)
   - **Method**: GET
   - **Timeout**: 30 seconds

3. **Add Authorization Header** (if CRON_SECRET is set):
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_CRON_SECRET`

4. **Test the job** by clicking "Run now" in the dashboard

### Cron Job Console URL
[https://console.cron-job.org/jobs](https://console.cron-job.org/jobs)

## Tech Stack

- **Framework**: Next.js 16
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Scraping**: Cheerio

## License

MIT
