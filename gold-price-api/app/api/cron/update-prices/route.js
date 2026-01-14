import { NextResponse } from "next/server";
import { scrapeGoldPrices, scrapeSilverPrices } from "@/lib/scraper";
import { insertGoldPrice, insertSilverPrice } from "@/lib/supabase";

// Vercel Cron Job Configuration
// This runs every 1 minute
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/cron/update-prices
 * 
 * This endpoint is called by Vercel Cron every minute to:
 * 1. Scrape the latest gold (24K) and silver prices
 * 2. Store them in Supabase
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request) {
    try {
        // Verify cron secret (optional but recommended)
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const results = {
            gold: null,
            silver: null,
            errors: [],
        };

        // Scrape and store gold prices
        try {
            console.log("Scraping gold prices...");
            const goldData = await scrapeGoldPrices();
            console.log("Gold data:", goldData);

            if (goldData && (goldData.sellPrice || goldData.price24k)) {
                const goldRecord = await insertGoldPrice(goldData);
                results.gold = {
                    success: true,
                    data: goldRecord,
                };
                console.log("Gold price inserted:", goldRecord);
            } else {
                results.gold = {
                    success: false,
                    error: "No gold price data found",
                    rawData: goldData,
                };
                results.errors.push("Failed to scrape gold prices");
            }
        } catch (error) {
            console.error("Error with gold prices:", error);
            results.gold = {
                success: false,
                error: error.message,
            };
            results.errors.push(`Gold: ${error.message}`);
        }

        // Scrape and store silver prices
        try {
            console.log("Scraping silver prices...");
            const silverData = await scrapeSilverPrices();
            console.log("Silver data:", silverData);

            if (silverData && silverData.pricePerGram) {
                const silverRecord = await insertSilverPrice(silverData);
                results.silver = {
                    success: true,
                    data: silverRecord,
                };
                console.log("Silver price inserted:", silverRecord);
            } else {
                results.silver = {
                    success: false,
                    error: "No silver price data found",
                    rawData: silverData,
                };
                results.errors.push("Failed to scrape silver prices");
            }
        } catch (error) {
            console.error("Error with silver prices:", error);
            results.silver = {
                success: false,
                error: error.message,
            };
            results.errors.push(`Silver: ${error.message}`);
        }

        const allSuccess = results.gold?.success && results.silver?.success;

        return NextResponse.json({
            success: allSuccess,
            message: allSuccess
                ? "Prices updated successfully"
                : "Some prices failed to update",
            timestamp: new Date().toISOString(),
            results,
        });
    } catch (error) {
        console.error("Cron job error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to update prices",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
