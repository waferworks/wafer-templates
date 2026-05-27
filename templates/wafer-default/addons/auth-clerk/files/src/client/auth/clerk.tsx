import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";

import { authPaths } from "@/app/auth";

export function getClerkPublishableKey() {
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
}

interface ClerkAuthProviderProps {
  children: ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  const publishableKey = getClerkPublishableKey();

  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      afterSignOutUrl={authPaths.afterSignOut}
      publishableKey={publishableKey}
      signInFallbackRedirectUrl={authPaths.afterSignIn}
      signInUrl={authPaths.signIn}
      signUpFallbackRedirectUrl={authPaths.afterSignUp}
    >
      {children}
    </ClerkProvider>
  );
}
