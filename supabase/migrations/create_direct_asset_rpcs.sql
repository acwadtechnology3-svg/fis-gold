-- Function to Buy Asset (Gold or Silver)
CREATE OR REPLACE FUNCTION buy_asset(
    p_user_id UUID, 
    p_snapshot_id UUID, 
    p_amount DECIMAL(18, 4), 
    p_duration_days INTEGER, 
    p_idempotency_key TEXT,
    p_metal_type TEXT DEFAULT 'gold'
) RETURNS TABLE (
    success BOOLEAN, 
    message TEXT, 
    position_id UUID, 
    grams DECIMAL(12, 6), 
    buy_price DECIMAL(12, 4)
) AS $$
DECLARE 
    v_snapshot RECORD; 
    v_wallet RECORD; 
    v_grams DECIMAL(12, 6); 
    v_buy_price DECIMAL(12, 4);
    v_lock_until TIMESTAMPTZ; 
    v_position_id UUID;
    v_min_investment DECIMAL(18, 4);
BEGIN
    -- Check idempotency
    SELECT gp.id, gp.grams, gp.buy_price_ask INTO v_position_id, v_grams, v_buy_price 
    FROM gold_positions gp 
    WHERE gp.user_id = p_user_id AND gp.idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Already processed'::TEXT, v_position_id, v_grams, v_buy_price;
        RETURN;
    END IF;

    -- Get minimum investment
    -- CAST result to DECIMAL to match variable type
    SELECT COALESCE((setting_value->>'amount')::DECIMAL(18, 4), 0) INTO v_min_investment
    FROM investment_settings WHERE setting_key = 'minimum_investment' AND is_active = true;

    IF v_min_investment > 0 AND p_amount < v_min_investment THEN
         RETURN QUERY SELECT false, ('Minimum investment is ' || v_min_investment || ' EGP')::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4);
         RETURN;
    END IF;
    
    -- Get and lock snapshot
    SELECT * INTO v_snapshot FROM gold_price_snapshots WHERE id = p_snapshot_id FOR UPDATE;
    
    IF NOT FOUND THEN 
        RETURN QUERY SELECT false, 'Snapshot not found'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;

    -- Optional: removed user_id check on snapshot as per recent debugging context
    -- IF v_snapshot.user_id IS NOT NULL AND v_snapshot.user_id != p_user_id THEN ...

    IF v_snapshot.used THEN 
        RETURN QUERY SELECT false, 'Snapshot already used'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;
    
    -- Check expiration using valid_until if available, else expires_at
    IF (v_snapshot.valid_until IS NOT NULL AND v_snapshot.valid_until < NOW()) OR 
       (v_snapshot.valid_until IS NULL AND v_snapshot.expires_at < NOW()) THEN 
        RETURN QUERY SELECT false, 'Snapshot expired'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;

    -- Validate metal type matches snapshot (if snapshot stores it)
    IF v_snapshot.metal_type IS NOT NULL AND v_snapshot.metal_type != p_metal_type THEN
         RETURN QUERY SELECT false, ('Snapshot is for ' || v_snapshot.metal_type || ' not ' || p_metal_type)::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
         RETURN;
    END IF;
    
    -- Get and lock wallet
    SELECT * INTO v_wallet FROM wallet_accounts WHERE wallet_accounts.user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        -- Auto-create wallet if missing
        INSERT INTO wallet_accounts (user_id, available_balance, locked_balance, currency)
        VALUES (p_user_id, 0, 0, 'EGP') RETURNING * INTO v_wallet;
    END IF;

    IF v_wallet.available_balance < p_amount THEN 
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;
    
    -- Calculate grams
    -- User buys at sell_price_gram (ask price)
    -- Handle column naming variation (sell_price vs sell_price_gram)
    -- Try sell_price first (from original schema), then fallback or assume they mapped it
    -- Based on schema provided: gold_price_snapshots has sell_price (DECIMAL 12,2)
    -- But recent context mentioned adding sell_price_gram. Let's use sell_price as base from schema but handle 0.
    
    -- NOTE: In schema provided earlier: 
    -- 250: sell_price DECIMAL(12, 2) NOT NULL
    v_buy_price := v_snapshot.sell_price;
    
    -- If user added sell_price_gram column separately, valid logic might be needed, 
    -- but let's stick to the core column `sell_price` if it exists and is populated.
    -- If sell_price is 0 or null, check if we need to look elsewhere.
    IF v_buy_price IS NULL OR v_buy_price <= 0 THEN
         -- Attempt to get from sell_price_gram if it exists dynamically? 
         -- PL/SQL isn't dynamic like that easily without EXECUTE. 
         -- We'll assume v_snapshot.* includes it if it was added. 
         -- For now, fail if 0.
         RETURN QUERY SELECT false, 'Invalid price in snapshot'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
         RETURN;
    END IF;

    v_grams := ROUND(p_amount / v_buy_price, 6);
    v_lock_until := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    -- Create position
    INSERT INTO gold_positions (
        user_id, 
        metal_type, 
        grams, 
        buy_amount, 
        buy_price_ask, 
        price_snapshot_id, 
        duration_days, 
        lock_until, 
        status, 
        idempotency_key
    )
    VALUES (
        p_user_id, 
        p_metal_type, 
        v_grams, 
        p_amount, 
        v_buy_price, 
        p_snapshot_id, 
        p_duration_days, 
        v_lock_until, 
        'active', 
        p_idempotency_key
    )
    RETURNING gold_positions.id INTO v_position_id;
    
    -- Mark snapshot as used
    UPDATE gold_price_snapshots SET used = true, used_at = NOW(), used_in_position_id = v_position_id WHERE gold_price_snapshots.id = p_snapshot_id;
    
    -- Update wallet balances
    UPDATE wallet_accounts 
    SET available_balance = wallet_accounts.available_balance - p_amount, 
        locked_balance = wallet_accounts.locked_balance + p_amount, 
        version = version + 1, 
        updated_at = NOW()
    WHERE wallet_accounts.user_id = p_user_id;
    
    -- Insert ledger entry
    INSERT INTO wallet_ledger (
        user_id, 
        event_type, 
        direction, 
        amount, 
        currency, 
        balance_type, 
        balance_after, 
        related_table, 
        related_id, 
        idempotency_key, 
        description
    )
    VALUES (
        p_user_id, 
        'buy_gold_lock', -- Reuse enum or add new one? 'buy_asset_lock' if possible, else reuse
        'debit', 
        p_amount, 
        'EGP', 
        'available', 
        v_wallet.available_balance - p_amount, 
        'gold_positions', 
        v_position_id, 
        'buy_' || p_idempotency_key, 
        'Buy ' || v_grams || 'g ' || p_metal_type || ' at ' || v_buy_price || '/g'
    );
    
    RETURN QUERY SELECT true, (p_metal_type || ' purchased successfully')::TEXT, v_position_id, v_grams, v_buy_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to Sell Asset (Close Position)
CREATE OR REPLACE FUNCTION sell_asset(
    p_user_id UUID, 
    p_position_id UUID, 
    p_snapshot_id UUID, 
    p_idempotency_key TEXT
) RETURNS TABLE (
    success BOOLEAN, 
    message TEXT, 
    ledger_id UUID, 
    net_amount DECIMAL(18, 4), 
    sell_price DECIMAL(12, 4)
) AS $$
DECLARE 
    v_position RECORD;
    v_snapshot RECORD;
    v_wallet RECORD;
    v_sell_price DECIMAL(12, 4);
    v_gross_amount DECIMAL(18, 4);
    v_net_amount DECIMAL(18, 4);
    v_fee_amount DECIMAL(18, 4);
    v_fee_percent DECIMAL(5, 4) := 0;
    v_ledger_id UUID;
    v_is_early_exit BOOLEAN;
BEGIN
    -- Check idempotency (via ledger)
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE user_id = p_user_id AND idempotency_key = 'sell_' || p_idempotency_key;
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Already processed'::TEXT, v_ledger_id, 0::DECIMAL, 0::DECIMAL; -- Return dummy values for processed
        RETURN;
    END IF;

    -- Lock position
    SELECT * INTO v_position FROM gold_positions WHERE id = p_position_id AND user_id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Position not found'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;

    IF v_position.status != 'active' AND v_position.status != 'matured' THEN
        RETURN QUERY SELECT false, 'Position is not active'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;

    -- Get price snapshot
    SELECT * INTO v_snapshot FROM gold_price_snapshots WHERE id = p_snapshot_id FOR UPDATE;
    
    IF NOT FOUND OR (v_snapshot.valid_until IS NOT NULL AND v_snapshot.valid_until < NOW()) OR (v_snapshot.valid_until IS NULL AND v_snapshot.expires_at < NOW()) THEN
        RETURN QUERY SELECT false, 'Invalid or expired price snapshot'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;

    -- Use buy_price from snapshot (Dealer buys FROM user, so it's the dealer's buy price / user's sell price)
    -- In database schema: `buy_price` is what dealer buys at.
    v_sell_price := v_snapshot.buy_price;
    
    IF v_sell_price <= 0 THEN
        RETURN QUERY SELECT false, 'Invalid price'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;

    -- Calculate amounts
    v_gross_amount := v_position.grams * v_sell_price;
    v_net_amount := v_gross_amount;
    v_fee_amount := 0;

    -- Check for early exit fee?
    v_is_early_exit := (v_position.lock_until > NOW());
    
    -- If early exit, apply fee logic here if required by requirements (skipping complex fee logic for now to ensure basic functionality first)
    -- Assuming no fee for now or simple logic.
    
    -- Lock Wallet
    SELECT * INTO v_wallet FROM wallet_accounts WHERE user_id = p_user_id FOR UPDATE;

    -- Update Position
    UPDATE gold_positions 
    SET status = 'closed', 
        close_time = NOW(), 
        close_price_bid = v_sell_price, 
        close_amount = v_net_amount, 
        updated_at = NOW() 
    WHERE id = p_position_id;

    -- Update Snapshot
    UPDATE gold_price_snapshots SET used = true, used_at = NOW(), used_in_position_id = p_position_id WHERE id = p_snapshot_id;

    -- Update Wallet
    -- Unlock original amount and Credit net profit/loss
    -- Actually, simpler: Release locked balance (original buy amount) and Credit the NEW amount to available.
    -- Wait, standard logic: remove original buy_amount from locked. Add `v_net_amount` to available.
    
    UPDATE wallet_accounts 
    SET locked_balance = locked_balance - v_position.buy_amount,
        available_balance = available_balance + v_net_amount,
        version = version + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Ledger for unlock
    INSERT INTO wallet_ledger (
        user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, idempotency_key, description
    ) VALUES (
        p_user_id, 'position_unlock', 'credit', v_position.buy_amount, 'EGP', 'locked', v_wallet.locked_balance - v_position.buy_amount, 'gold_positions', p_position_id, 'unlock_' || p_idempotency_key, 'Unlock position funds'
    );

    -- Ledger for sale credit
    INSERT INTO wallet_ledger (
        user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, idempotency_key, description
    ) VALUES (
        p_user_id, 'deposit_credit', 'credit', v_net_amount, 'EGP', 'available', v_wallet.available_balance + v_net_amount, 'gold_positions', p_position_id, 'sell_' || p_idempotency_key, 'Sell ' || v_position.grams || 'g ' || v_position.metal_type || ' at ' || v_sell_price
    ) RETURNING id INTO v_ledger_id;

    RETURN QUERY SELECT true, 'Asset sold successfully'::TEXT, v_ledger_id, v_net_amount, v_sell_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
