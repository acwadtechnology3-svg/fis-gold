-- SQL script to grant admin role to a user
-- 
-- Usage:
--   1. Replace 'your-email@example.com' with the actual email address
--   2. Run this script in Supabase SQL Editor
--
-- Or use the function directly:
--   SELECT grant_admin_role_by_email('your-email@example.com');

-- Option 1: Grant admin role by email (recommended)
-- Replace 'your-email@example.com' with the actual email
SELECT grant_admin_role_by_email('your-email@example.com');

-- Option 2: Grant admin role by user ID
-- First, find the user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
-- Then use:
-- SELECT grant_admin_role('user-uuid-here');

-- Option 3: Direct insert (if functions don't work)
-- First, find the user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
-- Then insert directly (this requires service role or disabling RLS temporarily):
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('user-uuid-here', 'admin'::app_role)
-- ON CONFLICT (user_id, role) DO NOTHING;
