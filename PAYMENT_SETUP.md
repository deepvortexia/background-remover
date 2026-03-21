# Payment System Setup Guide

## Environment Variables

### Vercel Environment Variables (Production)
Configure these in your Vercel project settings:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://txznlbzrvbxjxujrmhee.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Replicate
REPLICATE_API_TOKEN=r8_...

# Resend (Email Notifications)
RESEND_API_KEY=re_...
```

### Local Development (.env)
Create a `.env` file in the project root:

```bash
# Frontend (Vite requires VITE_ prefix)
VITE_SUPABASE_URL=https://txznlbzrvbxjxujrmhee.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API (No prefix needed for serverless functions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://txznlbzrvbxjxujrmhee.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REPLICATE_API_TOKEN=r8_...

# Resend (Email Notifications)
RESEND_API_KEY=re_...
```

## Supabase Database Setup

### 1. Create Tables

Run this SQL in the Supabase SQL Editor:

```sql
-- Table profiles (users + credits)
create table profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  avatar_url text,
  credits integer default 3,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Table transactions (purchase history)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  stripe_session_id text,
  stripe_payment_intent text,
  pack_name text,
  amount_cents integer,
  credits_purchased integer,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- Enable RLS (Row Level Security)
alter table profiles enable row level security;
alter table transactions enable row level security;

-- Policies for profiles
create policy "Users can view own profile" 
  on profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on profiles for insert 
  with check (auth.uid() = id);

-- Policies for transactions
create policy "Users can view own transactions" 
  on transactions for select 
  using (auth.uid() = user_id);

create policy "System can insert transactions" 
  on transactions for insert 
  with check (true);
```

### 2. Configure Google OAuth

1. Go to **Supabase Dashboard** > **Authentication** > **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID: `878591098912-...`
   - Client Secret: `GOCSPX-...`
4. Add authorized redirect URIs:
   - `https://txznlbzrvbxjxujrmhee.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

### 3. Configure Email Auth (Magic Link)

1. Go to **Supabase Dashboard** > **Authentication** > **Providers**
2. Enable **Email** provider
3. Enable **Confirm email** (optional)
4. Configure email templates in **Email Templates** section

## Stripe Setup

### 1. Create Products (Optional)
You can create products in Stripe Dashboard, or the API will create them dynamically.

### 2. Configure Webhook

1. Go to **Stripe Dashboard** > **Developers** > **Webhooks**
2. Add endpoint: `https://deepvortexai.com/api/webhook`
3. Select event: `checkout.session.completed`
4. Copy the **Signing secret** and add it to `STRIPE_WEBHOOK_SECRET`

### 3. Test Webhook Locally

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/webhook

# Copy the webhook signing secret to your .env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Testing

### Test Authentication
1. Start the dev server: `npm run dev`
2. Click "Sign In"
3. Try both Google OAuth and Magic Link
4. Verify you receive 3 free credits

### Test Credit System
1. Sign in
2. Generate an emoticon
3. Verify credit is deducted
4. Check Supabase dashboard to confirm

### Test Payment Flow
1. Run out of credits (or set credits to 0 in Supabase)
2. Click "Buy Credits"
3. Select a pack
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify credits are added (check Supabase)
7. Verify confirmation email is received (check spam folder)

## Resend Email Setup

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys** in the dashboard
3. Create a new API key
4. Copy the key (starts with `re_...`)
5. Add it to your environment variables as `RESEND_API_KEY`

### 2. Configure Email Domain (Optional)

For production, you can use a custom domain:
1. Go to **Domains** in Resend dashboard
2. Add your domain (e.g., `deepvortexai.xyz`)
3. Add DNS records as instructed
4. Update the `from` address in `lib/emailService.ts`:
   ```typescript
   from: 'Deep Vortex AI <noreply@deepvortexai.xyz>'
   ```

For testing, you can use the default `onboarding@resend.dev` sender.

### 3. Test Email Delivery

1. Complete a test purchase
2. Check the email inbox for the confirmation
3. Verify email renders correctly (check in Gmail, Outlook, etc.)
4. Test the "Start Creating Emojis" button link

### 4. Email Features

The purchase confirmation email includes:
- ✅ Gold/black theme matching the app design
- 📦 Purchase details (pack name, credits, balance, amount)
- 🚀 Call-to-action button to return to the app
- 💡 Pro tips for using the platform
- 📅 Transaction timestamp

**Note**: Email sending is non-blocking. If the email fails to send, credits are still added successfully.

## Security Checklist

- [x] Row Level Security (RLS) enabled on all tables
- [x] Stripe webhook signature verification
- [x] Supabase service role key only used in server-side code
- [x] Auth token verification before credit operations
- [ ] Rate limiting on API endpoints (TODO)
- [ ] CORS configuration for production

## Common Issues

### Credits not updating after payment
- Check webhook is configured correctly in Stripe
- Verify webhook secret matches
- Check Vercel logs for webhook errors
- Ensure Supabase service role key has write permissions

### Email not being sent
- Verify `RESEND_API_KEY` is configured in environment variables
- Check Vercel logs for email sending errors
- Ensure user has a valid email address in their profile
- Test with Resend's default sender `onboarding@resend.dev` first

### Authentication not working
- Verify Supabase URL and anon key are correct
- Check Google OAuth redirect URIs
- Ensure `VITE_` prefix is used for frontend env vars

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors: `npm run build`
- Verify all imports are correct
