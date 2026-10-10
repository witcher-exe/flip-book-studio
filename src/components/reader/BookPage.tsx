import { forwardRef, memo, type ReactNode } from "react";

import { sanitizeHtml } from "@/lib/sanitize-html";
import type { PageDTO } from "@/lib/magazine.types";
import { PAGE_ART_MAP } from "@/config/cloudinary";
import { resolvePageArt, type ArtManifest } from "@/lib/page-art";
import { CoverPageButtons, Page11Overlay, Page20AudioOverlay } from "./InteractiveOverlays";

export { PAGE_ART_MAP };

function XrefButton({
  anchorText,
  targetPageNumber,
  onJump,
}: {
  anchorText: string;
  targetPageNumber: number;
  onJump: (pageNumber: number) => void;
}) {
  return (
    <button type="button" className="page-xref" onClick={() => onJump(targetPageNumber)}>
      {anchorText}
      <span aria-hidden="true"> →</span>
      <span className="sr-only"> (go to page {targetPageNumber})</span>
    </button>
  );
}

function renderContentWithRefs(
  html: string,
  refs: PageDTO["refs"],
  onJump: (pageNumber: number) => void,
): ReactNode[] {
  let segments: ReactNode[] = [sanitizeHtml(html)];
  const unmatched: PageDTO["refs"] = [];

  refs.forEach((ref) => {
    const next: ReactNode[] = [];
    let matched = false;
    segments.forEach((segment, si) => {
      if (typeof segment !== "string" || !segment.includes(ref.anchorText)) {
        next.push(segment);
        return;
      }
      matched = true;
      const parts = segment.split(ref.anchorText);
      parts.forEach((part, pi) => {
        if (part) next.push(part);
        if (pi < parts.length - 1) {
          next.push(
            <XrefButton
              key={`${ref.id}-${si}-${pi}`}
              anchorText={ref.anchorText}
              targetPageNumber={ref.targetPageNumber}
              onJump={onJump}
            />,
          );
        }
      });
    });
    if (!matched) unmatched.push(ref);
    segments = next;
  });

  const nodes = segments.map((segment, i) =>
    typeof segment === "string" ? (
      <span key={`html-${i}`} dangerouslySetInnerHTML={{ __html: segment }} />
    ) : (
      segment
    ),
  );

  if (unmatched.length > 0) {
    nodes.push(
      <p key="see-also" className="book-page__see-also">
        See also:{" "}
        {unmatched.map((ref, i) => (
          <span key={ref.id}>
            {i > 0 ? ", " : ""}
            <XrefButton
              anchorText={ref.anchorText}
              targetPageNumber={ref.targetPageNumber}
              onJump={onJump}
            />
          </span>
        ))}
      </p>,
    );
  }

  return nodes;
}

export interface BookPageProps {
  page: PageDTO;
  totalPages: number;
  issueTitle: string;
  /** Full fidelity content, or an ultra-light placeholder while far off-screen / riffling. */
  detail: "full" | "light";
  isCover: boolean;
  /** Admin overrides (added / deleted artwork) layered over the static map. */
  artManifest?: ArtManifest | null;
  onJump: (pageNumber: number) => void;
}

const BookPageInner = forwardRef<HTMLDivElement, BookPageProps>(function BookPage(
  { page, totalPages, issueTitle, detail, isCover, artManifest, onJump },
  ref,
) {
  const background = page.backgroundImageUrl;

  if (detail === "light") {
    return (
      <div
        className="book-page book-page--light"
        ref={ref}
        data-density={isCover ? "hard" : "soft"}
      >
        <div className="book-page__surface book-page__surface--light">
          {page.thumbnailUrl ? (
            <img src={page.thumbnailUrl} alt="" aria-hidden="true" loading="lazy" />
          ) : null}
          <span className="book-page__ghost-number">{page.pageNumber}</span>
        </div>
      </div>
    );
  }

  const isFrontCover = isCover && page.pageNumber === 1;
  const pageArt = resolvePageArt(page.pageNumber, totalPages, artManifest);

  if (pageArt) {
    return (
      <div className="book-page" ref={ref} data-density={isCover ? "hard" : "soft"}>
        <article
          className="book-page__surface book-page__surface--cover-art"
          aria-label={`Page ${page.pageNumber} of ${totalPages}: ${page.title}`}
        >
          <img className="book-page__cover-art" src={pageArt} alt="" aria-hidden="true" />
          {isFrontCover && <CoverPageButtons />}
          {page.pageNumber === 11 && <Page11Overlay />}
          {page.pageNumber === 20 && <Page20AudioOverlay />}
          <span className="book-page__curl" aria-hidden="true" />
        </article>
      </div>
    );
  }
  return (
    <div className="book-page" ref={ref} data-density={isCover ? "hard" : "soft"}>
      <article
        className={`book-page__surface${isCover ? " book-page__surface--cover" : ""}`}
        aria-label={`Page ${page.pageNumber} of ${totalPages}: ${page.title}`}
      >
        {background ? (
          <img
            className="book-page__bg"
            src={background}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
        ) : null}

        <div className="book-page__body">
          {isCover ? (
            <>
              <p className="book-page__kicker">{page.section}</p>
              <h1 className="book-page__cover-title">{issueTitle}</h1>
              <div className="book-page__content">
                {renderContentWithRefs(page.contentHtml, page.refs, onJump)}
              </div>
            </>
          ) : (
            <>
              <p className="book-page__kicker">{page.section}</p>
              <h2 className="book-page__title">{page.title}</h2>
              <div className="book-page__content">
                {renderContentWithRefs(page.contentHtml, page.refs, onJump)}
              </div>
            </>
          )}
        </div>

        {!isCover ? <span className="book-page__folio">{page.pageNumber}</span> : null}
        <span className="book-page__curl" aria-hidden="true" />
      </article>
    </div>
  );
});

export const BookPage = memo(BookPageInner);
