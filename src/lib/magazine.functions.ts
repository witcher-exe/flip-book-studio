import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { IssueWithPagesDTO, PageDTO, SearchHitDTO } from "./magazine.types";
import magazineData from "@/data/magazine-data.json";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const getFirstIssueId = createServerFn({ method: "GET" }).handler(async () => {
  const sorted = [...magazineData.issues].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return { issueId: sorted[0]?.id ?? null };
});

export const getIssueWithPages = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ issueId: z.string() }).parse(input))
  .handler(async ({ data: input }): Promise<IssueWithPagesDTO | null> => {
    const issue = magazineData.issues.find((i) => i.id === input.issueId);
    if (!issue) return null;

    const pageRows = magazineData.pages
      .filter((p) => p.issue_id === input.issueId)
      .sort((a, b) => a.page_number - b.page_number);

    const numberById = new Map(pageRows.map((r) => [r.id, r.page_number]));

    const refRows = magazineData.page_references.filter((ref) =>
      pageRows.some((r) => r.id === ref.source_page_id),
    );

    const pages: PageDTO[] = pageRows.map((r) => ({
      id: r.id,
      pageNumber: r.page_number,
      title: r.title,
      section: r.section,
      contentHtml: r.content_html,
      backgroundImageUrl: r.background_image_url,
      thumbnailUrl: r.thumbnail_url,
      refs: refRows
        .filter((ref) => ref.source_page_id === r.id)
        .map((ref) => ({
          id: ref.id,
          anchorText: ref.anchor_text,
          targetPageNumber: numberById.get(ref.target_page_id) ?? 1,
        }))
        .filter((ref) => ref.targetPageNumber > 0),
    }));

    while (pages.length < 64) {
      const pageNum = pages.length + 1;
      pages.push({
        id: `dummy-page-${pageNum}`,
        pageNumber: pageNum,
        title: `Page ${pageNum}`,
        section: "Extended Content",
        contentHtml: `<p>This is placeholder content for page ${pageNum}.</p>`,
        backgroundImageUrl: null,
        thumbnailUrl: null,
        refs: [],
      });
    }

    return {
      issue: { id: issue.id, title: issue.title, coverImageUrl: issue.cover_image_url },
      pages,
    };
  });

export const searchIssuePages = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ issueId: z.string(), query: z.string() }).parse(input),
  )
  .handler(async ({ data: input }): Promise<SearchHitDTO[]> => {
    const term = input.query.trim().slice(0, 120);
    if (term.length < 2) return [];

    const needle = term.toLowerCase();
    const words = needle.split(/\s+/);

    const results: SearchHitDTO[] = [];

    for (const row of magazineData.pages) {
      if (row.issue_id !== input.issueId) continue;

      const text = stripHtml(row.content_html).toLowerCase();
      const title = row.title.toLowerCase();
      const section = row.section.toLowerCase();

      const matches = words.every(
        (w) => text.includes(w) || title.includes(w) || section.includes(w),
      );
      if (!matches) continue;

      const plainText = stripHtml(row.content_html);
      const firstWord = words[0] ?? "";
      const at = plainText.toLowerCase().indexOf(firstWord);
      const start = at > 60 ? at - 60 : 0;
      const snippet = (start > 0 ? "…" : "") + plainText.slice(start, start + 150) + "…";

      results.push({
        pageNumber: row.page_number,
        title: row.title,
        section: row.section,
        snippet,
      });

      if (results.length >= 25) break;
    }

    return results;
  });
