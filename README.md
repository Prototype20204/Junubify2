# Junubify

Vite + React music platform with a Supabase-backed, authenticated artist submission flow. Payment screens are deliberately non-functional until a real merchant/provider integration is selected and configured.

## Run the web app

```sh
npm install
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
npm run dev
```

The anon/publishable key is intended for browser use only. Never put a Supabase `service_role` key, payment secret, or webhook secret in a `VITE_` variable.

## Configure persistent song submissions

1. Create a Supabase project and enable email authentication. Add `https://junubify-neon.vercel.app` and `https://junubify-neon.vercel.app/auth/verified` to the allowed redirect URLs; signup verification returns to the dedicated callback page. Configure a custom SMTP provider before sending confirmation emails to public users; Supabase's built-in sender is limited to 2 emails per hour and is not intended for production.
2. From the repository root, run `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push` to apply the migrations. You can also apply the timestamped SQL files in `supabase/migrations/` in order through the project SQL editor. See [the setup guide](docs/build-and-supabase-setup.md) for details.
3. Set the project URL and anon/publishable key in `.env.local` and in your web host's environment settings.
4. Start the app. Artists can create an account with email and password, verify their email, then sign in and submit metadata and audio from Artist Studio. Existing artists can also request a passwordless sign-in link.

Audio uploads go to a private 50 MB bucket under the authenticated artist's UUID. Database and storage row-level security restrict upload/read access; new tracks remain `pending_review`. Only a trusted administrator/backend should approve a track by changing its status to `published`. The public catalog fetches published rows, and audio is served with temporary signed URLs. The UI's sample tracks remain demo content.

Trusted administrators can review private submissions in the Admin Review page and approve or reject them. To grant access, first create and verify the administrator's normal account, then add its auth user to `public.track_admins` using the SQL instructions in [the setup guide](docs/build-and-supabase-setup.md). Browser file size/type checks are usability checks, not a security boundary; add rate limits/abuse controls, stronger content scanning, backup/retention policies, and production auth email configuration before launch.

## Deploy to Vercel

`vercel.json` configures the Vite build (`npm run build`, output `dist`) and SPA fallback. Import `Prototype20204/Junubify2` in Vercel, use the repository root as Root Directory, and deploy the `main` branch. In Vercel project settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the environments you intend to use, then redeploy. Production email links return to `https://junubify-neon.vercel.app`; signup confirmation uses `/auth/verified`. Set Supabase Auth's Site URL to the origin and add both the origin and callback URL to the allowed redirect URLs.

The production deployment currently uses `https://junubify-neon.vercel.app`. A push to GitHub only updates a Vercel project if that project is connected to this repository and branch.

If the app error screen appears, it displays the browser-side exception message to help diagnose the actual failure. Confirm the deployment is from the latest `main` commit and open the deployment's own URL, not an older deployment alias.

## Native app preparation

The web app is configured for Capacitor with the provisional Android/iOS application ID `com.junubify.app`. Run `npm run native:sync` after changing the web app to build and copy its assets into the native projects. Open `android/` in Android Studio or `ios/App/` in Xcode to configure signing and create store builds.

Store publication is not complete: there are no Google Play or Apple App Store listings or public APK download URL yet. Android release builds require an installed Android SDK and a protected signing key; iOS builds require macOS, Xcode, and Apple signing credentials. Before release, replace the generated app icons, provide store screenshots and privacy/support URLs, and configure native email-auth deep links and the matching Supabase redirect allowlist. Do not commit signing keys or provider secrets.

## Payments: not activated

The Monetization screen lists MTN, ZAIN, Digitel mobile money, and credit card as planned South Sudan payment methods. These are display-only options: no checkout, charge, or payout is made yet. Local providers have different merchant APIs, eligibility, webhook signatures, settlement/currency rules, and payout requirements; do not assume any provider is available for your business or country. To implement the real flow, choose the provider and merchant product you have access to and give the team its official API documentation and sandbox onboarding instructions. Keep credentials in server-side secrets, never in the browser. The `payment_events` and `royalty_ledger` tables are server-only foundations, not proof of received payments or payable earnings.

A production payment integration must create checkout sessions server-side, verify signed provider webhooks, process event IDs idempotently, reconcile settlements/refunds, grant entitlements only after verified payment, and calculate royalties from reconciled revenue. Payouts additionally need provider support, artist identity/compliance checks, and reconciliation. The proposed plan prices and 70% split are product placeholders until terms and financial rules are confirmed.
