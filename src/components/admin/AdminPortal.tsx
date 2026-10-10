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
} from "@/config/cloudinary";
import { COVER_PAGES, GRID_PAGES, TOTAL_PAGES } from "@/config/admin";
import { uploadPageImage } from "@/lib/cloudinary-admin";
import { archiveAdminAsset, restoreAdminAsset, saveAdminManifest } from "@/lib/admin.functions";
import {
  EMPTY_ART_MANIFEST,
  getEntry,
  getHistory,
  makeEntry,
  setPageEntry,
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

function staticPublicId(pageNumber: number): string | undefined {
  return pageNumber === TOTAL_PAGES ? BACK_COVER_PUBLIC_ID : PAGE_PUBLIC_IDS[pageNumber];
}

function isWebpFile(file: File): boolean {
  return file.type === "image/webp" || /\.webp$/i.test(file.name);
}

export function AdminPortal({ session, onSignOut }: AdminPortalProps) {
  const queryClient = useQueryClient();
  const { data, isFetching, refetch } = useQuery(pageArtManifestQueryOptions());
  const manifest = data ?? EMPTY_ART_MANIFEST;
  const idToken = session.credential;
  const [lightboxPage, setLightboxPage] = useState<number | null>(null);
  const [busyPage, setBusyPage] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const deriveArt = useCallback(
    (pageNumber: number) => {
      const entry = getEntry(manifest, pageNumber);
      const currentId = entry ? entry.current : (staticPublicId(pageNumber) ?? null);
      return {
        currentId,
        thumbSrc: currentId ? cloudinaryThumbnail(currentId) : null,
        fullSrc: currentId ? cloudinaryImage(currentId) : null,
      };
    },
    [manifest],
  );

  const persist = useCallback(
    async (next: ArtManifest) => {
      const saved = await saveAdminManifest({ data: { idToken, manifest: next } });
      queryClient.setQueryData(PAGE_ART_MANIFEST_QUERY_KEY, saved);
    },
    [idToken, queryClient],
  );

  const readCurrent = useCallback(
    () => queryClient.getQueryData<ArtManifest>(PAGE_ART_MANIFEST_QUERY_KEY) ?? EMPTY_ART_MANIFEST,
    [queryClient],
  );

  const archiveOld = useCallback(
    async (pageNumber: number, publicId: string): Promise<string> => {
      try {
        const { archivedId } = await archiveAdminAsset({
          data: { idToken, page: pageNumber, publicId },
        });
        return archivedId;
      } catch {
        // Keep the original id in history if archiving failed — nothing is lost.
        return publicId;
      }
    },
    [idToken],
  );

  const replaceArt = useCallback(
    async (pageNumber: number, file: File, onProgress: (fraction: number) => void) => {
      if (!isWebpFile(file)) {
        toast.error("Only .webp images are allowed. Please convert the image and try again.");
        return;
      }
      setBusyPage(pageNumber);
      try {
        const current = readCurrent();
        const entry = getEntry(current, pageNumber);
        const oldId = entry ? entry.current : (staticPublicId(pageNumber) ?? null);

        const uploaded = await uploadPageImage(file, idToken, pageNumber, onProgress);
        const archivedId = oldId ? await archiveOld(pageNumber, oldId) : null;
        const history = [
          ...(archivedId ? [archivedId] : []),
          ...getHistory(current, pageNumber).filter((id) => id !== oldId && id !== archivedId),
        ];
        await persist(setPageEntry(current, pageNumber, makeEntry(uploaded.publicId, history)));
        toast.success(`${coverLabel(pageNumber)} artwork uploaded`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setBusyPage(null);
      }
    },
    [archiveOld, idToken, persist, readCurrent],
  );

  const deleteArt = useCallback(
    async (pageNumber: number) => {
      setBusyPage(pageNumber);
      try {
        const current = readCurrent();
        const entry = getEntry(current, pageNumber);
        const oldId = entry ? entry.current : (staticPublicId(pageNumber) ?? null);

        const archivedId = oldId ? await archiveOld(pageNumber, oldId) : null;
        const history = [
          ...(archivedId ? [archivedId] : []),
          ...getHistory(current, pageNumber).filter((id) => id !== oldId && id !== archivedId),
        ];
        await persist(setPageEntry(current, pageNumber, makeEntry(null, history)));
        toast.success(`${coverLabel(pageNumber)} artwork removed (archived in Cloudinary)`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed. Please try again.");
      } finally {
        setBusyPage(null);
      }
    },
    [archiveOld, persist, readCurrent],
  );

  const restoreArt = useCallback(
    async (pageNumber: number, archivedId: string) => {
      setBusyPage(pageNumber);
      try {
        const current = readCurrent();
        const entry = getEntry(current, pageNumber);
        const oldId = entry?.current ?? null;

        const restored = await restoreAdminAsset({
          data: { idToken, page: pageNumber, archivedId },
        });
        const archivedOld = oldId ? await archiveOld(pageNumber, oldId) : null;
        const history = [
          ...(archivedOld ? [archivedOld] : []),
          ...getHistory(current, pageNumber).filter(
            (id) => id !== archivedId && id !== oldId && id !== archivedOld,
          ),
        ];
        await persist(setPageEntry(current, pageNumber, makeEntry(restored.publicId, history)));
        toast.success(`${coverLabel(pageNumber)} restored a previous version`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Restore failed. Please try again.");
      } finally {
        setBusyPage(null);
      }
    },
    [archiveOld, idToken, persist, readCurrent],
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

  const openLightbox = useCallback((pageNumber: number) => setLightboxPage(pageNumber), []);

  const lightbox = useMemo<LightboxArt | null>(() => {
    if (lightboxPage === null) return null;
    const { fullSrc } = deriveArt(lightboxPage);
    const history = getHistory(manifest, lightboxPage).map((id) => ({
      id,
      src: cloudinaryImage(id),
    }));
    return {
      pageNumber: lightboxPage,
      label: coverLabel(lightboxPage),
      currentSrc: fullSrc,
      history,
    };
  }, [deriveArt, lightboxPage, manifest]);

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
              busy={busyPage === pageNumber}
              onReplace={replaceArt}
              onDelete={deleteArt}
              onOpen={openLightbox}
            />
          </div>
        );
      }),
    [busyPage, deriveArt, deleteArt, openLightbox, replaceArt],
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
          Replace uploads a new image and moves the previous one into the Cloudinary{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">past-images/</code> folder.
          Delete hides the artwork and archives it there too — nothing is ever deleted from
          Cloudinary. Click any tile to preview it and restore an earlier version.{" "}
          <strong>Only .webp images are accepted.</strong>
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
                  busy={busyPage === pageNumber}
                  onReplace={replaceArt}
                  onDelete={deleteArt}
                  onOpen={openLightbox}
                />
              );
            })}
          </div>
        </section>
      </main>

      <ArtLightbox
        art={lightbox}
        busy={busyPage !== null}
        onClose={() => setLightboxPage(null)}
        onRestore={restoreArt}
      />
    </div>
  );
}
