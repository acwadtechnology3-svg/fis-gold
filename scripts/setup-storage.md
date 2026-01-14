# إعداد Storage في Supabase

## الخطوات المطلوبة:

### 1. إنشاء Storage Bucket

1. اذهب إلى **Supabase Dashboard** > **Storage**
2. اضغط على **"New bucket"**
3. أدخل المعلومات التالية:
   - **Name**: `public`
   - **Public bucket**: ✅ **مفعل** (تأكد من تفعيله)
   - **File size limit**: 5 MB (أو أكثر حسب احتياجك)
   - **Allowed MIME types**: اتركه فارغ أو أضف `image/*`

4. اضغط على **"Create bucket"**

### 2. تطبيق Storage Policies

1. اذهب إلى **Supabase Dashboard** > **SQL Editor**
2. انسخ محتوى الملف: `supabase/migrations/20260112000002_storage_policies.sql`
3. قم بتشغيله (Run)

### 3. التحقق من الإعداد

1. اذهب إلى **Storage** > **Policies**
2. تأكد من وجود الـ policies التالية:
   - ✅ Authenticated users can upload goldsmith files
   - ✅ Users can update their own goldsmith files
   - ✅ Users can delete their own goldsmith files
   - ✅ Public can read files in public bucket
   - ✅ Users can read their own goldsmith files

### 4. اختبار الرفع

بعد تطبيق جميع الخطوات، جرّب رفع صورة من نموذج التسجيل كصايغ.

## ملاحظات:

- تأكد من أن الـ bucket اسمه بالضبط `public`
- تأكد من تفعيل **Public bucket**
- تأكد من تطبيق جميع الـ policies
- إذا استمرت المشكلة، تحقق من Console في المتصفح لرؤية الخطأ بالتفصيل
