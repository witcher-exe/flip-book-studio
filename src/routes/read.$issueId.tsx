import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { FlipBookViewer } from "@/components/reader/FlipBookViewer";
import { issueQueryOptions } from "@/lib/magazine.queries";

export const Route = createFileRoute("/read/$issueId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(issueQueryOptions(params.issueId));
    if (!data) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Homeopathy Bangladesh — Digital Flip-Book Magazine" },
      {
        name: "description",
        content:
          "Turn the pages of Homeopathy Bangladesh in an interactive flip-book reader: swipe, search, and explore multimedia features.",
      },
      { property: "og:title", content: "Homeopathy Bangladesh" },
      {
        property: "og:description",
        content: "Explore Homeopathy Bangladesh page by page with audio, video, and gallery overlays.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReaderPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="flex min-h-screen items-center justify-center p-8 text-center">
      <p className="font-sans text-sm text-muted-foreground">
        This issue could not be opened. {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <p className="font-sans text-sm text-muted-foreground">That issue does not exist.</p>
    </div>
  ),
  pendingComponent: () => <div className="min-h-screen bg-background" />,
});

function ReaderPage() {
  const { issueId } = Route.useParams();
  const { data } = useSuspenseQuery(issueQueryOptions(issueId));
  if (!data) return null;
  return <FlipBookViewer issue={data.issue} pages={data.pages} />;
}
