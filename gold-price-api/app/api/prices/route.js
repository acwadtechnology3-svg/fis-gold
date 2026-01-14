import { NextResponse } from "next/server";
import { getLatestGoldPrice, getLatestSilverPrice, getPriceHistory } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/prices
 * Get the latest gold and silver prices from Supabase
 * 
 * Query params:
 * - history: "true" to get price history
 * - type: "gold" or "silver" (for history)
 * - limit: number of records to return (default 100, max 1000)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const showHistory = searchParams.get("history") === "true";
        const type = searchParams.get("type") || "gold";
        const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);

        if (showHistory) {
            const history = await getPriceHistory(type, limit);
            return NextResponse.json({
                success: true,
                data: {
                    type,
                    count: history?.length || 0,
                    prices: history || [],
                },
            });
        }

        // Get latest prices
        const [goldPrice, silverPrice] = await Promise.all([
            getLatestGoldPrice().catch(() => null),
            getLatestSilverPrice().catch(() => null),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                gold: goldPrice
                    ? {
                        karat: goldPrice.karat,
                        sell_price: goldPrice.sell_price,
                        buy_price: goldPrice.buy_price,
                        opening_price: goldPrice.opening_price,
                        change_value: goldPrice.change_value,
                        change_percent: goldPrice.change_percent,
                        currency: goldPrice.currency,
                        updated_at: goldPrice.created_at,
                    }
                    : null,
                silver: silverPrice
                    ? {
                        price_per_gram: silverPrice.price_per_gram,
                        price_per_ounce: silverPrice.price_per_ounce,
                        sell_price: silverPrice.sell_price,
                        buy_price: silverPrice.buy_price,
                        currency: silverPrice.currency,
                        updated_at: silverPrice.created_at,
                    }
                    : null,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Error fetching prices:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to fetch prices",
            },
            { status: 500 }
        );
    }
}
