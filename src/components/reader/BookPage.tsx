import { forwardRef, memo, type ReactNode } from "react";

import { sanitizeHtml } from "@/lib/sanitize-html";
import type { PageDTO } from "@/lib/magazine.types";
import coverArt from "@/assets/cover.webp";
import page1Art from "@/assets/page1.webp";
import page2Art from "@/assets/page2.webp";
import prefaceArt from "@/assets/preface-pg.webp";
import presidentArt from "@/assets/president-ziaur-rahman-s-pg.webp";
import govHealthArt from "@/assets/government-health-policy-homeopathy-front-pg.webp";
import organonArt from "@/assets/organon-magazine.webp";
import page8Art from "@/assets/page8.webp";
import kidsHealth1Art from "@/assets/kids-health-front-pg.webp";
import kidsHealth2Art from "@/assets/kids-health-second-pg.webp";
import page11Art from "@/assets/page11.webp";
import womanHealth1Art from "@/assets/woman-health-front-pg.webp";
import womanHealth2Art from "@/assets/woman-health-second-pg.webp";
import technologyArt from "@/assets/technology-homeo-pg.webp";
import exerciseArt from "@/assets/exercise-page.webp";
import adSoftwareArt from "@/assets/ad-page-homeo-software-coming-sooner-pg.webp";
import page20Art from "@/assets/page20.webp";
import page30Art from "@/assets/page30.webp";
import page32Art from "@/assets/page32.webp";
import page33Art from "@/assets/page33.webp";
import page34Art from "@/assets/page34.webp";
import backCoverArt from "@/assets/back_cover.webp";
import {
  CoverPageButtons,
  Page11Overlay,
  Page20AudioOverlay,
} from "./InteractiveOverlays";

const PAGE_ART_MAP: Record<number, string> = {
  1: coverArt,
  2: page1Art,
  3: page2Art,
  4: prefaceArt,
  5: presidentArt,
  6: govHealthArt,
  7: organonArt,
  8: page8Art,
  9: kidsHealth1Art,
  10: kidsHealth2Art,
  11: page11Art,
  12: womanHealth1Art,
  13: womanHealth2Art,
  14: technologyArt,
  15: exerciseArt,
  16: adSoftwareArt,
  20: page20Art,
  30: page30Art,
  32: page32Art,
  33: page33Art,
  34: page34Art,
};

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
  onJump: (pageNumber: number) => void;
}

const BookPageInner = forwardRef<HTMLDivElement, BookPageProps>(function BookPage(
  { page, totalPages, issueTitle, detail, isCover, onJump },
  ref,
) {
  const background = page.backgroundImageUrl;

  if (detail === "light") {
    return (
      <div className="book-page book-page--light" ref={ref} data-density={isCover ? "hard" : "soft"}>
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
  const isBackCover = isCover && page.pageNumber === totalPages;
  const pageArt = isBackCover ? backCoverArt : PAGE_ART_MAP[page.pageNumber];

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
          <img className="book-page__bg" src={background} alt="" aria-hidden="true" loading="lazy" />
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
