
const fs = require('fs');
const cheerio = require('cheerio');

function parseNumber(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function runScraper(html) {
    const $ = cheerio.load(html);
    let goldData = {
        karat: "24",
        sellPrice: null,
        buyPrice: null,
        openingPrice: null, // Opening price
        changeValue: null,
        changePercent: null,
        price24k: null,
    };

    // 1. Find the 24K gold price
    $("table.gradient-style tbody tr").each((_, row) => {
        const cells = $(row).find("td, th");
        const firstCell = $(cells[0]).text().trim();

        if (firstCell.includes("24K") || firstCell.includes("24 قيراط")) {
            const priceCell = $(cells[1]).find("span.rate-res").text().trim();
            goldData.price24k = parseNumber(priceCell);
        }
    });

    // 2. Find market indicators with IMPROVED logic
    $("table tr, .divTableRow").each((_, row) => {
        const text = $(row).text();

        // Regex to match number followed by EGP OR EGP followed by number
        // Matches: "123.45 EGP" or "EGP 123.45"
        const priceRegex = /(?:EGP\s*)?([\d,]+\.?\d*)(?:\s*EGP)?/;

        if (text.includes("سعر البيع") && !goldData.sellPrice) {
            // Extract number from the cell that has the value
            // The structure is usually <th>Header</th><td>Value</td>
            // So we should look at the <td> text if possible, but the original code just checked row text.
            // We will refine the regex to be more robust.

            // In the HTML dump: <th>سعر البيع</th><td>217,221.76 EGP</td>
            // The row text contains both.

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

    return goldData;
}

try {
    const html = fs.readFileSync('e:\\fis-golds\\fis-gold-main\\gold-price-api\\gold_page.html', 'utf8');
    const result = runScraper(html);
    console.log("Scraper Result (After Fix):", JSON.stringify(result, null, 2));
} catch (e) {
    console.error(e);
}
