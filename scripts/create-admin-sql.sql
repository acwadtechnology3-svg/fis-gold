-- SQL Script to create admin account
-- Run this in Supabase Dashboard > SQL Editor
-- 
-- Email: admin@fisgold.com
-- Password: Admin123!@#
-- 
-- Note: You need to create the user first through Supabase Auth Dashboard
-- Then run this script to grant admin role

-- Step 1: Create user through Supabase Auth Dashboard first
-- Go to: Authentication > Users > Add User
-- Email: admin@fisgold.com
-- Password: Admin123!@#
-- Auto Confirm: Yes

-- Step 2: Run this SQL to grant admin role
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@fisgold.com';
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % does not exist. Please create the user first through Supabase Auth Dashboard (Authentication > Users > Add User)', v_email;
  END IF;

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE '✅ Admin role granted successfully to: %', v_email;
  RAISE NOTICE '📧 Email: %', v_email;
  RAISE NOTICE '🔑 Password: Admin123!@#';
END $$;
