# كيفية إنشاء حساب الأدمن للاختبار

## الطريقة الأولى: استخدام Supabase Dashboard (الأسهل)

### الخطوة 1: إنشاء المستخدم
1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **Authentication** > **Users**
4. اضغط على **Add User** أو **Invite User**
5. أدخل البيانات التالية:
   - **Email**: `admin@fisgold.com`
   - **Password**: `Admin123!@#`
   - **Auto Confirm**: ✅ (فعّل)
6. اضغط **Create User**

### الخطوة 2: منح صلاحية الأدمن
1. اذهب إلى **SQL Editor** في Supabase Dashboard
2. انسخ محتوى ملف `scripts/create-admin-sql.sql`
3. الصق الكود واضغط **Run**
4. يجب أن ترى رسالة نجاح

### الخطوة 3: تسجيل الدخول
- **Email**: `admin@fisgold.com`
- **Password**: `Admin123!@#`
- افتح: `http://localhost:8080/auth`

---

## الطريقة الثانية: استخدام السكريبت (يتطلب Service Role Key)

### الخطوة 1: إضافة Service Role Key
1. افتح Supabase Dashboard
2. اذهب إلى **Settings** > **API**
3. انسخ **service_role** key (المفتاح السري)
4. أضفه إلى ملف `.env`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### الخطوة 2: تشغيل السكريبت
```bash
node scripts/create-test-admin.js
```

---

## بيانات الدخول الافتراضية

- **Email**: `admin@fisgold.com`
- **Password**: `Admin123!@#`
- **الاسم**: مدير النظام

⚠️ **مهم**: غيّر كلمة المرور بعد أول تسجيل دخول!
