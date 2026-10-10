import { useCallback, useEffect, useState } from "react";

import { ADMIN_ALLOWLIST_EMAILS } from "@/config/admin";
import {
  clearAdminSession,
  readAdminSession,
  validateCredential,
  writeAdminSession,
  type AdminSession,
} from "@/lib/admin-session";
import { googleSignOut } from "@/lib/google-identity";

export interface SignInResult {
  ok: boolean;
  reason?: string;
}

export interface UseAdminSession {
  session: AdminSession | null;
  hydrated: boolean;
  signInWithCredential: (credential: string) => SignInResult;
  signOut: () => void;
  /** Dev-only shortcut so the portal can be previewed without Google setup. */
  devSignIn: () => void;
}

export function useAdminSession(): UseAdminSession {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(readAdminSession());
    setHydrated(true);
  }, []);

  const signInWithCredential = useCallback((credential: string): SignInResult => {
    const result = validateCredential(credential);
    if (!result.ok) return { ok: false, reason: result.reason };
    writeAdminSession(result.session);
    setSession(result.session);
    return { ok: true };
  }, []);

  const signOut = useCallback(() => {
    clearAdminSession();
    googleSignOut();
    setSession(null);
  }, []);

  const devSignIn = useCallback(() => {
    const email = ADMIN_ALLOWLIST_EMAILS[0] ?? "dev.admin@gmail.com";
    const fake: AdminSession = {
      email,
      name: "Dev Admin",
      picture: null,
      sub: "dev",
      credential: "dev",
      signedInAt: Date.now(),
    };
    setSession(fake);
  }, []);

  return { session, hydrated, signInWithCredential, signOut, devSignIn };
}
