import * as cheerio from "cheerio";

const GOLD_URL = "https://www.goldpricedata.com/gold-rates/egypt/";
const SILVER_URL = "https://www.goldpricedata.com/silver-rates/egypt/";

const headers = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
};

/**
 * Parse a number from Arabic/English text
 */
function parseNumber(text) {
    if (!text) return null;
    // Remove non-numeric characters except decimal point and minus
    const cleaned = text.replace(/[^\d.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

/**
 * Scrape 24K gold prices from goldpricedata.com
 * Returns buy/sell prices for gold ounce
 */
export async function scrapeGoldPrices() {
    const response = await fetch(GOLD_URL, { headers });

    if (!response.ok) {
        throw new Error(`Failed to fetch gold prices: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let goldData = {
        karat: "24",
        sellPrice: null,
        buyPrice: null,
        openingPrice: null,
        changeValue: null,
        changePercent: null,
        price24k: null,
        source: GOLD_URL,
    };

    // Find the 24K gold price from the main table
    $("table.gradient-style tbody tr").each((_, row) => {
        const cells = $(row).find("td, th");
        const firstCell = $(cells[0]).text().trim();

        if (firstCell.includes("24K") || firstCell.includes("24 قيراط")) {
            const priceCell = $(cells[1]).find("span.rate-res").text().trim();
            goldData.price24k = parseNumber(priceCell);
        }
    });

    // Also try to find from data-u attribute
    const price24kSpan = $('span[data-u="XAU24K-1-rate"]');
    if (price24kSpan.length > 0) {
        goldData.price24k = parseNumber(price24kSpan.text());
    }

    // Find market indicators (buy/sell prices for ounce)
    // Look for the indicators section
    const indicatorsSection = $('h2:contains("مؤشرات"), h3:contains("مؤشرات")').parent();

    // Search for sell price (سعر البيع)
    $("*").each((_, el) => {
        const text = $(el).text();
        const priceRegex = /(?:EGP\s*)?([\d,]+\.?\d*)(?:\s*EGP)?/;

        if (text.includes("سعر البيع") && !goldData.sellPrice) {
            // Find the price value nearby
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) {
                let price = parseNumber(match[1]);
                // Normalize to per gram if it looks like Ounce price (> 10,000)
                if (price > 10000) {
                    price = price / 31.1035;
                }
                goldData.sellPrice = price;
            }
        }
        if (text.includes("سعر الشراء") && !goldData.buyPrice) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) {
                let price = parseNumber(match[1]);
                if (price > 10000) {
                    price = price / 31.1035;
                }
                goldData.buyPrice = price;
            }
        }
        if (text.includes("سعر الفتح") && !goldData.openingPrice) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) {
                let price = parseNumber(match[1]);
                if (price > 10000) {
                    price = price / 31.1035;
                }
                goldData.openingPrice = price;
            }
        }
    });

    // Alternative: Look for specific table rows with market indicators
    $("table tr, .divTableRow").each((_, row) => {
        const text = $(row).text();

        if (text.includes("سعر البيع") && !goldData.sellPrice) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) {
                let price = parseNumber(match[1]);
                if (price > 10000) price = price / 31.1035;
                goldData.sellPrice = price;
            }
        }
        if (text.includes("سعر الشراء") && !goldData.buyPrice) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) {
                let price = parseNumber(match[1]);
                if (price > 10000) price = price / 31.1035;
                goldData.buyPrice = price;
            }
        }
        if (text.includes("سعر الفتح") && !goldData.openingPrice) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) {
                let price = parseNumber(match[1]);
                if (price > 10000) price = price / 31.1035;
                goldData.openingPrice = price;
            }
        }
        if (text.includes("التغير") && !text.includes("نسبة") && !goldData.changeValue) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) {
                let price = parseNumber(match[1]);
                // Change value might differ in magnitude, stick to as-is or normalize? 
                // Change is also for Ounce usually in that table.
                if (Math.abs(price) > 500) price = price / 31.1035;
                goldData.changeValue = price;
            }
        }
        if (text.includes("نسبة التغير") && goldData.changePercent === null) {
            const match = text.match(/([-\d.]+)%/);
            if (match) goldData.changePercent = parseNumber(match[1]);
        }
    });

    // If we got the 24K per gram price but not buy/sell, use 24K as both
    if (goldData.price24k && !goldData.sellPrice) {
        goldData.sellPrice = goldData.price24k;
    }
    if (goldData.price24k && !goldData.buyPrice) {
        goldData.buyPrice = goldData.price24k;
    }

    return goldData;
}

/**
 * Scrape silver prices from goldpricedata.com
 */
export async function scrapeSilverPrices() {
    const response = await fetch(SILVER_URL, { headers });

    if (!response.ok) {
        throw new Error(`Failed to fetch silver prices: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let silverData = {
        pricePerGram: null,
        pricePerOunce: null,
        sellPrice: null,
        buyPrice: null,
        source: SILVER_URL,
    };

    // Find silver gram price from the main table
    $("table.gradient-style tbody tr").each((_, row) => {
        const cells = $(row).find("td, th");
        const firstCell = $(cells[0]).text().trim();

        // Look for gram row (جرام)
        if (firstCell.includes("جرام") || firstCell.includes("Gram")) {
            const priceCell = $(cells[1]).find("span.rate-res").text().trim();
            silverData.pricePerGram = parseNumber(priceCell);
        }

        // Look for ounce row (أونصة)
        if (firstCell.includes("أونصة") || firstCell.includes("Ounce")) {
            const priceCell = $(cells[1]).find("span.rate-res").text().trim();
            silverData.pricePerOunce = parseNumber(priceCell);
        }
    });

    // Try data-u attributes
    const silverGramSpan = $('span[data-u="XAG-1-rate"]');
    if (silverGramSpan.length > 0 && !silverData.pricePerGram) {
        silverData.pricePerGram = parseNumber(silverGramSpan.text());
    }

    // Look for any rate-res spans with silver prices
    $("span.rate-res").each((_, span) => {
        const price = parseNumber($(span).text());
        if (price && price > 100 && price < 500 && !silverData.pricePerGram) {
            // Silver gram price is typically in this range
            silverData.pricePerGram = price;
        }
        if (price && price > 3000 && price < 10000 && !silverData.pricePerOunce) {
            // Silver ounce price is typically in this range
            silverData.pricePerOunce = price;
        }
    });

    // Find market indicators for silver
    $("table tr, .divTableRow").each((_, row) => {
        const text = $(row).text();

        if (text.includes("سعر البيع") && !silverData.sellPrice) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) silverData.sellPrice = parseNumber(match[1]);
        }
        if (text.includes("سعر الشراء") && !silverData.buyPrice) {
            const match = text.match(/([\d,]+\.?\d*)\s*EGP/) || text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) silverData.buyPrice = parseNumber(match[1]);
        }
    });

    // If we got gram price but not sell/buy, use gram price as both
    if (silverData.pricePerGram && !silverData.sellPrice) {
        silverData.sellPrice = silverData.pricePerGram;
    }
    if (silverData.pricePerGram && !silverData.buyPrice) {
        silverData.buyPrice = silverData.pricePerGram;
    }

    return silverData;
}
