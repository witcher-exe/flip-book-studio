import { createFileRoute } from "@tanstack/react-router";

import { AdminAuth } from "@/components/admin/AdminAuth";
import { AdminPortal } from "@/components/admin/AdminPortal";
import { Toaster } from "@/components/ui/sonner";
import { useAdminSession } from "@/hooks/use-admin-session";

export const Route = createFileRoute("/admin-r")({
  head: () => ({
    meta: [
      { title: "Admin — Homeopathy Bangladesh Flip-Book" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const { session, hydrated, signInWithCredential, signOut, devSignIn } = useAdminSession();

  return (
    <>
      {!hydrated ? (
        <div className="min-h-screen bg-background" />
      ) : session ? (
        <AdminPortal session={session} onSignOut={signOut} />
      ) : (
        <AdminAuth onCredential={signInWithCredential} onDevSignIn={devSignIn} />
      )}
      <Toaster position="top-center" />
    </>
  );
}
