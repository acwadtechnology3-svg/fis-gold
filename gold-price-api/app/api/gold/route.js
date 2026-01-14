import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const GOLD_URL = "https://egypt.gold-price-today.com/";

/**
 * Fetches and parses gold prices from egypt.gold-price-today.com
 */
async function scrapeGoldPrices() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  const response = await fetch(GOLD_URL, {
    headers,
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const karats = ["عيار 24", "عيار 22", "عيار 21", "عيار 18", "عيار 14", "عيار 12"];
  const prices = [];

  // Find all tables and look for gold price rows
  $("table tr").each((_, row) => {
    const th = $(row).find("th").first();
    const thText = th.text().trim();

    for (const karat of karats) {
      if (thText.includes(karat)) {
        const tds = $(row).find("td");
        if (tds.length >= 2) {
          const sellPrice = $(tds[0]).text().trim();
          const buyPrice = $(tds[1]).text().trim();

          // Extract numeric values
          const sellValue = parseInt(sellPrice.replace(/[^\d]/g, ""), 10);
          const buyValue = parseInt(buyPrice.replace(/[^\d]/g, ""), 10);

          // Extract karat number
          const karatNumber = karat.replace(/[^\d]/g, "");

          prices.push({
            karat: karatNumber,
            karat_arabic: karat,
            sell_price: sellPrice,
            sell_value: isNaN(sellValue) ? null : sellValue,
            buy_price: buyPrice,
            buy_value: isNaN(buyValue) ? null : buyValue,
            currency: "جنيه مصري (EGP)",
          });
        }
        break;
      }
    }
  });

  return prices;
}

/**
 * GET /api/gold
 * Returns all gold prices
 * 
 * Query params:
 * - karat: Filter by karat (e.g., ?karat=24)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const karatFilter = searchParams.get("karat");

    const prices = await scrapeGoldPrices();

    // Filter by karat if specified
    let filteredPrices = prices;
    if (karatFilter) {
      filteredPrices = prices.filter((p) => p.karat === karatFilter);
    }

    const response = {
      success: true,
      data: {
        prices: filteredPrices,
        timestamp: new Date().toISOString(),
        source: GOLD_URL,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error scraping gold prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch gold prices",
      },
      { status: 500 }
    );
  }
}
