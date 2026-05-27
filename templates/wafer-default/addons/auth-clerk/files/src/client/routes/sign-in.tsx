import { SignIn } from "@clerk/react";
import { createRoute } from "@tanstack/react-router";

import { authPaths } from "@/app/auth";
import { getClerkPublishableKey } from "@/client/auth/clerk";
import { buttonVariants } from "@/client/components/ui/button";

import { rootRoute } from "./__root";

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: authPaths.signIn,
  component: SignInPage,
});

function SignInPage() {
  if (!getClerkPublishableKey()) {
    return (
      <section className="mx-auto max-w-md space-y-4">
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">Sign in</h1>
        <output className="block space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <span className="block">
            Clerk is not connected yet. Clerk is an external auth provider that sends sign-in emails
            and keeps users signed in.
          </span>
          <span className="block">
            Run <code className="rounded bg-amber-100 px-1.5 py-0.5">bun run setup:auth</code> to
            connect it.
          </span>
        </output>
        <a className={buttonVariants({ variant: "outline" })} href="/">
          Home
        </a>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="text-3xl font-semibold tracking-normal text-foreground">Sign in</h1>
      <SignIn
        fallbackRedirectUrl={authPaths.afterSignIn}
        signUpFallbackRedirectUrl={authPaths.afterSignUp}
        withSignUp
      />
    </section>
  );
}
