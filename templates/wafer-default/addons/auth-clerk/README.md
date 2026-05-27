# auth-clerk add-on

Adds Clerk client and server authentication scaffolding to `wafer-default`.

Install:

    bun run add auth-clerk
    bun install

Preferred setup for users and agents:

    bun run setup:auth

Clerk is an external auth provider. It sends sign-in emails/codes, stores user sessions, and keeps
the app from having to build its own login system.

The setup command installs this add-on if needed, runs `bun install`, starts Clerk CLI browser login,
creates and connects the Clerk auth project for this app, configures Wafer's default email-code auth
model, pulls `.env.local`, writes matching Wafer route defaults for Clerk conventions, runs
`clerk doctor`, then verifies the app. Do not ask users to copy keys from the Clerk Dashboard unless
Clerk CLI cannot create, link, pull env, or patch config.

Advanced fallback: if the Clerk app already exists and you know its `app_...` id, run
`bun run setup:auth -- --app app_xxx`.

Clerk env variables:

    VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...

Open `/sign-in` after starting the app. The same Clerk sign-in surface handles new and returning
users. The app's route paths come from `src/app/auth.ts`, where agents can also change post-auth
destinations. Without a publishable key, the route renders a setup message instead of crashing.
The server helper exposes
`/api/auth/session` and reusable request authentication helpers in `src/server/auth/clerk.ts`.
