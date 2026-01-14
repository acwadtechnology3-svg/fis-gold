import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("Supabase credentials not configured");
}

export const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * Insert gold price into Supabase
 */
export async function insertGoldPrice(data) {
    if (!supabase) {
        throw new Error("Supabase not configured");
    }

    const { data: result, error } = await supabase
        .from("gold_prices")
        .insert({
            karat: data.karat || "24",
            sell_price: data.sellPrice,
            buy_price: data.buyPrice,
            opening_price: data.openingPrice || null,
            change_value: data.changeValue || null,
            change_percent: data.changePercent || null,
            currency: "EGP",
            source: data.source,
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return result;
}

/**
 * Insert silver price into Supabase
 */
export async function insertSilverPrice(data) {
    if (!supabase) {
        throw new Error("Supabase not configured");
    }

    const { data: result, error } = await supabase
        .from("silver_prices")
        .insert({
            price_per_gram: data.pricePerGram,
            price_per_ounce: data.pricePerOunce || null,
            sell_price: data.sellPrice || null,
            buy_price: data.buyPrice || null,
            currency: "EGP",
            source: data.source,
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return result;
}

/**
 * Get latest gold price from Supabase
 */
export async function getLatestGoldPrice() {
    if (!supabase) {
        throw new Error("Supabase not configured");
    }

    const { data, error } = await supabase
        .from("gold_prices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== "PGRST116") {
        throw error;
    }

    return data;
}

/**
 * Get latest silver price from Supabase
 */
export async function getLatestSilverPrice() {
    if (!supabase) {
        throw new Error("Supabase not configured");
    }

    const { data, error } = await supabase
        .from("silver_prices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== "PGRST116") {
        throw error;
    }

    return data;
}

/**
 * Get price history
 */
export async function getPriceHistory(type = "gold", limit = 100) {
    if (!supabase) {
        throw new Error("Supabase not configured");
    }

    const table = type === "gold" ? "gold_prices" : "silver_prices";

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        throw error;
    }

    return data;
}
