import { useCallback, useEffect, useState } from "react";

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

  return { session, hydrated, signInWithCredential, signOut };
}
