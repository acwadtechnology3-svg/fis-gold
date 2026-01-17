-- ============================================================
-- ADMIN WALLET CONTROL MIGRATION
-- Allows admins to view and modify user wallet balances
-- ============================================================

-- 1. Add RLS policy for admin to UPDATE wallet_accounts
DROP POLICY IF EXISTS "Admins can update wallet_accounts" ON wallet_accounts;
CREATE POLICY "Admins can update wallet_accounts"
  ON wallet_accounts FOR UPDATE
  USING (is_admin());

-- 2. Add RLS policy for admin to INSERT wallet ledger entries
DROP POLICY IF EXISTS "Admins can insert wallet_ledger" ON wallet_ledger;
CREATE POLICY "Admins can insert wallet_ledger"
  ON wallet_ledger FOR INSERT
  WITH CHECK (is_admin());

-- 3. Create admin wallet adjustment function
CREATE OR REPLACE FUNCTION admin_adjust_wallet(
  p_user_id UUID,
  p_amount DECIMAL(18, 4),
  p_adjustment_type TEXT,  -- 'credit' or 'debit'
  p_reason TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL(18, 4)
) AS $$
DECLARE
  v_wallet RECORD;
  v_admin_id UUID;
  v_new_balance DECIMAL(18, 4);
  v_ledger_event ledger_event_type;
  v_ledger_direction ledger_direction;
  v_idempotency_key TEXT;
BEGIN
  -- Check admin authorization
  v_admin_id := auth.uid();
  IF NOT is_admin() THEN
    RETURN QUERY SELECT false, 'غير مصرح لك بهذه العملية'::TEXT, NULL::DECIMAL(18, 4);
    RETURN;
  END IF;

  -- Validate adjustment type
  IF p_adjustment_type NOT IN ('credit', 'debit') THEN
    RETURN QUERY SELECT false, 'نوع التعديل غير صالح'::TEXT, NULL::DECIMAL(18, 4);
    RETURN;
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 'المبلغ يجب أن يكون أكبر من صفر'::TEXT, NULL::DECIMAL(18, 4);
    RETURN;
  END IF;

  -- Lock wallet row for update
  SELECT * INTO v_wallet 
  FROM wallet_accounts 
  WHERE user_id = p_user_id 
  FOR UPDATE;

  -- If wallet doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO wallet_accounts (user_id, available_balance, locked_balance, currency)
    VALUES (p_user_id, 0, 0, 'EGP');
    
    SELECT * INTO v_wallet 
    FROM wallet_accounts 
    WHERE user_id = p_user_id 
    FOR UPDATE;
  END IF;

  -- Set ledger event type and direction
  IF p_adjustment_type = 'credit' THEN
    v_ledger_event := 'admin_credit';
    v_ledger_direction := 'credit';
    v_new_balance := v_wallet.available_balance + p_amount;
  ELSE
    -- Check if sufficient balance for debit
    IF v_wallet.available_balance < p_amount THEN
      RETURN QUERY SELECT false, 'الرصيد غير كافي للخصم'::TEXT, NULL::DECIMAL(18, 4);
      RETURN;
    END IF;
    v_ledger_event := 'admin_debit';
    v_ledger_direction := 'debit';
    v_new_balance := v_wallet.available_balance - p_amount;
  END IF;

  -- Generate unique idempotency key
  v_idempotency_key := 'admin_adj_' || gen_random_uuid()::TEXT;

  -- Update wallet balance
  UPDATE wallet_accounts 
  SET 
    available_balance = v_new_balance,
    version = version + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert ledger entry for audit trail
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
    description,
    metadata
  ) VALUES (
    p_user_id,
    v_ledger_event,
    v_ledger_direction,
    p_amount,
    'EGP',
    'available',
    v_new_balance,
    'admin_adjustment',
    NULL,
    v_idempotency_key,
    p_reason,
    jsonb_build_object(
      'admin_id', v_admin_id,
      'adjustment_type', p_adjustment_type,
      'reason', p_reason,
      'previous_balance', v_wallet.available_balance
    )
  );

  -- Log admin activity
  PERFORM log_admin_activity(
    CASE WHEN p_adjustment_type = 'credit' THEN 'wallet_credit' ELSE 'wallet_debit' END,
    'wallet',
    v_wallet.id,
    CASE WHEN p_adjustment_type = 'credit' 
      THEN 'إضافة ' || p_amount || ' ج.م للمحفظة - ' || p_reason
      ELSE 'خصم ' || p_amount || ' ج.م من المحفظة - ' || p_reason
    END,
    jsonb_build_object(
      'user_id', p_user_id,
      'amount', p_amount,
      'adjustment_type', p_adjustment_type,
      'reason', p_reason,
      'new_balance', v_new_balance
    )
  );

  RETURN QUERY SELECT true, 'تم تحديث المحفظة بنجاح'::TEXT, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get user's wallet info for admin
CREATE OR REPLACE FUNCTION admin_get_user_wallet(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  available_balance DECIMAL(18, 4),
  locked_balance DECIMAL(18, 4),
  total_balance DECIMAL(18, 4),
  currency TEXT,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'غير مصرح لك بهذه العملية';
  END IF;

  RETURN QUERY
  SELECT 
    wa.user_id,
    COALESCE(wa.available_balance, 0) AS available_balance,
    COALESCE(wa.locked_balance, 0) AS locked_balance,
    COALESCE(wa.available_balance, 0) + COALESCE(wa.locked_balance, 0) AS total_balance,
    COALESCE(wa.currency, 'EGP') AS currency,
    wa.updated_at AS last_updated
  FROM wallet_accounts wa
  WHERE wa.user_id = p_user_id;

  -- If no wallet found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      p_user_id,
      0::DECIMAL(18, 4),
      0::DECIMAL(18, 4),
      0::DECIMAL(18, 4),
      'EGP'::TEXT,
      NOW()::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_adjust_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_wallet TO authenticated;

-- ============================================================
-- DONE! Admins can now:
-- - View user wallet balances
-- - Add funds to user wallets (credit)
-- - Deduct funds from user wallets (debit)
-- - All actions are logged in wallet_ledger and activity_log
-- ============================================================
