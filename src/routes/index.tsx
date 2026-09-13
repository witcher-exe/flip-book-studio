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
      { title: "Homeopathy Bangladesh — Digital Flip-Book Magazine" },
      {
        name: "description",
        content:
          "Homeopathy Bangladesh — Because Bangladesh First. An interactive digital flip-book magazine.",
      },
      { property: "og:title", content: "Homeopathy Bangladesh" },
      {
        property: "og:description",
        content: "Turn the pages of Homeopathy Bangladesh.",
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
