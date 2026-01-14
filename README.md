# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## How to create an admin account?

To create an admin account, follow these steps:

1. **First, create a regular user account** through the signup process in your application.

2. **Run the database migration** to add the admin role functions:
   ```sh
   # If using Supabase CLI
   supabase migration up
   
   # Or apply the migration manually through Supabase dashboard
   ```

3. **Set up environment variables** in a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   
   You can find your service role key in Supabase Dashboard > Settings > API > service_role key (secret)

4. **Run the admin creation script**:
   ```sh
   # Using Node.js (JavaScript version)
   node scripts/create-admin.js your-email@example.com
   
   # Or using TypeScript (requires tsx)
   npx tsx scripts/create-admin.ts your-email@example.com
   ```

   Alternatively, you can use environment variable:
   ```sh
   ADMIN_EMAIL=your-email@example.com node scripts/create-admin.js
   ```

The script will:
- Find the user by email
- Grant them the admin role
- Verify the role was assigned successfully

**Note**: The service role key bypasses Row Level Security (RLS), so keep it secure and never commit it to version control.
