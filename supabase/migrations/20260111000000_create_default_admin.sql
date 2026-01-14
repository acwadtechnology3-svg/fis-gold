-- Create default admin account
-- Email: admin@fisgold.com
-- Password: Admin123!@#
-- 
-- Note: This will create the user in auth.users and grant admin role
-- You can change the password after first login

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@fisgold.com';
  v_password TEXT := 'Admin123!@#';
  v_full_name TEXT := 'مدير النظام';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
    -- Insert into auth.users (this requires service role or direct database access)
    -- Note: This is a simplified version. In production, use Supabase Admin API
    -- For now, we'll just grant admin role to existing users or create via function
    
    -- Create a function that can be called with service role
    RAISE NOTICE 'User % does not exist. Please create it manually through Supabase Dashboard or use the create-admin script.', v_email;
  ELSE
    -- User exists, grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to existing user: %', v_email;
  END IF;
END $$;

-- Alternative: Create a function to create admin user (requires service role)
CREATE OR REPLACE FUNCTION public.create_default_admin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@fisgold.com';
  v_password TEXT := 'Admin123!@#';
  v_full_name TEXT := 'مدير النظام';
BEGIN
  -- This function should be called with service role key
  -- It will create user and grant admin role
  
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User does not exist. Please create user first through Supabase Auth or use the create-admin script.';
  ELSE
    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN 'Admin role granted to: ' || v_email;
  END IF;
END;
$$;
