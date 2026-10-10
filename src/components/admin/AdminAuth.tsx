import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { GOOGLE_CLIENT_ID, isAdminConfigured } from "@/config/admin";
import { isAllowlistEnforced } from "@/lib/admin-session";
import { initializeGoogleSignIn, renderGoogleButton } from "@/lib/google-identity";
import type { SignInResult } from "@/hooks/use-admin-session";

interface AdminAuthProps {
  onCredential: (credential: string) => SignInResult;
}

function SetupNotice() {
  return (
    <div className="mx-auto w-full max-w-xl rounded-xl border border-border bg-card p-6 text-left shadow-sm">
      <div className="flex items-center gap-2 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="font-display text-lg font-semibold">Admin portal not configured yet</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Add your Google OAuth Client ID and beta-tester emails in{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          src/config/admin.ts
        </code>{" "}
        to enable sign-in.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          In Google Cloud Console, create an <strong>OAuth client ID</strong> (Web application).
        </li>
        <li>
          Add your admin origins (e.g.{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            http://localhost:5173
          </code>{" "}
          and your live domain) under <strong>Authorized JavaScript origins</strong>.
        </li>
        <li>
          Add each beta tester Gmail as a <strong>Test user</strong> on the OAuth consent screen.
        </li>
        <li>
          In Cloudinary, copy the <strong>API key</strong> and <strong>API secret</strong>, then add
          them as environment variables named{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            CLOUDINARY_API_KEY
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            CLOUDINARY_API_SECRET
          </code>{" "}
          (Cloudflare Pages settings, and a local{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code> for dev).
        </li>
      </ol>
    </div>
  );
}

export function AdminAuth({ onCredential }: AdminAuthProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isAdminConfigured();

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    (async () => {
      try {
        await initializeGoogleSignIn({
          clientId: GOOGLE_CLIENT_ID,
          onCredential: (credential) => {
            const result = onCredential(credential);
            if (!result.ok) setError(result.reason ?? "Sign-in failed. Please try again.");
          },
        });
        if (!cancelled && buttonRef.current) {
          buttonRef.current.innerHTML = "";
          renderGoogleButton(buttonRef.current);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Google sign-in.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, onCredential]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
          Flip-Book Admin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with an approved beta-tester Google account to manage page artwork.
        </p>
      </div>

      {configured ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div ref={buttonRef} className="flex min-h-[44px] justify-center" />
          {error ? (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            {isAllowlistEnforced()
              ? "Only allowlisted Gmail accounts can enter."
              : "Access is limited to the beta testers added in Google Cloud Console."}
          </p>
        </div>
      ) : (
        <SetupNotice />
      )}
    </div>
  );
}
