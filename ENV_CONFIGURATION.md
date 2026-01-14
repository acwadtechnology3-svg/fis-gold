# Environment Configuration Guide

## Current Configuration Status

Your Supabase credentials are correctly configured in `.env.local`:

```
VITE_SUPABASE_URL=https://qvcjuwjblpoywwbuofig.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QiCJcCVynfo0EWiXmafFrA_81LD6Ors
```

## Important Notes

1. **This is a Vite project** - It uses `VITE_` prefix, NOT `REACT_APP_` or `NEXT_PUBLIC_`
2. **Environment variables** - Only variables with `VITE_` prefix are exposed to the frontend
3. **Secret key** - The secret key (`sb_secret_eG4YSNKUw7_DrkdsPPL6Jw__rImTQKv`) should NEVER be used in the frontend

## Fixing "Invalid API Key" Error

If you're seeing an "Invalid API key" error, follow these steps:

### Step 1: Restart the Development Server

Environment variables are only loaded when the dev server starts. You MUST restart it:

1. Stop the current dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

### Step 2: Clear Browser Cache

1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear Local Storage
4. Clear Session Storage
5. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Step 3: Verify Environment Variables

Check if the variables are being loaded:

1. Open browser console (F12)
2. Type: `console.log(import.meta.env.VITE_SUPABASE_URL)`
3. Type: `console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)`

Both should show your values (not `undefined`)

### Step 4: Verify .env.local File

Make sure your `.env.local` file in the project root contains:

```env
VITE_SUPABASE_URL=https://qvcjuwjblpoywwbuofig.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QiCJcCVynfo0EWiXmafFrA_81LD6Ors
```

**Important:** 
- No spaces around the `=` sign
- No quotes needed
- Use `VITE_` prefix (not `REACT_APP_` or `NEXT_PUBLIC_`)

## Troubleshooting

### Error persists after restart?

1. Check for typos in the key
2. Verify the key is enabled in Supabase Dashboard
3. Check Supabase Dashboard > Settings > API > Publishable keys
4. Ensure you're using the correct key (not the secret key)

### Variables show as undefined?

1. Make sure the file is named `.env.local` (not `.env.local.txt`)
2. Make sure the file is in the project root (same folder as `package.json`)
3. Restart the dev server after creating/modifying the file

### Still having issues?

1. Check browser console for errors
2. Check terminal/console for Vite errors
3. Verify the Supabase project is active and accessible
4. Check Supabase Dashboard for any service issues

## Project Details

- **Project ID:** qvcjuwjblpoywwbuofig
- **URL:** https://qvcjuwjblpoywwbuofig.supabase.co
- **Publishable Key:** sb_publishable_QiCJcCVynfo0EWiXmafFrA_81LD6Ors
- **Secret Key:** sb_secret_eG4YSNKUw7_DrkdsPPL6Jw__rImTQKv (server-side only!)

---

**Last Updated:** $(date)
**Status:** ✅ Configuration verified and ready

