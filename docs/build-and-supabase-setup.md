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

For email/password signup, enable email confirmations in Supabase Auth. Set **Site URL** to `https://junubify-neon.vercel.app` and add it to **Redirect URLs**. Production auth emails return to this deployed domain; local development uses its current origin unless `VITE_AUTH_REDIRECT_URL` is set.

## Local Supabase development

Docker is required to run the local Supabase stack. Start it with:

```sh
npx supabase start
```

The CLI applies the migrations to the local database. Use the local API URL and anon key printed by `supabase start` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when running the app locally. Stop the local stack with `npx supabase stop`.
