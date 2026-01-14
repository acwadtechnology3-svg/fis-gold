import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const GOLD_URL = "https://egypt.gold-price-today.com/";

/**
 * Fetches and parses 24 karat gold price from egypt.gold-price-today.com
 */
async function scrape24KaratGoldPrice() {
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

    let gold24 = null;

    // Find the row containing عيار 24 (24 karat)
    $("table tr").each((_, row) => {
        const th = $(row).find("th").first();
        const thText = th.text().trim();

        if (thText.includes("عيار 24")) {
            const tds = $(row).find("td");
            if (tds.length >= 2) {
                const sellPrice = $(tds[0]).text().trim();
                const buyPrice = $(tds[1]).text().trim();

                // Extract numeric values
                const sellValue = parseInt(sellPrice.replace(/[^\d]/g, ""), 10);
                const buyValue = parseInt(buyPrice.replace(/[^\d]/g, ""), 10);

                gold24 = {
                    karat: "24",
                    karat_arabic: "عيار 24",
                    sell_price: sellPrice,
                    sell_value: isNaN(sellValue) ? null : sellValue,
                    buy_price: buyPrice,
                    buy_value: isNaN(buyValue) ? null : buyValue,
                    currency: "جنيه مصري (EGP)",
                };
                return false; // Break the loop
            }
        }
    });

    return gold24;
}

/**
 * GET /api/gold/24
 * Returns only 24 karat gold price
 */
export async function GET() {
    try {
        const gold24 = await scrape24KaratGoldPrice();

        if (!gold24) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Could not find 24 karat gold price",
                },
                { status: 404 }
            );
        }

        const response = {
            success: true,
            data: {
                ...gold24,
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
        console.error("Error scraping 24k gold price:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to fetch gold price",
            },
            { status: 500 }
        );
    }
}
