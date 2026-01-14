/**
 * Script to create a complete admin account from scratch
 * This script creates both the user account and assigns admin role
 * 
 * Usage:
 *   node scripts/create-admin-account.js
 * 
 * Or with custom credentials:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123 ADMIN_NAME="Admin User" node scripts/create-admin-account.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  
  for (const file of envFiles) {
    try {
      const content = readFileSync(join(process.cwd(), file), 'utf-8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    } catch (err) {
      // File doesn't exist, continue
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ خطأ: متغيرات البيئة المطلوبة مفقودة');
  console.error('يرجى إعداد:');
  console.error('  - VITE_SUPABASE_URL أو SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nيمكنك العثور على service_role key في:');
  console.error('Supabase Dashboard > Settings > API > service_role key (secret)');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Generate random password if not provided
function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function createAdminAccount() {
  const email = process.env.ADMIN_EMAIL || `admin-${Date.now()}@fisgold.com`;
  const password = process.env.ADMIN_PASSWORD || generatePassword(12);
  const fullName = process.env.ADMIN_NAME || 'مدير النظام';

  console.log('\n🚀 بدء إنشاء حساب الأدمن...\n');

  // Step 1: Check if user already exists
  console.log('🔍 التحقق من وجود المستخدم...');
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    console.log(`⚠️  المستخدم موجود بالفعل: ${email}`);
    console.log('📝 منح صلاحية الأدمن للمستخدم الموجود...');
    
    // Grant admin role
    const { error: grantError } = await supabase.rpc('grant_admin_role', {
      _user_id: existingUser.id,
    });

    if (grantError) {
      // Try direct insert if function doesn't exist yet
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: existingUser.id, role: 'admin' })
        .select();

      if (insertError) {
        console.error('❌ خطأ في منح صلاحية الأدمن:', insertError.message);
        process.exit(1);
      }
    }

    console.log('✅ تم منح صلاحية الأدمن بنجاح!');
    console.log('\n📋 بيانات الدخول:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 البريد الإلكتروني: ${email}`);
    console.log(`🔑 كلمة المرور: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  // Step 2: Create new user
  console.log('👤 إنشاء حساب مستخدم جديد...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: fullName,
    },
  });

  if (createError) {
    console.error('❌ خطأ في إنشاء المستخدم:', createError.message);
    process.exit(1);
  }

  if (!newUser.user) {
    console.error('❌ فشل إنشاء المستخدم');
    process.exit(1);
  }

  console.log(`✅ تم إنشاء المستخدم: ${newUser.user.email} (ID: ${newUser.user.id})`);

  // Step 3: Grant admin role
  console.log('🔐 منح صلاحية الأدمن...');
  
  // Try using the function first
  let grantError = null;
  const { error: functionError } = await supabase.rpc('grant_admin_role', {
    _user_id: newUser.user.id,
  });

  if (functionError) {
    // If function doesn't exist, try direct insert
    console.log('⚠️  الدالة غير موجودة، محاولة الإدراج المباشر...');
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'admin' })
      .select();

    grantError = insertError;
  }

  if (grantError) {
    console.error('❌ خطأ في منح صلاحية الأدمن:', grantError.message);
    console.error('\n💡 قد تحتاج إلى تشغيل migration أولاً:');
    console.error('   supabase migration up');
    console.error('   أو تطبيق migration يدوياً من Supabase Dashboard');
    process.exit(1);
  }

  console.log('✅ تم منح صلاحية الأدمن بنجاح!');

  // Step 4: Display credentials
  console.log('\n🎉 تم إنشاء حساب الأدمن بنجاح!\n');
  console.log('📋 بيانات الدخول:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 البريد الإلكتروني: ${email}`);
  console.log(`🔑 كلمة المرور: ${password}`);
  console.log(`👤 الاسم: ${fullName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  احفظ هذه البيانات في مكان آمن!');
  console.log('💡 يمكنك استخدام هذه البيانات للدخول إلى لوحة تحكم الأدمن\n');
}

// Run the script
createAdminAccount().catch((error) => {
  console.error('❌ خطأ غير متوقع:', error);
  process.exit(1);
});
