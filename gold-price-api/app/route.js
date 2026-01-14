import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Egypt Gold & Silver Price API",
    version: "2.0.0",
    description: "API to get real-time gold (24K) and silver prices in Egypt, updated every minute via Vercel Cron",
    source: "https://www.goldpricedata.com/gold-rates/egypt/",
    endpoints: {
      "/api/prices": {
        method: "GET",
        description: "Get latest gold (24K) and silver prices from database",
        queryParams: {
          history: "Set to 'true' to get price history",
          type: "For history: 'gold' or 'silver'",
          limit: "Number of records (default 100, max 1000)"
        },
        example: "/api/prices?history=true&type=gold&limit=50"
      },
      "/api/gold": {
        method: "GET",
        description: "Get all gold karat prices (live scrape)",
        queryParams: {
          karat: "Filter by karat number (e.g., ?karat=24)"
        }
      },
      "/api/gold/24": {
        method: "GET",
        description: "Get only 24 karat gold price (live scrape)"
      },
      "/api/cron/update-prices": {
        method: "GET",
        description: "Cron endpoint - updates prices every minute (protected)",
        note: "This is called automatically by Vercel Cron"
      }
    },
    database: "Supabase",
    update_frequency: "Every 1 minute",
    features: [
      "24 Karat Gold buy/sell prices",
      "Silver prices (gram and ounce)",
      "Price history tracking",
      "Real-time data from goldpricedata.com"
    ],
    setup: {
      step1: "Create Supabase project and run supabase-schema.sql",
      step2: "Add environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
      step3: "Deploy to Vercel",
      step4: "Cron job will automatically start updating prices"
    }
  });
}
