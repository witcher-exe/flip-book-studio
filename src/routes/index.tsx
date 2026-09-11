import { createFileRoute, redirect } from "@tanstack/react-router";

import { getFirstIssueId } from "@/lib/magazine.functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { issueId } = await getFirstIssueId();
    if (issueId) throw redirect({ to: "/read/$issueId", params: { issueId } });
    return null;
  },
  head: () => ({
    meta: [
      { title: "The Long Form — a digital flip-book magazine" },
      {
        name: "description",
        content:
          "An independent quarterly you actually turn the pages of. Swipe, riffle between distant pages, and search inside every article.",
      },
      { property: "og:title", content: "The Long Form — a digital flip-book magazine" },
      {
        property: "og:description",
        content: "An independent quarterly you actually turn the pages of.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="font-display text-2xl text-foreground">No issues published yet</h1>
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          Add an issue to the library and the reader will open it here.
        </p>
      </div>
    </div>
  );
}
