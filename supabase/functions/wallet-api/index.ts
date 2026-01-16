// ============================================================================
// WALLET + GOLD INVESTMENT SYSTEM - EDGE FUNCTIONS
// ============================================================================
// (D) Edge Functions Design - Endpoints, Responsibilities, Transaction Logic
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOLD_PRICE_API_URL = Deno.env.get("GOLD_PRICE_API_URL") || "https://your-gold-price-api.vercel.app";

// Price snapshot TTL in seconds
const SNAPSHOT_TTL_SECONDS = 30;

// Rate limiting (in-memory for simplicity, use Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

// ============================================================================
// HELPERS
// ============================================================================

// Create Supabase client with service role (bypasses RLS)
function getServiceClient() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
}

// Create Supabase client for user (respects RLS)
function getUserClient(authHeader: string) {
    return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
    });
}

// Generate SHA256 hash
async function sha256(data: string): Promise<string> {
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Rate limiting check
function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = rateLimits.get(key);

    if (!record || record.resetAt < now) {
        rateLimits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count++;
    return true;
}

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Idempotency-Key, x-client-info, apikey"
};

// Standard error response
function errorResponse(message: string, status: number = 400, details?: any) {
    return new Response(
        JSON.stringify({ success: false, error: message, details }),
        { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
}

// Standard success response
function successResponse(data: any, status: number = 200) {
    return new Response(
        JSON.stringify({ success: true, data }),
        { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
}

// ============================================================================
// (E) TRANSACTION HELPERS - Locking & Idempotency
// ============================================================================

interface TransactionContext {
    supabase: any;
    userId: string;
    correlationId: string;
}

/**
 * Execute a money-changing operation with proper locking and idempotency.
 * 
 * TRANSACTION STEPS:
 * 1. Begin transaction
 * 2. Check/create idempotency key (or return cached result)
 * 3. Lock wallet row: SELECT ... FOR UPDATE
 * 4. Execute operation callback
 * 5. Insert ledger entry
 * 6. Update wallet_accounts balance
 * 7. Commit transaction
 */
async function executeMoneyTransaction<T>(
    ctx: TransactionContext,
    operationType: string,
    idempotencyKey: string,
    requestHash: string,
    operation: (walletLock: any) => Promise<{
        ledgerEntry: any;
        balanceChanges: { available?: number; locked?: number };
        result: T;
    }>
): Promise<{ success: boolean; data?: T; cached?: boolean; error?: string }> {

    const { supabase, userId, correlationId } = ctx;

    // Step 1: Check idempotency key
    const { data: existingKey } = await supabase
        .from("idempotency_keys")
        .select("*")
        .eq("user_id", userId)
        .eq("key", idempotencyKey)
        .eq("operation_type", operationType)
        .single();

    if (existingKey) {
        if (existingKey.status === "completed") {
            // Return cached result
            return { success: true, data: existingKey.response_body, cached: true };
        }
        if (existingKey.status === "processing") {
            // Operation in progress, reject duplicate
            return { success: false, error: "Operation already in progress" };
        }
    }

    // Step 2: Create idempotency record (or handle conflict)
    const { error: idempotencyError } = await supabase
        .from("idempotency_keys")
        .upsert({
            user_id: userId,
            key: idempotencyKey,
            operation_type: operationType,
            request_hash: requestHash,
            status: "processing"
        }, { onConflict: "user_id,key,operation_type" });

    if (idempotencyError) {
        return { success: false, error: "Idempotency conflict" };
    }

    try {
        // Step 3: Lock wallet row with FOR UPDATE
        // Using raw SQL for explicit locking
        const { data: walletLock, error: lockError } = await supabase
            .rpc("lock_wallet_for_update", { p_user_id: userId });

        if (lockError || !walletLock) {
            throw new Error("Failed to acquire wallet lock");
        }

        // Step 4: Execute the operation
        const { ledgerEntry, balanceChanges, result } = await operation(walletLock);

        // Step 5: Insert ledger entry
        const { error: ledgerError } = await supabase
            .from("wallet_ledger")
            .insert({
                ...ledgerEntry,
                user_id: userId,
                correlation_id: correlationId,
                idempotency_key: `${operationType}:${idempotencyKey}`
            });

        if (ledgerError) {
            throw new Error(`Ledger insert failed: ${ledgerError.message}`);
        }

        // Step 6: Update wallet balance atomically
        const newAvailable = walletLock.available_balance + (balanceChanges.available || 0);
        const newLocked = walletLock.locked_balance + (balanceChanges.locked || 0);

        if (newAvailable < 0 || newLocked < 0) {
            throw new Error("Insufficient balance");
        }

        const { error: updateError } = await supabase
            .from("wallet_accounts")
            .update({
                available_balance: newAvailable,
                locked_balance: newLocked,
                version: walletLock.version + 1
            })
            .eq("user_id", userId)
            .eq("version", walletLock.version); // Optimistic lock check

        if (updateError) {
            throw new Error("Concurrent modification detected");
        }

        // Step 7: Mark idempotency key as completed
        await supabase
            .from("idempotency_keys")
            .update({
                status: "completed",
                response_status: 200,
                response_body: result,
                completed_at: new Date().toISOString()
            })
            .eq("user_id", userId)
            .eq("key", idempotencyKey)
            .eq("operation_type", operationType);

        return { success: true, data: result };

    } catch (error) {
        // Mark idempotency key as failed
        await supabase
            .from("idempotency_keys")
            .update({
                status: "failed",
                response_status: 500,
                completed_at: new Date().toISOString()
            })
            .eq("user_id", userId)
            .eq("key", idempotencyKey)
            .eq("operation_type", operationType);

        return { success: false, error: error.message };
    }
}

// ============================================================================
// ENDPOINT: POST /wallet/deposit/initiate
// ============================================================================
/*
Creates a pending deposit and returns provider payment session info.

Request:
{
  "amount": 1000,
  "currency": "EGP",
  "provider": "paymob",
  "idempotency_key": "uuid-v4"
}

Response:
{
  "success": true,
  "data": {
    "deposit_id": "uuid",
    "provider_session_id": "abc123",
    "payment_url": "https://...",
    "expires_at": "2024-01-14T20:00:00Z"
  }
}
*/
async function handleDepositInitiate(req: Request): Promise<Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const supabase = getServiceClient();
    const userClient = getUserClient(authHeader);

    // Get authenticated user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);

    // Rate limit: 10 deposit initiations per minute per user
    if (!checkRateLimit(`deposit:${user.id}`, 10, 60000)) {
        return errorResponse("Rate limit exceeded", 429);
    }

    const body = await req.json();
    const { amount, currency = "EGP", provider = "paymob", idempotency_key } = body;

    // Validation
    if (!amount || amount <= 0) return errorResponse("Invalid amount");
    if (!idempotency_key) return errorResponse("Idempotency key required");

    // Check for duplicate (idempotent)
    const { data: existing } = await supabase
        .from("deposits")
        .select("id, status, provider_session_id")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotency_key)
        .single();

    if (existing) {
        // Return existing deposit info
        return successResponse({
            deposit_id: existing.id,
            provider_session_id: existing.provider_session_id,
            status: existing.status,
            cached: true
        });
    }

    // Create deposit record
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const { data: deposit, error: depositError } = await supabase
        .from("deposits")
        .insert({
            user_id: user.id,
            provider,
            amount,
            currency,
            status: "initiated",
            idempotency_key,
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

    if (depositError) {
        return errorResponse(`Failed to create deposit: ${depositError.message}`, 500);
    }

    // TODO: Call payment provider API to create payment session
    // This is provider-specific (Paymob, Stripe, Fawry, etc.)
    const providerSessionId = `mock_session_${deposit.id}`;
    const paymentUrl = `https://payment.provider.com/pay/${providerSessionId}`;

    // Update deposit with provider session
    await supabase
        .from("deposits")
        .update({
            provider_session_id: providerSessionId,
            status: "pending"
        })
        .eq("id", deposit.id);

    // Audit log
    await supabase.from("audit_logs").insert({
        actor_id: user.id,
        actor_type: "user",
        action: "deposit_initiated",
        resource_type: "deposit",
        resource_id: deposit.id,
        new_data: { amount, currency, provider }
    });

    return successResponse({
        deposit_id: deposit.id,
        provider_session_id: providerSessionId,
        payment_url: paymentUrl,
        expires_at: expiresAt.toISOString()
    });
}

// ============================================================================
// ENDPOINT: POST /wallet/deposit/webhook
// ============================================================================
/*
Validates provider signature, ensures idempotency, settles deposit.

Headers:
- X-Provider-Signature: HMAC signature from payment provider

Request (from payment provider):
{
  "reference": "deposit_id",
  "status": "success",
  "amount": 1000,
  "provider_ref": "TXN123"
}
*/
async function handleDepositWebhook(req: Request): Promise<Response> {
    const supabase = getServiceClient();
    const correlationId = crypto.randomUUID();

    // Verify webhook signature
    const signature = req.headers.get("X-Provider-Signature");
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");

    if (webhookSecret) {
        const expectedSignature = await sha256(`${rawBody}${webhookSecret}`);
        if (signature !== expectedSignature) {
            console.error("Invalid webhook signature");
            return errorResponse("Invalid signature", 401);
        }
    }

    const body = JSON.parse(rawBody);
    const { reference: depositId, status, amount, provider_ref } = body;

    // Get deposit
    const { data: deposit, error: fetchError } = await supabase
        .from("deposits")
        .select("*")
        .eq("id", depositId)
        .single();

    if (fetchError || !deposit) {
        return errorResponse("Deposit not found", 404);
    }

    // Check if already processed (idempotent)
    if (deposit.status === "settled") {
        return successResponse({ message: "Already processed", deposit_id: depositId });
    }

    // Compute payload hash to detect duplicates
    const payloadHash = await sha256(rawBody);
    if (deposit.webhook_payload_hash === payloadHash) {
        return successResponse({ message: "Duplicate webhook", deposit_id: depositId });
    }

    if (status !== "success") {
        // Mark as failed
        await supabase
            .from("deposits")
            .update({
                status: "failed",
                status_reason: `Provider returned: ${status}`,
                webhook_received_at: new Date().toISOString(),
                webhook_payload_hash: payloadHash
            })
            .eq("id", depositId);

        return successResponse({ message: "Deposit marked as failed" });
    }

    // Verify amount matches
    if (Number(amount) !== Number(deposit.amount)) {
        console.error(`Amount mismatch: expected ${deposit.amount}, got ${amount}`);
        return errorResponse("Amount mismatch", 400);
    }

    // Execute deposit settlement with transaction
    const result = await executeMoneyTransaction(
        { supabase, userId: deposit.user_id, correlationId },
        "deposit",
        `deposit_settle_${depositId}`,
        payloadHash,
        async (walletLock) => {
            // Calculate new balance
            const newBalance = Number(walletLock.available_balance) + Number(deposit.amount);

            return {
                ledgerEntry: {
                    event_type: "deposit_credit",
                    direction: "credit",
                    amount: deposit.amount,
                    currency: deposit.currency,
                    balance_type: "available",
                    balance_after: newBalance,
                    related_table: "deposits",
                    related_id: depositId,
                    description: `Deposit from ${deposit.provider}`
                },
                balanceChanges: { available: Number(deposit.amount) },
                result: { deposit_id: depositId, amount: deposit.amount }
            };
        }
    );

    if (!result.success) {
        return errorResponse(result.error || "Settlement failed", 500);
    }

    // Update deposit status
    await supabase
        .from("deposits")
        .update({
            status: "settled",
            provider_ref,
            settled_at: new Date().toISOString(),
            webhook_received_at: new Date().toISOString(),
            webhook_payload_hash: payloadHash
        })
        .eq("id", depositId);

    // Audit log
    await supabase.from("audit_logs").insert({
        actor_id: deposit.user_id,
        actor_type: "webhook",
        action: "deposit_settled",
        resource_type: "deposit",
        resource_id: depositId,
        correlation_id: correlationId,
        new_data: { amount: deposit.amount, provider_ref }
    });

    return successResponse({ message: "Deposit settled", deposit_id: depositId });
}

// ============================================================================
// ENDPOINT: GET /wallet/balance
// ============================================================================
async function handleGetBalance(req: Request): Promise<Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const userClient = getUserClient(authHeader);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);

    const { data: wallet, error } = await userClient
        .from("wallet_accounts")
        .select("available_balance, locked_balance, currency, updated_at")
        .eq("user_id", user.id)
        .single();

    if (error) {
        // Create wallet if doesn't exist
        const supabase = getServiceClient();
        await supabase.from("wallet_accounts").insert({
            user_id: user.id,
            available_balance: 0,
            locked_balance: 0,
            currency: "EGP"
        });

        return successResponse({
            available_balance: 0,
            locked_balance: 0,
            total_balance: 0,
            currency: "EGP"
        });
    }

    return successResponse({
        available_balance: wallet.available_balance,
        locked_balance: wallet.locked_balance,
        total_balance: Number(wallet.available_balance) + Number(wallet.locked_balance),
        currency: wallet.currency,
        updated_at: wallet.updated_at
    });
}

// ============================================================================
// ENDPOINT: GET /gold/price/today
// ============================================================================
async function handleGetGoldPrice(req: Request): Promise<Response> {
    const supabase = getServiceClient();

    // Rate limit: 100 requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`price:${ip}`, 100, 60000)) {
        return errorResponse("Rate limit exceeded", 429);
    }

    // Get latest gold price from gold_prices table (from gold-price-api)
    const { data: goldPrice, error: goldError } = await supabase
        .from("gold_prices")
        .select("*")
        .eq("karat", "24")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    // Get latest silver price from silver_prices table (from gold-price-api)
    const { data: silverPrice, error: silverError } = await supabase
        .from("silver_prices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if ((goldError && silverError) || (!goldPrice && !silverPrice)) {
        return errorResponse("Price data unavailable", 503);
    }

    return successResponse({
        gold: goldPrice ? {
            karat: goldPrice.karat,
            sell_price: goldPrice.sell_price, // Ask - user buys at this
            buy_price: goldPrice.buy_price,   // Bid - user sells at this
            opening_price: goldPrice.opening_price,
            change_percent: goldPrice.change_percent,
            currency: goldPrice.currency,
            updated_at: goldPrice.created_at
        } : null,
        silver: silverPrice ? {
            price_per_gram: silverPrice.price_per_gram,
            price_per_ounce: silverPrice.price_per_ounce,
            sell_price: silverPrice.sell_price,
            buy_price: silverPrice.buy_price,
            currency: silverPrice.currency,
            updated_at: silverPrice.created_at
        } : null,
        timestamp: new Date().toISOString()
    });
}

// ============================================================================
// ENDPOINT: POST /gold/price/snapshot
// ============================================================================
/*
Creates a price snapshot with TTL for buy orders.

Response:
{
  "snapshot_id": "uuid",
  "bid": 7000,
  "ask": 7030,
  "expires_at": "2024-01-14T19:30:30Z"
}
*/
async function handleCreatePriceSnapshot(req: Request): Promise<Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const supabase = getServiceClient();
    const userClient = getUserClient(authHeader);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const { metal_type = "gold", client_request_id } = body;

    let latestPrice: any;
    let priceError: any;

    if (metal_type === "gold") {
        // Get latest gold price from gold_prices table
        const result = await supabase
            .from("gold_prices")
            .select("*")
            .eq("karat", "24")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
        latestPrice = result.data;
        priceError = result.error;
    } else {
        // Get latest silver price from silver_prices table  
        const result = await supabase
            .from("silver_prices")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
        latestPrice = result.data;
        priceError = result.error;
    }

    if (priceError || !latestPrice) {
        return errorResponse("Price unavailable", 503);
    }

    const expiresAt = new Date(Date.now() + SNAPSHOT_TTL_SECONDS * 1000);

    // Map to sell_price (ask) and buy_price (bid) for gold-price-api structure
    const sellPrice = metal_type === "gold"
        ? latestPrice.sell_price
        : (latestPrice.sell_price || latestPrice.price_per_gram);
    const buyPrice = metal_type === "gold"
        ? latestPrice.buy_price
        : (latestPrice.buy_price || latestPrice.price_per_gram);

    // Create snapshot
    const { data: snapshot, error: insertError } = await supabase
        .from("gold_price_snapshots")
        .insert({
            user_id: user.id,
            price_id: latestPrice.id,
            metal_type,
            sell_price: sellPrice,  // Ask - user buys at this price
            buy_price: buyPrice,    // Bid - user sells at this price
            expires_at: expiresAt.toISOString(),
            client_request_id,
            client_ip: req.headers.get("x-forwarded-for")
        })
        .select()
        .single();

    if (insertError) {
        return errorResponse(`Failed to create snapshot: ${insertError.message}`, 500);
    }

    return successResponse({
        snapshot_id: snapshot.id,
        metal_type,
        sell_price: snapshot.sell_price, // Ask
        buy_price: snapshot.buy_price,   // Bid
        captured_at: snapshot.captured_at,
        expires_at: snapshot.expires_at,
        ttl_seconds: SNAPSHOT_TTL_SECONDS
    });
}

// ============================================================================
// ENDPOINT: POST /gold/buy
// ============================================================================
/*
Buy gold using a valid price snapshot.

Request:
{
  "amount": 10000,           // OR "grams": 1.5
  "duration_days": 90,
  "snapshot_id": "uuid",
  "idempotency_key": "uuid"
}

Response:
{
  "position_id": "uuid",
  "grams": 1.423,
  "buy_price": 7030,
  "lock_until": "2024-04-14T19:00:00Z"
}
*/
async function handleBuyGold(req: Request): Promise<Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const supabase = getServiceClient();
    const userClient = getUserClient(authHeader);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);

    const correlationId = crypto.randomUUID();
    const body = await req.json();
    const { amount, grams, duration_days, snapshot_id, idempotency_key } = body;

    // Validation
    if (!snapshot_id) return errorResponse("Snapshot ID required");
    if (!idempotency_key) return errorResponse("Idempotency key required");
    if (!duration_days || duration_days <= 0) return errorResponse("Invalid duration");
    if (!amount && !grams) return errorResponse("Amount or grams required");

    // Get minimum investment from admin settings (default 0)
    let minInvestment = 0;
    const { data: minSetting } = await supabase
        .from("investment_settings")
        .select("setting_value")
        .eq("setting_key", "minimum_investment")
        .eq("is_active", true)
        .single();

    if (minSetting?.setting_value?.amount) {
        minInvestment = Number(minSetting.setting_value.amount);
    }

    // Calculate the buy amount first for validation
    let preliminaryAmount = amount ? Number(amount) : 0;

    // Check minimum investment (if set > 0)
    if (minInvestment > 0 && preliminaryAmount > 0 && preliminaryAmount < minInvestment) {
        return errorResponse(`Minimum investment is ${minInvestment} EGP`);
    }

    // Verify snapshot is valid and not expired
    const { data: snapshot, error: snapshotError } = await supabase
        .from("gold_price_snapshots")
        .select("*")
        .eq("id", snapshot_id)
        .single();

    if (snapshotError || !snapshot) {
        return errorResponse("Invalid snapshot", 400);
    }

    if (snapshot.used) {
        return errorResponse("Snapshot already used", 400);
    }

    if (snapshot.valid_until && new Date(snapshot.valid_until) < new Date()) {
        return errorResponse("Snapshot expired", 400);
    }

    // Calculate grams and amount
    // User buys at sell_price (ask price)
    const askPrice = Number(snapshot.sell_price);
    let buyAmount: number;
    let buyGrams: number;

    if (amount) {
        buyAmount = Number(amount);
        buyGrams = buyAmount / askPrice;
    } else {
        buyGrams = Number(grams);
        buyAmount = buyGrams * askPrice;
    }

    // Round grams to 6 decimal places
    buyGrams = Math.round(buyGrams * 1000000) / 1000000;

    // Calculate lock until
    const lockUntil = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000);

    // Execute buy with transaction
    const result = await executeMoneyTransaction(
        { supabase, userId: user.id, correlationId },
        "buy_gold",
        idempotency_key,
        await sha256(JSON.stringify(body)),
        async (walletLock) => {
            // Check available balance
            if (Number(walletLock.available_balance) < buyAmount) {
                throw new Error("Insufficient balance");
            }

            // Create position
            const { data: position, error: positionError } = await supabase
                .from("gold_positions")
                .insert({
                    user_id: user.id,
                    metal_type: snapshot.metal_type,
                    grams: buyGrams,
                    buy_amount: buyAmount,
                    buy_price_ask: askPrice,
                    price_snapshot_id: snapshot_id,
                    duration_days,
                    lock_until: lockUntil.toISOString(),
                    status: "active",
                    idempotency_key,
                    correlation_id: correlationId
                })
                .select()
                .single();

            if (positionError) {
                throw new Error(`Failed to create position: ${positionError.message}`);
            }

            // Mark snapshot as used
            await supabase
                .from("gold_price_snapshots")
                .update({
                    used: true,
                    used_at: new Date().toISOString(),
                    used_in_position_id: position.id
                })
                .eq("id", snapshot_id);

            const newAvailable = Number(walletLock.available_balance) - buyAmount;
            const newLocked = Number(walletLock.locked_balance) + buyAmount;

            return {
                ledgerEntry: {
                    event_type: "buy_gold_lock",
                    direction: "debit",
                    amount: buyAmount,
                    currency: "EGP",
                    balance_type: "available",
                    balance_after: newAvailable,
                    related_table: "gold_positions",
                    related_id: position.id,
                    description: `Buy ${buyGrams.toFixed(6)}g gold at ${askPrice}/g`,
                    metadata: { grams: buyGrams, price: askPrice, duration_days }
                },
                balanceChanges: { available: -buyAmount, locked: buyAmount },
                result: {
                    position_id: position.id,
                    grams: buyGrams,
                    buy_amount: buyAmount,
                    buy_price: askPrice,
                    duration_days,
                    lock_until: lockUntil.toISOString()
                }
            };
        }
    );

    if (!result.success) {
        return errorResponse(result.error || "Buy failed", 400);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
        actor_id: user.id,
        actor_type: "user",
        action: "gold_bought",
        resource_type: "gold_position",
        resource_id: result.data.position_id,
        correlation_id: correlationId,
        new_data: result.data
    });

    return successResponse(result.data);
}

// ============================================================================
// ENDPOINT: POST /withdraw/request
// ============================================================================
/*
Request withdrawal of matured position or available balance.

Request:
{
  "position_id": "uuid",     // OR "amount": 1000
  "idempotency_key": "uuid"
}
*/
async function handleWithdrawRequest(req: Request): Promise<Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const supabase = getServiceClient();
    const userClient = getUserClient(authHeader);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);

    const correlationId = crypto.randomUUID();
    const body = await req.json();
    const { position_id, amount, idempotency_key } = body;

    if (!idempotency_key) return errorResponse("Idempotency key required");

    let withdrawAmount: number;
    let positionToClose: any = null;

    if (position_id) {
        // Withdraw from position
        const { data: position, error } = await supabase
            .from("gold_positions")
            .select("*")
            .eq("id", position_id)
            .eq("user_id", user.id)
            .single();

        if (error || !position) {
            return errorResponse("Position not found", 404);
        }

        if (position.status !== "matured" && position.status !== "active") {
            return errorResponse("Position not withdrawable", 400);
        }

        // Check if matured
        if (new Date(position.lock_until) > new Date()) {
            return errorResponse("Position still locked. Use forced withdrawal.", 400);
        }

        // Get current price for selling (user sells at buy_price/bid)
        const { data: currentPrice } = await supabase
            .from("gold_prices")
            .select("buy_price, sell_price")
            .eq("karat", "24")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!currentPrice || !currentPrice.buy_price) {
            return errorResponse("Price unavailable", 503);
        }

        // Calculate sale value (user sells at buy_price = bid)
        withdrawAmount = Number(position.grams) * Number(currentPrice.buy_price);
        positionToClose = { ...position, close_price_bid: currentPrice.buy_price };

    } else if (amount) {
        withdrawAmount = Number(amount);
    } else {
        return errorResponse("Position ID or amount required");
    }

    // Get fee
    const { data: feeResult } = await supabase
        .rpc("calculate_forced_withdrawal_fee", {
            p_amount: 0, // No fee for normal withdrawal
            p_days_remaining: 0
        });

    const feeAmount = 0; // Normal withdrawal = no penalty fee
    const netAmount = withdrawAmount - feeAmount;

    // Execute withdrawal
    const result = await executeMoneyTransaction(
        { supabase, userId: user.id, correlationId },
        "withdraw",
        idempotency_key,
        await sha256(JSON.stringify(body)),
        async (walletLock) => {
            let balanceToDeduct: number;
            let ledgerEntry: any;
            let balanceChanges: any;

            // Create withdrawal record first
            const { data: withdrawal, error: withdrawError } = await supabase
                .from("withdrawals")
                .insert({
                    user_id: user.id,
                    withdrawal_type: "normal",
                    gross_amount: withdrawAmount,
                    fee_amount: feeAmount,
                    net_amount: netAmount,
                    position_id: position_id || null,
                    status: "approved",
                    idempotency_key,
                    correlation_id: correlationId
                })
                .select()
                .single();

            if (withdrawError) {
                throw new Error(`Failed to create withdrawal: ${withdrawError.message}`);
            }

            if (positionToClose) {
                // Close position: unlock funds and credit sale proceeds to available
                balanceToDeduct = Number(positionToClose.buy_amount);
                const saleProceeds = withdrawAmount; // Current value at market price

                // Update position
                await supabase
                    .from("gold_positions")
                    .update({
                        status: "closed",
                        close_time: new Date().toISOString(),
                        close_price_bid: positionToClose.close_price_bid,
                        close_amount: withdrawAmount,
                        profit_loss: withdrawAmount - positionToClose.buy_amount
                    })
                    .eq("id", position_id);

                // Ledger entry for unlocking and crediting sale proceeds
                ledgerEntry = {
                    event_type: "position_unlock",
                    direction: "debit",
                    amount: balanceToDeduct,
                    currency: "EGP",
                    balance_type: "locked",
                    balance_after: Number(walletLock.locked_balance) - balanceToDeduct,
                    related_table: "withdrawals",
                    related_id: withdrawal.id,
                    description: `Normal withdrawal from position - proceeds: ${saleProceeds.toFixed(2)} EGP`
                };
                // Debit locked, credit available with sale proceeds
                balanceChanges = { locked: -balanceToDeduct, available: saleProceeds };
            } else {
                // Direct withdrawal from available balance
                balanceToDeduct = withdrawAmount;
                if (Number(walletLock.available_balance) < balanceToDeduct) {
                    throw new Error("Insufficient balance");
                }

                ledgerEntry = {
                    event_type: "withdrawal_debit",
                    direction: "debit",
                    amount: netAmount,
                    currency: "EGP",
                    balance_type: "available",
                    balance_after: Number(walletLock.available_balance) - balanceToDeduct,
                    related_table: "withdrawals",
                    related_id: withdrawal.id,
                    description: `Normal withdrawal`
                };
                balanceChanges = { available: -balanceToDeduct };
            }

            return {
                ledgerEntry,
                balanceChanges,
                result: {
                    withdrawal_id: withdrawal.id,
                    gross_amount: withdrawAmount,
                    fee_amount: feeAmount,
                    net_amount: netAmount,
                    status: "approved"
                }
            };
        }
    );

    if (!result.success) {
        return errorResponse(result.error || "Withdrawal failed", 400);
    }

    return successResponse(result.data);
}

// ============================================================================
// ENDPOINT: POST /withdraw/forced-request
// ============================================================================
/*
Forced withdrawal before lock expires (applies penalty).

Request:
{
  "position_id": "uuid",
  "idempotency_key": "uuid"
}
*/
async function handleForcedWithdrawRequest(req: Request): Promise<Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const supabase = getServiceClient();
    const userClient = getUserClient(authHeader);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);

    const correlationId = crypto.randomUUID();
    const body = await req.json();
    const { position_id, idempotency_key } = body;

    if (!position_id) return errorResponse("Position ID required");
    if (!idempotency_key) return errorResponse("Idempotency key required");

    // Get position
    const { data: position, error } = await supabase
        .from("gold_positions")
        .select("*")
        .eq("id", position_id)
        .eq("user_id", user.id)
        .single();

    if (error || !position) {
        return errorResponse("Position not found", 404);
    }

    if (position.status !== "active") {
        return errorResponse("Position not active", 400);
    }

    // Check if truly before maturity
    const now = new Date();
    const lockUntil = new Date(position.lock_until);
    const daysRemaining = Math.ceil((lockUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
        return errorResponse("Position is matured. Use normal withdrawal.", 400);
    }

    // Get current price (user sells at buy_price/bid)
    const { data: currentPrice } = await supabase
        .from("gold_prices")
        .select("buy_price, sell_price")
        .eq("karat", "24")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (!currentPrice || !currentPrice.buy_price) {
        return errorResponse("Price unavailable", 503);
    }

    // Calculate value (user sells at buy_price = bid)
    const grossAmount = Number(position.grams) * Number(currentPrice.buy_price);

    // Calculate fee
    const { data: feeResult } = await supabase
        .rpc("calculate_forced_withdrawal_fee", {
            p_amount: grossAmount,
            p_days_remaining: daysRemaining
        });

    const feeData = feeResult?.[0] || { fee_amount: grossAmount * 0.05, fee_percent: 0.05 };
    const feeAmount = Number(feeData.fee_amount);
    const feePercent = Number(feeData.fee_percent);
    const netAmount = grossAmount - feeAmount;

    // Execute forced withdrawal
    const result = await executeMoneyTransaction(
        { supabase, userId: user.id, correlationId },
        "forced_withdraw",
        idempotency_key,
        await sha256(JSON.stringify(body)),
        async (walletLock) => {
            const lockedAmount = Number(position.buy_amount);

            // Update position
            await supabase
                .from("gold_positions")
                .update({
                    status: "forced_closed",
                    close_time: new Date().toISOString(),
                    close_price_bid: currentPrice.bid,
                    close_amount: grossAmount,
                    profit_loss: grossAmount - position.buy_amount,
                    is_forced_close: true,
                    forced_fee_amount: feeAmount,
                    forced_fee_percent: feePercent
                })
                .eq("id", position_id);

            // Create withdrawal record
            const { data: withdrawal, error: withdrawError } = await supabase
                .from("withdrawals")
                .insert({
                    user_id: user.id,
                    withdrawal_type: "forced",
                    gross_amount: grossAmount,
                    fee_amount: feeAmount,
                    net_amount: netAmount,
                    fee_rule_id: feeData.fee_rule_id,
                    fee_percent_applied: feePercent,
                    fee_calculation_details: {
                        days_remaining: daysRemaining,
                        original_lock_days: position.duration_days,
                        fee_percent: feePercent
                    },
                    position_id,
                    status: "approved",
                    idempotency_key,
                    correlation_id: correlationId
                })
                .select()
                .single();

            if (withdrawError) {
                throw new Error(`Failed to create withdrawal: ${withdrawError.message}`);
            }

            // For forced withdrawal: unlock from locked and credit net amount to available
            return {
                ledgerEntry: {
                    event_type: "position_unlock",
                    direction: "debit",
                    amount: lockedAmount,
                    currency: "EGP",
                    balance_type: "locked",
                    balance_after: Number(walletLock.locked_balance) - lockedAmount,
                    related_table: "withdrawals",
                    related_id: withdrawal.id,
                    description: `Forced early withdrawal with ${(feePercent * 100).toFixed(1)}% penalty`,
                    metadata: {
                        gross: grossAmount,
                        fee: feeAmount,
                        net: netAmount,
                        days_remaining: daysRemaining
                    }
                },
                // Credit net amount (after penalty) to available balance
                balanceChanges: { locked: -lockedAmount, available: netAmount },
                result: {
                    withdrawal_id: withdrawal.id,
                    position_id,
                    gross_amount: grossAmount,
                    fee_amount: feeAmount,
                    fee_percent: feePercent,
                    net_amount: netAmount,
                    days_remaining: daysRemaining,
                    status: "approved"
                }
            };
        }
    );

    if (!result.success) {
        return errorResponse(result.error || "Forced withdrawal failed", 400);
    }

    // Also insert fee ledger entry
    await supabase.from("wallet_ledger").insert({
        user_id: user.id,
        event_type: "forced_withdrawal_fee",
        direction: "debit",
        amount: feeAmount,
        currency: "EGP",
        balance_type: "available",
        balance_after: 0, // Fee doesn't affect balance, it's deducted from gross
        related_table: "withdrawals",
        related_id: result.data.withdrawal_id,
        idempotency_key: `fee:${idempotency_key}`,
        description: `Early withdrawal penalty fee: ${(feePercent * 100).toFixed(1)}%`,
        correlation_id: correlationId
    });

    // Audit log
    await supabase.from("audit_logs").insert({
        actor_id: user.id,
        actor_type: "user",
        action: "forced_withdrawal",
        resource_type: "withdrawal",
        resource_id: result.data.withdrawal_id,
        correlation_id: correlationId,
        new_data: result.data
    });

    return successResponse(result.data);
}

// ============================================================================
// MAIN ROUTER
// ============================================================================

serve(async (req: Request) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS
    if (method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Idempotency-Key, x-client-info, apikey"
            }
        });
    }

    try {
        // Support action-based routing from supabase.functions.invoke()
        if (method === "POST" && (path === "/" || path === "/wallet-api" || path === "")) {
            const body = await req.json();
            const action = body.action;

            // Create a new request with the body
            const newReq = new Request(req.url, {
                method: "POST",
                headers: req.headers,
                body: JSON.stringify(body)
            });

            // Route to appropriate handler based on action
            switch (action) {
                case "buy_gold":
                    return await handleBuyGold(newReq);
                case "withdraw":
                    return await handleWithdrawRequest(newReq);
                case "forced_withdraw":
                    return await handleForcedWithdrawRequest(newReq);
                case "deposit_initiate":
                    return await handleDepositInitiate(newReq);
                case "get_balance":
                    return await handleGetBalance(newReq);
                case "get_gold_price":
                    return await handleGetGoldPrice(newReq);
                default:
                    return errorResponse(`Unknown action: ${action}`, 400);
            }
        }

        // Path-based routing (original)
        if (method === "POST" && path === "/wallet/deposit/initiate") {
            return await handleDepositInitiate(req);
        }
        if (method === "POST" && path === "/wallet/deposit/webhook") {
            return await handleDepositWebhook(req);
        }
        if (method === "GET" && path === "/wallet/balance") {
            return await handleGetBalance(req);
        }
        if (method === "GET" && path === "/gold/price/today") {
            return await handleGetGoldPrice(req);
        }
        if (method === "POST" && path === "/gold/price/snapshot") {
            return await handleCreatePriceSnapshot(req);
        }
        if (method === "POST" && path === "/gold/buy") {
            return await handleBuyGold(req);
        }
        if (method === "POST" && path === "/withdraw/request") {
            return await handleWithdrawRequest(req);
        }
        if (method === "POST" && path === "/withdraw/forced-request") {
            return await handleForcedWithdrawRequest(req);
        }

        return errorResponse("Not found", 404);

    } catch (error) {
        console.error("Unhandled error:", error);
        return errorResponse("Internal server error", 500);
    }
});

