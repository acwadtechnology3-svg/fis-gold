import { NextResponse } from "next/server";
import { scrapeGoldPrices, scrapeSilverPrices } from "@/lib/scraper";

export const dynamic = "force-dynamic";

/**
 * GET /api/scrape/test
 * Test endpoint to verify scraping works (no Supabase needed)
 */
export async function GET() {
    try {
        const [goldData, silverData] = await Promise.all([
            scrapeGoldPrices().catch((e) => ({ error: e.message })),
            scrapeSilverPrices().catch((e) => ({ error: e.message })),
        ]);

        return NextResponse.json({
            success: true,
            message: "Scraping test completed",
            timestamp: new Date().toISOString(),
            data: {
                gold: goldData,
                silver: silverData,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
