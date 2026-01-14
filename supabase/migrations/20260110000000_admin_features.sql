-- Create activity_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'deposit_approved', 'deposit_rejected', 'withdrawal_approved', etc.
  entity_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'user', 'price', etc.
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action_type ON public.activity_log(action_type);
CREATE INDEX idx_activity_log_entity_type ON public.activity_log(entity_type);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
ON public.activity_log
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view settings (public data)
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('withdrawal_fee_percentage', '{"value": 2.5}', 'نسبة رسوم السحب'),
  ('min_deposit_amount', '{"value": 2000}', 'الحد الأدنى لمبلغ الإيداع'),
  ('auto_approve_deposits', '{"value": false}', 'الموافقة التلقائية على الإيداعات'),
  ('email_notifications', '{"value": true}', 'تفعيل إشعارات البريد الإلكتروني'),
  ('maintenance_mode', '{"value": false}', 'وضع الصيانة')
ON CONFLICT (key) DO NOTHING;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  IF NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can log activities';
  END IF;
  
  INSERT INTO public.activity_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata
  )
  VALUES (
    v_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to get user portfolio summary (for admin)
CREATE OR REPLACE FUNCTION public.get_user_portfolio_admin(p_user_id UUID)
RETURNS TABLE(
  total_invested NUMERIC,
  total_gold_grams NUMERIC,
  pending_deposits NUMERIC,
  approved_deposits NUMERIC,
  pending_withdrawals NUMERIC,
  completed_withdrawals NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0)::NUMERIC as total_invested,
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.gold_grams ELSE 0 END), 0)::NUMERIC as total_gold_grams,
    COALESCE(SUM(CASE WHEN d.status = 'pending' THEN d.amount ELSE 0 END), 0)::NUMERIC as pending_deposits,
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0)::NUMERIC as approved_deposits,
    COALESCE(SUM(CASE WHEN w.status = 'pending' THEN w.amount ELSE 0 END), 0)::NUMERIC as pending_withdrawals,
    COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.amount ELSE 0 END), 0)::NUMERIC as completed_withdrawals
  FROM auth.users u
  LEFT JOIN public.deposits d ON d.user_id = u.id
  LEFT JOIN public.withdrawals w ON w.user_id = u.id
  WHERE u.id = p_user_id
  GROUP BY u.id;
END;
$$;

-- Add email column to profiles if it doesn't exist (for better user management)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    
    -- Update existing profiles with email from auth.users
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.user_id = u.id;
  END IF;
END $$;

-- Add is_active column to profiles for user management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;
