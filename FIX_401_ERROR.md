# Fixing 401 Unauthorized Error

## Error Details

You're getting a **401 Unauthorized** error when trying to sign up:
```
POST https://qvcjuwjblpoywwbuofig.supabase.co/auth/v1/signup 401 (Unauthorized)
```

This means:
- ✅ The request is reaching Supabase (network is working)
- ✅ The URL is correct
- ❌ The API key is being rejected

## Solution: Use Legacy Anon Key

The publishable key format (`sb_publishable_...`) might not be fully supported by your client library version, or there might be a configuration issue. Let's try using the **legacy anon key** instead.

### Step 1: Update .env.local

Open `.env.local` and replace the publishable key with the legacy anon key:

**Change from:**
```env
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QiCJcCVynfo0EWiXmafFrA_81LD6Ors
```

**Change to:**
```env
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Y2p1d2pibHBveXd3YnVvZmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzMwNTUsImV4cCI6MjA4MzkwOTA1NX0.rtKquaPY5dVQToUdMGRKBmuAZ3Ly8E0hy-xZ6JE_9GM
```

**Complete .env.local should look like:**
```env
VITE_SUPABASE_URL=https://qvcjuwjblpoywwbuofig.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Y2p1d2pibHBveXd3YnVvZmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzMwNTUsImV4cCI6MjA4MzkwOTA1NX0.rtKquaPY5dVQToUdMGRKBmuAZ3Ly8E0hy-xZ6JE_9GM
```

### Step 2: Restart Dev Server

**IMPORTANT:** You must restart the dev server for environment variables to load:

1. Stop the server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 3: Clear Browser Cache

1. Open DevTools (F12)
2. Go to Application tab
3. Clear all storage (Local Storage, Session Storage, Cookies)
4. Hard refresh (Ctrl+Shift+R)

### Step 4: Test Signup

Try signing up again - it should work now!

## Why This Works

The legacy anon key (JWT format) is the traditional format that has been supported for a long time and is more compatible across different versions of the Supabase client library.

The publishable key format (`sb_publishable_...`) is newer and might have compatibility issues with some client library versions or project configurations.

## Alternative: Check Supabase Settings

If you want to keep using the publishable key, check:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qvcjuwjblpoywwbuofig
2. Go to Authentication > Settings
3. Make sure "Enable email signup" is enabled
4. Check API settings to ensure the publishable key is active

## Summary

- **Problem:** 401 Unauthorized when signing up
- **Solution:** Use legacy anon key instead of publishable key
- **Action:** Update `.env.local` with legacy key and restart server

