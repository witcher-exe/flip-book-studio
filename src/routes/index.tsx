import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { FlipBookViewer } from "@/components/reader/FlipBookViewer";
import { getFirstIssueId } from "@/lib/magazine.functions";
import { issueQueryOptions } from "@/lib/magazine.queries";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const { issueId } = await getFirstIssueId();
    if (issueId) {
      await context.queryClient.ensureQueryData(issueQueryOptions(issueId));
    }
    return { issueId };
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
  pendingComponent: () => <div className="min-h-screen bg-background" />,
});

function Index() {
  const { issueId } = Route.useLoaderData();
  if (!issueId) return <NoIssues />;
  return <Reader issueId={issueId} />;
}

function Reader({ issueId }: { issueId: string }) {
  const { data } = useSuspenseQuery(issueQueryOptions(issueId));
  if (!data) return null;
  return <FlipBookViewer issue={data.issue} pages={data.pages} />;
}

function NoIssues() {
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
