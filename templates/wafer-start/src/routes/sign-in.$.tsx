import { SignIn } from "@clerk/tanstack-react-start";
import { ArrowRight } from "@phosphor-icons/react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { authPaths } from "@/app/auth";
import { buildTitle } from "@/app/site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readClientEnv } from "@/env/client";

export const Route = createFileRoute("/sign-in/$")({
  head: () => ({
    meta: [{ title: buildTitle("Sign in") }],
  }),
  component: SignInPage,
});

function SignInPage() {
  const clientEnv = readClientEnv();

  if (!clientEnv.clerkPublishableKey) {
    return <AuthSetupRequiredCard />;
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]">
          <CardTitle>Continue</CardTitle>
          <CardDescription>
            This starter uses a single hosted auth page so agents and humans can link auth up
            without inventing the route structure first.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-6">
          <SignIn
            fallbackRedirectUrl={authPaths.afterSignIn}
            path={authPaths.signIn}
            routing="path"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AuthSetupRequiredCard() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Authentication is scaffolded, but not enabled yet</CardTitle>
          <CardDescription>
            This starter only renders the hosted auth flow once `VITE_CLERK_PUBLISHABLE_KEY` and
            `CLERK_SECRET_KEY` are configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-700">
          <p>
            Add those keys to `.env`, keep `VITE_CLERK_SIGN_IN_URL` pointed at this route, and
            reload the app.
          </p>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
            to="/"
          >
            Back to the starter
            <ArrowRight className="size-4" weight="bold" />
          </Link>
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
            Route attempted: {authPaths.signIn}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
