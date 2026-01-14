/**
 * Script to create an admin account
 * 
 * Usage:
 *   - First, create a user account through the normal signup process
 *   - Then run this script to grant admin role to that user
 * 
 * To run this script:
 *   npx tsx scripts/create-admin.ts <email>
 * 
 * Or set environment variables:
 *   ADMIN_EMAIL=your-email@example.com npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Please set:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin(email: string) {
  console.log(`\n🔍 Looking for user with email: ${email}`);

  // First, check if user exists
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('❌ Error fetching users:', userError.message);
    process.exit(1);
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error(`❌ User with email ${email} not found.`);
    console.error('\n💡 Please create the user account first through the signup process.');
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

  // Check if user already has admin role
  const { data: existingRole, error: roleError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError) {
    console.error('❌ Error checking existing role:', roleError.message);
    process.exit(1);
  }

  if (existingRole) {
    console.log('⚠️  User already has admin role!');
    return;
  }

  // Grant admin role using the function
  const { error: grantError } = await supabase.rpc('grant_admin_role', {
    _user_id: user.id,
  });

  if (grantError) {
    console.error('❌ Error granting admin role:', grantError.message);
    process.exit(1);
  }

  console.log('✅ Admin role granted successfully!');
  console.log(`\n🎉 User ${email} is now an admin.`);
}

// Main execution
const email = process.argv[2] || process.env.ADMIN_EMAIL;

if (!email) {
  console.error('❌ Error: Email is required');
  console.error('\nUsage:');
  console.error('  npx tsx scripts/create-admin.ts <email>');
  console.error('  or');
  console.error('  ADMIN_EMAIL=your-email@example.com npx tsx scripts/create-admin.ts');
  process.exit(1);
}

createAdmin(email).catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
