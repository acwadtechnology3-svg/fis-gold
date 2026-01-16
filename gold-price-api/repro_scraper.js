
const fs = require('fs');
const cheerio = require('cheerio');

// Mock function to replicate scraper logic
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
        openingPrice: null,
        changeValue: null,
        changePercent: null,
        price24k: null,
    };

    // 1. Find the 24K gold price from the main table
    $("table.gradient-style tbody tr").each((_, row) => {
        const cells = $(row).find("td, th");
        const firstCell = $(cells[0]).text().trim();

        if (firstCell.includes("24K") || firstCell.includes("24 قيراط")) {
            const priceCell = $(cells[1]).find("span.rate-res").text().trim();
            goldData.price24k = parseNumber(priceCell);
        }
    });

    // 2. Find market indicators
    // Current logic in scraper.js using regex that fails
    const indicatorsSection = $('h2:contains("مؤشرات"), h3:contains("مؤشرات")').parent();

    // We will simulate the looping over all text nodes or rows as per original scraper
    $("table tr, .divTableRow").each((_, row) => {
        const text = $(row).text();

        // Old Regex (Failing)
        if (text.includes("سعر البيع") && !goldData.sellPrice) {
            const match = text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) goldData.sellPrice = parseNumber(match[1]);
        }
        if (text.includes("سعر الشراء") && !goldData.buyPrice) {
            const match = text.match(/EGP\s*([\d,]+\.?\d*)/);
            if (match) goldData.buyPrice = parseNumber(match[1]);
        }
    });

    return goldData;
}

try {
    const html = fs.readFileSync('e:\\fis-golds\\fis-gold-main\\gold-price-api\\gold_page.html', 'utf8');
    const result = runScraper(html);
    console.log("Scraper Result (Before Fix):", JSON.stringify(result, null, 2));
} catch (e) {
    console.error(e);
}
