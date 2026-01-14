# Complete Database Schema for Supabase - FIS Gold System

This document contains all database structures that need to be added to Supabase, organized by migration order.

## Summary of Tables

1. **profiles** - User profile information
2. **deposits** - User deposit requests
3. **withdrawals** - User withdrawal requests
4. **user_roles** - User roles and permissions
5. **metal_prices** - Gold and silver price tracking
6. **activity_log** - Admin activity tracking
7. **system_settings** - System configuration
8. **goldsmiths** - Goldsmith/vendor profiles
9. **products** - Products (goldsmith and FIS Gold products)
10. **orders** - Customer orders
11. **reviews** - Product/goldsmith reviews

## Migration Files (in order)

### 1. Initial Schema (20260108121854)
**Tables Created:**
- `profiles`
- `deposits`
- `withdrawals`

**Functions:**
- `handle_new_user()` - Auto-create profile on user signup
- `get_user_portfolio()` - Get user portfolio summary
- `update_updated_at_column()` - Auto-update updated_at timestamp

### 2. User Roles System (20260108152602)
**Types:**
- `app_role` ENUM ('admin', 'moderator', 'user')

**Tables:**
- `user_roles`

**Functions:**
- `has_role()` - Check if user has specific role

### 3. Metal Prices (20260108155424)
**Tables:**
- `metal_prices`

**Functions:**
- `get_latest_metal_prices()` - Get latest gold/silver prices

### 4. Extensions (20260108163006)
**Extensions:**
- `pg_cron` - For scheduled tasks
- `pg_net` - For network requests

### 5. Admin Role Functions (20260109000000)
**Functions:**
- `grant_admin_role()` - Grant admin role to user
- `grant_admin_role_by_email()` - Grant admin role by email

### 6. Admin Features (20260110000000)
**Tables:**
- `activity_log`
- `system_settings`

**Functions:**
- `log_admin_activity()` - Log admin actions
- `get_user_portfolio_admin()` - Admin view of user portfolio

**Default Settings:**
- withdrawal_fee_percentage: 2.5%
- min_deposit_amount: 2000
- auto_approve_deposits: false
- email_notifications: true
- maintenance_mode: false

### 7. Default Admin (20260111000000)
**Functions:**
- `create_default_admin()` - Create default admin user

### 8. Buy/Sell Prices (20260111000001)
**Updates:**
- Adds `buy_price_per_gram`, `sell_price_per_gram` to `metal_prices`
- Adds `buy_price_per_ounce`, `sell_price_per_ounce` to `metal_prices`

### 9. Goldsmiths System (20260112000000)
**Tables:**
- `goldsmiths`
- `products`
- `orders`
- `reviews`

**Functions:**
- `update_goldsmith_rating()` - Auto-update goldsmith rating
- `is_goldsmith()` - Check if user is approved goldsmith
- `approve_goldsmith()` - Approve goldsmith application

### 10. Update Goldsmiths Fields (20260112000001)
**Updates to `goldsmiths` table:**
- `national_id`
- `city`
- `tax_card_number`
- `tax_card_image_url`
- `shop_photo_url`
- `years_experience`
- `product_types` (array)
- `payment_method`
- `bank_account`
- `vodafone_cash_number`
- `company_account`
- `terms_accepted`
- `data_accuracy_accepted`
- `review_accepted`

### 11. Storage Policies (20260112000002)
**Storage Bucket:** `public`
**Policies:**
- Authenticated users can upload to `goldsmiths/{user_id}/`
- Users can update/delete their own files
- Public read access

### 12. FIS Gold Products (20260112000004)
**Updates to `products` table:**
- `goldsmith_id` now nullable (for FIS Gold products)
- `metal_type` added ('gold' or 'silver')
- `karat` now nullable for silver products

**Updates to `orders` table:**
- `goldsmith_id` now nullable

---

## Complete Table Structures

### profiles
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, UNIQUE, REFERENCES auth.users)
- full_name (TEXT)
- phone (TEXT)
- avatar_url (TEXT)
- email (TEXT)
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### deposits
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- amount (DECIMAL(15,2), >= 2000)
- package_type (TEXT: '1_year', '2_years', '3_years')
- status (TEXT: 'pending', 'approved', 'rejected')
- gold_grams (DECIMAL(10,4))
- gold_price_at_deposit (DECIMAL(15,2))
- notes (TEXT)
- created_at (TIMESTAMP)
- approved_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### withdrawals
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- deposit_id (UUID, REFERENCES deposits)
- amount (DECIMAL(15,2))
- withdrawal_type (TEXT: 'cash', 'gold', 'silver')
- status (TEXT: 'pending', 'processing', 'completed', 'rejected')
- gold_price_at_withdrawal (DECIMAL(15,2))
- fee_percentage (DECIMAL(5,2), default: 0)
- fee_amount (DECIMAL(15,2), default: 0)
- net_amount (DECIMAL(15,2))
- notes (TEXT)
- created_at (TIMESTAMP)
- processed_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### user_roles
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- role (app_role: 'admin', 'moderator', 'user')
- created_at (TIMESTAMP)
```

### metal_prices
```sql
- id (UUID, PRIMARY KEY)
- metal_type (TEXT: 'gold', 'silver')
- price_per_gram (NUMERIC)
- price_per_ounce (NUMERIC)
- buy_price_per_gram (NUMERIC)
- sell_price_per_gram (NUMERIC)
- buy_price_per_ounce (NUMERIC)
- sell_price_per_ounce (NUMERIC)
- source (TEXT, default: 'api')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### activity_log
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- action_type (TEXT)
- entity_type (TEXT)
- entity_id (UUID)
- description (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

### system_settings
```sql
- id (UUID, PRIMARY KEY)
- key (TEXT, UNIQUE)
- value (JSONB)
- description (TEXT)
- updated_by (UUID, REFERENCES auth.users)
- updated_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

### goldsmiths
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, UNIQUE, REFERENCES auth.users)
- name (TEXT)
- shop_name (TEXT)
- address (TEXT)
- phone (TEXT)
- email (TEXT)
- commercial_registration (TEXT)
- national_id (TEXT)
- city (TEXT)
- tax_card_number (TEXT)
- id_card_image_url (TEXT)
- commercial_registration_image_url (TEXT)
- tax_card_image_url (TEXT)
- shop_photo_url (TEXT)
- logo_url (TEXT)
- description (TEXT)
- years_experience (INTEGER)
- product_types (TEXT[]) -- Array: ['crafted', 'ingots', 'gold_coins', 'silver']
- payment_method (TEXT: 'bank_transfer', 'vodafone_cash', 'company_account')
- bank_account (TEXT)
- vodafone_cash_number (TEXT)
- company_account (TEXT)
- status (TEXT: 'pending', 'approved', 'rejected', 'suspended')
- admin_notes (TEXT)
- rating_average (DECIMAL(3,2), default: 0)
- rating_count (INTEGER, default: 0)
- terms_accepted (BOOLEAN, default: false)
- data_accuracy_accepted (BOOLEAN, default: false)
- review_accepted (BOOLEAN, default: false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- approved_at (TIMESTAMP)
```

### products
```sql
- id (UUID, PRIMARY KEY)
- goldsmith_id (UUID, NULLABLE, REFERENCES goldsmiths)
- name (TEXT)
- weight_grams (DECIMAL(10,4))
- metal_type (TEXT: 'gold', 'silver')
- karat (INTEGER, NULLABLE: 18, 21, 22, 24 for gold)
- price (DECIMAL(15,2))
- making_charge (DECIMAL(15,2), default: 0)
- quantity (INTEGER, default: 1)
- images (TEXT[]) -- Array of image URLs
- description (TEXT)
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### orders
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- goldsmith_id (UUID, NULLABLE, REFERENCES goldsmiths)
- product_id (UUID, REFERENCES products)
- quantity (INTEGER, default: 1)
- total_amount (DECIMAL(15,2))
- status (TEXT: 'new', 'processing', 'shipped', 'completed', 'cancelled')
- shipping_address (TEXT)
- shipping_phone (TEXT)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- shipped_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```

### reviews
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- goldsmith_id (UUID, REFERENCES goldsmiths)
- order_id (UUID, REFERENCES orders)
- rating (INTEGER, 1-5)
- comment (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## Row Level Security (RLS) Policies

All tables have RLS enabled with policies for:
- Users can view/manage their own data
- Admins can view/manage all data
- Public access where appropriate (reviews, approved goldsmiths, active products)

---

## Storage Setup Required

**Bucket Name:** `public`
**Public Access:** Yes
**Folder Structure:**
- `goldsmiths/{user_id}/{filename}` - For goldsmith documents and images

---

## Functions Summary

1. `handle_new_user()` - Trigger function for new user registration
2. `update_updated_at_column()` - Trigger function for auto-updating timestamps
3. `has_role()` - Check user role
4. `get_user_portfolio()` - Get user portfolio summary
5. `get_user_portfolio_admin()` - Admin view of user portfolio
6. `get_latest_metal_prices()` - Get latest metal prices
7. `log_admin_activity()` - Log admin actions
8. `grant_admin_role()` - Grant admin role
9. `grant_admin_role_by_email()` - Grant admin by email
10. `create_default_admin()` - Create default admin
11. `update_goldsmith_rating()` - Update goldsmith rating (trigger)
12. `is_goldsmith()` - Check if user is goldsmith
13. `approve_goldsmith()` - Approve goldsmith

---

## Important Notes

1. Run migrations in order (by timestamp)
2. Create storage bucket `public` manually in Supabase Dashboard
3. Set storage bucket to public
4. Default admin user must be created manually (email: admin@fisgold.com)
5. All tables use UUID primary keys
6. All tables have `created_at` and `updated_at` timestamps
7. RLS is enabled on all tables
8. Foreign keys use CASCADE deletion where appropriate

