// ============================================================================
// GOLD PRICE SYNC - Calls gold-price-api cron endpoint
// ============================================================================
// This function triggers the gold-price-api to update prices
// The gold-price-api handles the actual scraping and storing in Supabase
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOLD_PRICE_API_URL = Deno.env.get("GOLD_PRICE_API_URL") || "http://localhost:3000";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

serve(async (req: Request) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });

    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
        console.log(`[${correlationId}] Triggering gold-price-api cron...`);

        // Call the gold-price-api cron endpoint
        // The gold-price-api handles scraping and inserting into Supabase directly
        const headers: HeadersInit = {
            'Accept': 'application/json',
            'X-Correlation-ID': correlationId
        };

        // Add authorization if CRON_SECRET is set
        if (CRON_SECRET) {
            headers['Authorization'] = `Bearer ${CRON_SECRET}`;
        }

        const response = await fetch(`${GOLD_PRICE_API_URL}/api/cron/update-prices`, {
            method: 'GET',
            headers
        });

        const result = await response.json();
        const duration = Date.now() - startTime;

        console.log(`[${correlationId}] Gold-price-api response:`, result);

        // Log to audit
        await supabase.from('audit_logs').insert({
            actor_type: 'system',
            action: 'price_sync_trigger',
            resource_type: 'gold_prices',
            correlation_id: correlationId,
            success: result.success,
            new_data: {
                api_response: result,
                duration_ms: duration,
                source: GOLD_PRICE_API_URL
            }
        }).catch(err => console.error('Audit log error:', err));

        return new Response(
            JSON.stringify({
                success: result.success,
                message: result.message || 'Price sync triggered',
                correlation_id: correlationId,
                api_result: result,
                duration_ms: duration
            }),
            {
                status: response.ok ? 200 : 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${correlationId}] Price sync error:`, error);

        // Log failure
        await supabase.from('audit_logs').insert({
            actor_type: 'system',
            action: 'price_sync_trigger',
            resource_type: 'gold_prices',
            correlation_id: correlationId,
            success: false,
            error_message: error.message,
            new_data: {
                duration_ms: duration,
                source: GOLD_PRICE_API_URL
            }
        }).catch(err => console.error('Audit log error:', err));

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                correlation_id: correlationId,
                duration_ms: duration
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
});
