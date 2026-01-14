# Troubleshooting "Invalid API Key" Error

## ✅ Configuration Verified

Your configuration is **correct**:
- **.env.local file exists** ✅
- **Variables are correct** ✅
  - `VITE_SUPABASE_URL=https://qvcjuwjblpoywwbuofig.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QiCJcCVynfo0EWiXmafFrA_81LD6Ors`
- **Key matches Supabase** ✅
- **Key length is correct** (46 characters) ✅

## 🔧 Step-by-Step Fix

### Step 1: Complete Server Restart

1. **Stop the dev server completely:**
   - Press `Ctrl+C` in the terminal
   - Wait for it to fully stop
   - Close the terminal if needed

2. **Clear any build cache:**
   ```bash
   # Delete the dist folder if it exists
   Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
   
   # Delete node_modules/.vite cache
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   ```

3. **Start the dev server fresh:**
   ```bash
   npm run dev
   ```

### Step 2: Clear Browser Data

1. **Open Browser DevTools** (F12)
2. **Go to Application/Storage tab**
3. **Clear all storage:**
   - Right-click on your site URL
   - Select "Clear"
   - Check all boxes (Local Storage, Session Storage, Cookies)
   - Click "Clear site data"
4. **Hard refresh:**
   - Press `Ctrl+Shift+R` (Windows/Linux)
   - Or `Cmd+Shift+R` (Mac)

### Step 3: Verify Environment Variables Load

1. **Open browser console** (F12)
2. **Type these commands:**
   ```javascript
   console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...')
   ```

   **Expected output:**
   ```
   URL: https://qvcjuwjblpoywwbuofig.supabase.co
   KEY: sb_publishable_QiCJcC...
   ```

   **If you see `undefined`:**
   - The environment variables aren't loading
   - Restart the dev server again
   - Check that the file is named exactly `.env.local` (not `.env.local.txt`)

### Step 4: Check File Location

Make sure `.env.local` is in the **project root** (same folder as `package.json`):

```
fisgold/
  ├── .env.local          ← Should be here
  ├── package.json
  ├── src/
  ├── ...
```

### Step 5: Verify File Format

Open `.env.local` and ensure:
- No extra spaces around `=`
- No quotes around values
- No blank lines at the top
- File encoding is UTF-8

**Correct format:**
```env
VITE_SUPABASE_URL=https://qvcjuwjblpoywwbuofig.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QiCJcCVynfo0EWiXmafFrA_81LD6Ors
```

**Incorrect formats (don't use):**
```env
# ❌ Wrong - spaces around =
VITE_SUPABASE_URL = https://qvcjuwjblpoywwbuofig.supabase.co

# ❌ Wrong - quotes
VITE_SUPABASE_URL="https://qvcjuwjblpoywwbuofig.supabase.co"

# ❌ Wrong - wrong prefix
REACT_APP_SUPABASE_URL=https://qvcjuwjblpoywwbuofig.supabase.co
```

## 🔍 Additional Checks

### Check 1: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/qvcjuwjblpoywwbuofig/settings/api
2. Verify the **publishable key** matches: `sb_publishable_QiCJcCVynfo0EWiXmafFrA_81LD6Ors`
3. Make sure it's **not disabled**

### Check 2: Package Version

Check if `@supabase/supabase-js` version supports publishable keys:
```bash
npm list @supabase/supabase-js
```

Should be version **2.39.0 or higher** for publishable key support.

### Check 3: Network Tab

1. Open DevTools → Network tab
2. Try to sign up/login
3. Look for API requests to Supabase
4. Check the request headers - does it include the Authorization header?

## 🆘 Still Not Working?

If the error persists after all steps:

1. **Try using the legacy anon key temporarily:**
   
   In `.env.local`, replace:
   ```env
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Y2p1d2pibHBveXd3YnVvZmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzMwNTUsImV4cCI6MjA4MzkwOTA1NX0.rtKquaPY5dVQToUdMGRKBmuAZ3Ly8E0hy-xZ6JE_9GM
   ```
   
   Then restart the dev server.

2. **Check browser console for errors:**
   - Look for any red error messages
   - Check for CORS errors
   - Check for network errors

3. **Check terminal/console:**
   - Look for Vite errors
   - Look for compilation errors
   - Check if the dev server started successfully

## 📋 Summary

- ✅ Configuration is correct
- ✅ Key matches Supabase
- ⚠️ Most likely cause: Environment variables not loaded (need server restart)
- ⚠️ Second most likely: Browser cache (need hard refresh)

---

**Last Updated:** $(date)
**Status:** Configuration verified ✅ | Waiting for server restart

