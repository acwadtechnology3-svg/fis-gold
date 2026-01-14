/**
 * Script to create a test admin account with default credentials
 * Email: admin@fisgold.com
 * Password: Admin123!@#
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnv() {
  try {
    const content = readFileSync(join(process.cwd(), '.env'), 'utf-8');
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

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ خطأ: VITE_SUPABASE_URL غير موجود في ملف .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ خطأ: SUPABASE_SERVICE_ROLE_KEY غير موجود في ملف .env');
  console.error('\n💡 للحصول على Service Role Key:');
  console.error('   1. افتح Supabase Dashboard');
  console.error('   2. اذهب إلى Settings > API');
  console.error('   3. انسخ service_role key (secret)');
  console.error('   4. أضفه إلى ملف .env:');
  console.error('      SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here\n');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TEST_EMAIL = 'admin@fisgold.com';
const TEST_PASSWORD = 'Admin123!@#';
const TEST_NAME = 'مدير النظام';

async function createTestAdmin() {
  console.log('\n🚀 بدء إنشاء حساب الأدمن للاختبار...\n');

  try {
    // Check if user already exists
    console.log('🔍 التحقق من وجود المستخدم...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL);

    let userId;

    if (existingUser) {
      console.log(`✅ المستخدم موجود بالفعل: ${TEST_EMAIL}`);
      userId = existingUser.id;
    } else {
      // Create new user
      console.log('👤 إنشاء حساب مستخدم جديد...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: TEST_NAME,
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

      userId = newUser.user.id;
      console.log(`✅ تم إنشاء المستخدم: ${TEST_EMAIL} (ID: ${userId})`);
    }

    // Grant admin role
    console.log('🔐 منح صلاحية الأدمن...');
    
    // Try using the function first
    const { error: functionError } = await supabase.rpc('grant_admin_role', {
      _user_id: userId,
    });

    if (functionError) {
      // If function doesn't exist, try direct insert
      console.log('⚠️  الدالة غير موجودة، محاولة الإدراج المباشر...');
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' })
        .select();

      if (insertError) {
        console.error('❌ خطأ في منح صلاحية الأدمن:', insertError.message);
        console.error('\n💡 قد تحتاج إلى تطبيق migration أولاً:');
        console.error('   supabase migration up');
        console.error('   أو تطبيق migration يدوياً من Supabase Dashboard');
        process.exit(1);
      }
    }

    console.log('✅ تم منح صلاحية الأدمن بنجاح!');

    // Display credentials
    console.log('\n🎉 تم إنشاء حساب الأدمن بنجاح!\n');
    console.log('📋 بيانات الدخول:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 البريد الإلكتروني: ${TEST_EMAIL}`);
    console.log(`🔑 كلمة المرور: ${TEST_PASSWORD}`);
    console.log(`👤 الاسم: ${TEST_NAME}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  احفظ هذه البيانات في مكان آمن!');
    console.log('💡 يمكنك استخدام هذه البيانات للدخول إلى لوحة تحكم الأدمن');
    console.log('🌐 رابط الدخول: http://localhost:8080/auth\n');
    
  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error);
    process.exit(1);
  }
}

createTestAdmin();
