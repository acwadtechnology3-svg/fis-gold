-- Fix approve_withdrawal_request RPC to include idempotency_key in wallet_ledger inserts
CREATE OR REPLACE FUNCTION approve_withdrawal_request(
    p_withdrawal_id UUID,
    p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_withdrawal RECORD;
    v_position RECORD;
    v_wallet RECORD;
BEGIN
    SELECT * INTO v_withdrawal FROM withdrawals WHERE id = p_withdrawal_id AND status = 'requested' FOR UPDATE;
    IF NOT FOUND THEN 
        -- Also check 'pending' status as AdminWithdrawalsTable uses 'pending' filter often
        SELECT * INTO v_withdrawal FROM withdrawals WHERE id = p_withdrawal_id AND status = 'pending' FOR UPDATE;
        IF NOT FOUND THEN RETURN FALSE; END IF;
    END IF;
    
    -- If linked to position (Sell Asset), close the position
    IF v_withdrawal.position_id IS NOT NULL THEN
        SELECT * INTO v_position FROM gold_positions WHERE id = v_withdrawal.position_id FOR UPDATE;
        
        -- Update position to closed
        UPDATE gold_positions 
        SET status = 'closed', 
            close_time = NOW(), 
            close_amount = v_withdrawal.net_amount, 
            updated_at = NOW()
        WHERE id = v_withdrawal.position_id;
        
        -- Wallet Logic
        SELECT * INTO v_wallet FROM wallet_accounts WHERE user_id = v_withdrawal.user_id FOR UPDATE;
        
        -- Unlock original funds (remove from locked)
        UPDATE wallet_accounts 
        SET locked_balance = locked_balance - v_position.buy_amount,
            available_balance = available_balance + v_withdrawal.net_amount,
            updated_at = NOW()
        WHERE user_id = v_withdrawal.user_id;
            
        -- Ledger entries
        -- 1. Unlock
        INSERT INTO wallet_ledger (
            user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, description, idempotency_key
        ) VALUES (
            v_withdrawal.user_id, 'position_unlock', 'credit', v_position.buy_amount, 'EGP', 'locked', v_wallet.locked_balance - v_position.buy_amount,
            'gold_positions', v_position.id, 'Unlock funds from closed position', 'unlock_' || p_withdrawal_id
        );
        
        -- 2. Credit Net Amount
        INSERT INTO wallet_ledger (
            user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, description, idempotency_key
        ) VALUES (
            v_withdrawal.user_id, 'deposit_credit', 'credit', v_withdrawal.net_amount, 'EGP', 'available', v_wallet.available_balance + v_withdrawal.net_amount,
            'withdrawals', v_withdrawal.id, 'Credit sell proceed (Net)', 'credit_' || p_withdrawal_id
        );
        
    ELSE
        -- Normal Cash Withdrawal (Not Sell Asset)
        SELECT * INTO v_wallet FROM wallet_accounts WHERE user_id = v_withdrawal.user_id FOR UPDATE;
        IF v_wallet.available_balance < v_withdrawal.net_amount THEN
            RAISE EXCEPTION 'Insufficient funds for withdrawal';
        END IF;
        
        UPDATE wallet_accounts 
        SET available_balance = available_balance - v_withdrawal.net_amount,
            updated_at = NOW()
        WHERE user_id = v_withdrawal.user_id;
        
        -- Ledger Debit
         INSERT INTO wallet_ledger (
            user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, description, idempotency_key
        ) VALUES (
            v_withdrawal.user_id, 'withdrawal_debit', 'debit', v_withdrawal.net_amount, 'EGP', 'available', v_wallet.available_balance - v_withdrawal.net_amount,
            'withdrawals', v_withdrawal.id, 'Cash Withdrawal Approved', 'debit_' || p_withdrawal_id
        );
    END IF;
    
    -- Mark Withdrawal Approved/Completed
    UPDATE withdrawals 
    SET status = 'completed', 
        approved_at = NOW(),
        processed_at = NOW()
    WHERE id = p_withdrawal_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
