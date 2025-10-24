# Typing Speed Challenge (Whop + Next.js)

This project replaces the AI Car Customizer tutorial UI with a Monkeytype-style typing speed challenge. It keeps the Whop authentication flow intact and layers in Supabase for player profiles, credit tracking, and a global leaderboard.

## Features

- 30-second typing tests that render randomized word prompts locally.
- Uses Whop session auth to fetch the logged-in user’s ID and username.
- Charges one credit per completed test; credits are stored in Supabase against the Whop user ID.
- Results are written from the browser via the Supabase JS client and surfaced on a global leaderboard.
- Whop checkout webhooks grant additional credits automatically.

## Getting Started

1. Install dependencies (pnpm recommended):
   ```bash
   pnpm install
   pnpm dev
   ```

2. Configure the required environment variables:

   ```ini
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_INITIAL_CREDITS=0          # optional default credits for new users

   # Whop
   WHOP_API_KEY=...
   NEXT_PUBLIC_WHOP_APP_ID=...
   NEXT_PUBLIC_WHOP_AGENT_USER_ID=...
   NEXT_PUBLIC_WHOP_COMPANY_ID=...
   WHOP_WEBHOOK_SECRET=...
   NEXT_PUBLIC_WHOP_PLAN_ID=plan_...
   WHOP_CREDITS_PER_PURCHASE=5         # credits granted per successful purchase webhook
   ```

3. Apply the Supabase schema located at `supabase/schema.sql` to your project (via the SQL editor or migration tooling). It creates the `users` and `results` tables plus helper functions used by the app and webhook.

4. Point your Whop webhook to `/api/webhooks` so credit purchases propagate back to Supabase.

With the environment ready, the main page (`/`) and experience route render the typing UI, deduct credits when each run completes, and push results into the leaderboard. Use the “Buy Credits” CTA whenever a player runs out of balance to launch Whop’s in-app purchase modal for the configured plan.
