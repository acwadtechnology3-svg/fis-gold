# Google OAuth Fix

## Changes Made

1. **Updated OAuth Redirect URL** (`src/contexts/AuthContext.tsx`)
   - Changed redirect URL from `window.location.origin` to `${window.location.origin}/`
   - Added OAuth query parameters for better compatibility
   - Added proper OAuth callback handling in `useEffect`

2. **Improved Error Handling** (`src/pages/Auth.tsx` & `src/pages/Index.tsx`)
   - Added comprehensive error detection from URL parameters and hash
   - Added URL cleanup after error display
   - Better error messages in Arabic

3. **Enhanced OAuth Callback Handling** (`src/contexts/AuthContext.tsx`)
   - Added automatic session detection after OAuth redirect
   - Added URL hash cleanup after successful OAuth
   - Better handling of OAuth state changes

## Required Configuration

### 1. Supabase Dashboard Configuration

Go to: **Supabase Dashboard > Authentication > URL Configuration**

Add the following to **Redirect URLs**:
```
https://www.fis-gold.com/
https://www.fis-gold.com/auth
```

### 2. Google Cloud Console Configuration

Go to: **Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs**

In your OAuth 2.0 Client ID settings, add the following to **Authorized redirect URIs**:
```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

**Important**: Replace `<your-supabase-project-ref>` with your actual Supabase project reference (found in your Supabase project URL).

### 3. Verify Google OAuth Provider in Supabase

Go to: **Supabase Dashboard > Authentication > Providers > Google**

Ensure:
- ✅ Google provider is enabled
- ✅ Client ID and Client Secret are correctly configured
- ✅ The Client ID matches your Google Cloud Console OAuth 2.0 Client ID

## Testing

1. Click "تسجيل الدخول بحساب Google" or "إنشاء حساب بحساب Google"
2. You should be redirected to Google login
3. After authorizing, you should be redirected back to the app
4. The app should automatically log you in and redirect to the appropriate page

## Troubleshooting

If you still see "Unable to exchange external code" error:

1. **Verify Redirect URLs Match Exactly**
   - The redirect URL in the code (`${window.location.origin}/`) must match one of the URLs in Supabase Dashboard
   - Check for trailing slashes, http vs https, www vs non-www

2. **Check Google OAuth Configuration**
   - Ensure the redirect URI in Google Console is: `https://<project-ref>.supabase.co/auth/v1/callback`
   - This is Supabase's callback URL, not your app URL

3. **Verify Supabase Project Settings**
   - Go to Settings > API
   - Ensure the Site URL is set to: `https://www.fis-gold.com`

4. **Check Browser Console**
   - Open browser DevTools > Console
   - Look for any additional error messages
   - Check Network tab for failed requests

## Notes

- The OAuth flow works as follows:
  1. User clicks Google login button
  2. App redirects to Google via Supabase
  3. User authorizes on Google
  4. Google redirects to Supabase callback URL
  5. Supabase exchanges code for tokens
  6. Supabase redirects to your app URL (configured in `redirectTo`)
  7. App detects session and logs user in

- The `redirectTo` parameter in the code is where users land AFTER OAuth completes
- The actual OAuth callback happens at Supabase's URL, not your app URL
