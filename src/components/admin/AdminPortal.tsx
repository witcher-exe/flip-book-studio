import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  BACK_COVER_PUBLIC_ID,
  PAGE_PUBLIC_IDS,
  cloudinaryImage,
  cloudinaryThumbnail,
  publicIdForPage,
} from "@/config/cloudinary";
import { COVER_PAGES, GRID_PAGES, TOTAL_PAGES } from "@/config/admin";
import { saveArtManifest, uploadPageImage } from "@/lib/cloudinary-admin";
import {
  EMPTY_ART_MANIFEST,
  isPageDeleted,
  manifestPublicId,
  withManifestEntry,
  type ArtManifest,
} from "@/lib/page-art";
import { PAGE_ART_MANIFEST_QUERY_KEY, pageArtManifestQueryOptions } from "@/lib/page-art.queries";
import type { AdminSession } from "@/lib/admin-session";
import { ArtLightbox, type LightboxArt } from "./ArtLightbox";
import { PageTile } from "./PageTile";

interface AdminPortalProps {
  session: AdminSession;
  onSignOut: () => void;
}

function coverLabel(pageNumber: number): string {
  if (pageNumber === 1) return "Front Cover";
  if (pageNumber === TOTAL_PAGES) return "Back Cover";
  return `Page ${pageNumber}`;
}

export function AdminPortal({ session, onSignOut }: AdminPortalProps) {
  const queryClient = useQueryClient();
  const { data, isFetching, refetch } = useQuery(pageArtManifestQueryOptions());
  const manifest = data ?? EMPTY_ART_MANIFEST;
  const [versions, setVersions] = useState<Record<number, number>>({});
  const [lightbox, setLightbox] = useState<LightboxArt | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const deriveArt = useCallback(
    (pageNumber: number) => {
      const staticId =
        pageNumber === TOTAL_PAGES ? BACK_COVER_PUBLIC_ID : PAGE_PUBLIC_IDS[pageNumber];
      const deleted = isPageDeleted(manifest, pageNumber);
      const override = manifestPublicId(manifest, pageNumber);
      const effectiveId = deleted ? undefined : (override ?? staticId);
      const version = versions[pageNumber];
      return {
        thumbSrc: effectiveId ? cloudinaryThumbnail(effectiveId, version) : null,
        fullSrc: effectiveId ? cloudinaryImage(effectiveId, version) : null,
      };
    },
    [manifest, versions],
  );

  const commitManifest = useCallback(
    async (next: ArtManifest) => {
      await saveArtManifest(next);
      queryClient.setQueryData(PAGE_ART_MANIFEST_QUERY_KEY, next);
    },
    [queryClient],
  );

  const replaceArt = useCallback(
    async (pageNumber: number, file: File, onProgress: (fraction: number) => void) => {
      try {
        const publicId = publicIdForPage(pageNumber, TOTAL_PAGES);
        const uploaded = await uploadPageImage(file, publicId, onProgress);
        setVersions((prev) => ({ ...prev, [pageNumber]: uploaded.version }));

        const current =
          queryClient.getQueryData<ArtManifest>(PAGE_ART_MANIFEST_QUERY_KEY) ?? EMPTY_ART_MANIFEST;
        const staticId =
          pageNumber === TOTAL_PAGES ? BACK_COVER_PUBLIC_ID : PAGE_PUBLIC_IDS[pageNumber];
        const next = staticId
          ? withManifestEntry(current, pageNumber, undefined)
          : withManifestEntry(current, pageNumber, uploaded.publicId);

        if (JSON.stringify(next.entries) !== JSON.stringify(current.entries)) {
          await commitManifest(next);
        }
        toast.success(`${coverLabel(pageNumber)} artwork uploaded`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
      }
    },
    [commitManifest, queryClient],
  );

  const deleteArt = useCallback(
    async (pageNumber: number) => {
      try {
        const current =
          queryClient.getQueryData<ArtManifest>(PAGE_ART_MANIFEST_QUERY_KEY) ?? EMPTY_ART_MANIFEST;
        const next = withManifestEntry(current, pageNumber, null);
        await commitManifest(next);
        toast.success(`${coverLabel(pageNumber)} artwork removed`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed. Please try again.");
      }
    },
    [commitManifest, queryClient],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success("Artwork list refreshed");
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const openLightbox = useCallback(
    (pageNumber: number) => {
      const { fullSrc } = deriveArt(pageNumber);
      if (!fullSrc) return;
      setLightbox({ pageNumber, label: coverLabel(pageNumber), src: fullSrc });
    },
    [deriveArt],
  );

  const coverTiles = useMemo(
    () =>
      COVER_PAGES.map((pageNumber) => {
        const { thumbSrc } = deriveArt(pageNumber);
        return (
          <div key={pageNumber} className="w-40 sm:w-48">
            <p className="mb-1.5 text-center text-xs font-medium text-muted-foreground">
              {coverLabel(pageNumber)} · Page {pageNumber}
            </p>
            <PageTile
              pageNumber={pageNumber}
              label={coverLabel(pageNumber)}
              thumbSrc={thumbSrc}
              large
              onReplace={replaceArt}
              onDelete={deleteArt}
              onOpen={openLightbox}
            />
          </div>
        );
      }),
    [deriveArt, deleteArt, openLightbox, replaceArt],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-lg font-semibold text-foreground">
                Flip-Book Admin
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {isFetching && !refreshing ? "Syncing artwork…" : "Artwork manager"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hidden sm:inline-flex"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3">
              {session.picture ? (
                <img
                  src={session.picture}
                  alt={session.name}
                  className="h-7 w-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {session.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                {session.email}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-6">
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          Replace re-uploads over the existing Cloudinary asset (same public id) so the live book
          updates instantly. Delete hides the artwork and falls back to the page's text layout.
        </p>

        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-foreground">Covers</h2>
          <div className="flex flex-wrap justify-start gap-5">{coverTiles}</div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-foreground">
              Pages 2–{TOTAL_PAGES - 1}
            </h2>
            <span className="text-xs text-muted-foreground">{GRID_PAGES.length} pages</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-16">
            {GRID_PAGES.map((pageNumber) => {
              const { thumbSrc } = deriveArt(pageNumber);
              return (
                <PageTile
                  key={pageNumber}
                  pageNumber={pageNumber}
                  label={coverLabel(pageNumber)}
                  thumbSrc={thumbSrc}
                  onReplace={replaceArt}
                  onDelete={deleteArt}
                  onOpen={openLightbox}
                />
              );
            })}
          </div>
        </section>
      </main>

      <ArtLightbox art={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
