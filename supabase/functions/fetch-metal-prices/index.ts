import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OUNCE_TO_GRAMS = 31.1035;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const metalsApiKey = Deno.env.get('METALS_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get latest prices from database first
    const { data: existingPrices } = await supabase
      .rpc('get_latest_metal_prices');

    let goldPrice = existingPrices?.find((p: any) => p.metal_type === 'gold');
    let silverPrice = existingPrices?.find((p: any) => p.metal_type === 'silver');

    // Check if we need to fetch new prices (older than 1 hour or no prices)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const needsUpdate = !goldPrice || !silverPrice || 
      new Date(goldPrice?.updated_at) < oneHourAgo;

    if (needsUpdate && metalsApiKey) {
      console.log('Fetching fresh prices from Metals-API...');
      
      try {
        // Fetch from Metals-API
        const apiUrl = `https://metals-api.com/api/latest?access_key=${metalsApiKey}&base=EGP&symbols=XAU,XAG`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log('Metals-API response:', JSON.stringify(data));

        if (data.success && data.rates) {
          // API returns price in base currency per ounce of metal
          // Since base is EGP, rates.XAU = EGP per ounce of gold
          const goldPricePerOunce = data.rates.XAU;
          const silverPricePerOunce = data.rates.XAG;

          const goldPricePerGram = goldPricePerOunce / OUNCE_TO_GRAMS;
          const silverPricePerGram = silverPricePerOunce / OUNCE_TO_GRAMS;

          // Calculate buy and sell prices (2% spread for sell price)
          const SPREAD_PERCENTAGE = 0.98; // 2% spread
          const goldBuyPricePerGram = Math.round(goldPricePerGram * 100) / 100;
          const goldSellPricePerGram = Math.round(goldPricePerGram * SPREAD_PERCENTAGE * 100) / 100;
          const silverBuyPricePerGram = Math.round(silverPricePerGram * 100) / 100;
          const silverSellPricePerGram = Math.round(silverPricePerGram * SPREAD_PERCENTAGE * 100) / 100;

          // Store new prices in database
          const { error: goldError } = await supabase
            .from('metal_prices')
            .insert({
              metal_type: 'gold',
              price_per_gram: goldBuyPricePerGram, // Backward compatibility
              buy_price_per_gram: goldBuyPricePerGram,
              sell_price_per_gram: goldSellPricePerGram,
              price_per_ounce: goldPricePerOunce, // Backward compatibility
              buy_price_per_ounce: goldPricePerOunce,
              sell_price_per_ounce: goldPricePerOunce * SPREAD_PERCENTAGE,
              source: 'api'
            });

          if (goldError) {
            console.error('Error inserting gold price:', goldError);
          }

          const { error: silverError } = await supabase
            .from('metal_prices')
            .insert({
              metal_type: 'silver',
              price_per_gram: silverBuyPricePerGram, // Backward compatibility
              buy_price_per_gram: silverBuyPricePerGram,
              sell_price_per_gram: silverSellPricePerGram,
              price_per_ounce: silverPricePerOunce, // Backward compatibility
              buy_price_per_ounce: silverPricePerOunce,
              sell_price_per_ounce: silverPricePerOunce * SPREAD_PERCENTAGE,
              source: 'api'
            });

          if (silverError) {
            console.error('Error inserting silver price:', silverError);
          }

          // Update local variables with new prices
          goldPrice = {
            metal_type: 'gold',
            price_per_gram: goldBuyPricePerGram, // Backward compatibility
            buy_price_per_gram: goldBuyPricePerGram,
            sell_price_per_gram: goldSellPricePerGram,
            price_per_ounce: goldPricePerOunce, // Backward compatibility
            buy_price_per_ounce: goldPricePerOunce,
            sell_price_per_ounce: goldPricePerOunce * SPREAD_PERCENTAGE,
            source: 'api',
            updated_at: new Date().toISOString()
          };

          silverPrice = {
            metal_type: 'silver',
            price_per_gram: silverBuyPricePerGram, // Backward compatibility
            buy_price_per_gram: silverBuyPricePerGram,
            sell_price_per_gram: silverSellPricePerGram,
            price_per_ounce: silverPricePerOunce, // Backward compatibility
            buy_price_per_ounce: silverPricePerOunce,
            sell_price_per_ounce: silverPricePerOunce * SPREAD_PERCENTAGE,
            source: 'api',
            updated_at: new Date().toISOString()
          };

          console.log('Prices updated successfully');
        } else {
          console.error('Metals-API error:', data.error);
        }
      } catch (apiError) {
        console.error('Error fetching from Metals-API:', apiError);
        // Continue with existing prices from database
      }
    }

    // Return prices (either fresh or from database)
    const result = {
      gold: goldPrice ? {
        price_per_gram: goldPrice.buy_price_per_gram || goldPrice.price_per_gram, // Backward compatibility
        buy_price_per_gram: goldPrice.buy_price_per_gram || goldPrice.price_per_gram,
        sell_price_per_gram: goldPrice.sell_price_per_gram,
        price_per_ounce: goldPrice.buy_price_per_ounce || goldPrice.price_per_ounce, // Backward compatibility
        buy_price_per_ounce: goldPrice.buy_price_per_ounce || goldPrice.price_per_ounce,
        sell_price_per_ounce: goldPrice.sell_price_per_ounce,
        source: goldPrice.source,
        updated_at: goldPrice.updated_at
      } : null,
      silver: silverPrice ? {
        price_per_gram: silverPrice.buy_price_per_gram || silverPrice.price_per_gram, // Backward compatibility
        buy_price_per_gram: silverPrice.buy_price_per_gram || silverPrice.price_per_gram,
        sell_price_per_gram: silverPrice.sell_price_per_gram,
        price_per_ounce: silverPrice.buy_price_per_ounce || silverPrice.price_per_ounce, // Backward compatibility
        buy_price_per_ounce: silverPrice.buy_price_per_ounce || silverPrice.price_per_ounce,
        sell_price_per_ounce: silverPrice.sell_price_per_ounce,
        source: silverPrice.source,
        updated_at: silverPrice.updated_at
      } : null,
      is_cached: !needsUpdate || !metalsApiKey
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in fetch-metal-prices function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});