# Build checks and Supabase setup

## Build check

The GitHub Actions workflow at `.github/workflows/build.yml` runs for pushes and pull requests targeting `main`. It installs dependencies with Node.js 20 and runs `npm run build`; it does not connect to Datadog or require repository secrets.

## Apply the Supabase migrations to a hosted project

The repository includes Supabase CLI configuration and timestamped migrations. From the repository root, authenticate the CLI, link the project, and apply all pending migrations:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The project reference is the subdomain in your project URL. `db push` applies migrations in timestamp order. Alternatively, run the SQL files in `supabase/migrations/` in timestamp order using the Supabase SQL editor.

The second migration adds the storage cleanup policy used when an audio upload succeeds but track metadata insertion fails. The payment migration only creates a restricted ledger foundation; payment checkout, webhooks, and payouts remain disabled until a provider integration is implemented and verified.

Never put Supabase service-role credentials, payment secrets, or webhook secrets in frontend `VITE_` variables. The browser app should use only the Supabase project URL and its anon/publishable key.

## Assign an administrator for track review

The track moderation migration adds the `public.track_admins` allowlist, admin-only row-level security policies, and a private-audio preview policy. Admins can inspect pending submissions and approve or reject them from the Admin Review page; approval publishes the track and rejection leaves its audio private. Review decisions record the admin and timestamp.

Create a regular account in Artist Studio and verify its email. Then, in the Supabase SQL editor, add that user to the allowlist by their auth email:

```sql
insert into public.track_admins (user_id)
select id from auth.users where email = 'admin@example.com'
on conflict (user_id) do nothing;
```

Confirm that the query inserted one row. The admin should sign out and back in to refresh their access token/session state. Remove access by deleting that user's row from `public.track_admins`. Never grant admin access from browser code or expose a service-role key. Audio review is a human approval workflow; it does not automatically establish copyright ownership or scan files for malware.

For email/password signup, enable email confirmations in Supabase Auth. Set **Site URL** to `https://junubify-neon.vercel.app` and add both `https://junubify-neon.vercel.app` and `https://junubify-neon.vercel.app/auth/verified` to **Redirect URLs**. Signup confirmation returns to the dedicated `/auth/verified` landing page; passwordless sign-in links return to the site root.

Before sending confirmation emails to real users, configure a custom SMTP provider in **Authentication → SMTP Settings**. Supabase's built-in sender is for testing only: it is limited to 2 messages per hour and may deliver only to project team members. A rate-limit error cannot be fixed in the client app; configure SMTP, verify your sender domain with the provider (including SPF/DKIM), then use **Resend verification email**. The built-in sender's quota must reset before another message can be sent. Do not disable email confirmation as a workaround.

For local development, add `http://localhost:5173/auth/verified` to **Redirect URLs** (and the site root if using passwordless sign-in). The app uses its current origin unless `VITE_AUTH_REDIRECT_URL` is set; if set, allow the corresponding `/auth/verified` URL in Supabase as well. The callback page completes the Supabase session exchange and reports whether verification succeeded or the link needs to be requested again.

## Local Supabase development

Docker is required to run the local Supabase stack. Start it with:

```sh
npx supabase start
```

The CLI applies the migrations to the local database. Use the local API URL and anon key printed by `supabase start` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when running the app locally. Stop the local stack with `npx supabase stop`.
