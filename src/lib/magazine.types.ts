export interface PageRefDTO {
  id: string;
  anchorText: string;
  targetPageNumber: number;
}

export interface PageDTO {
  id: string;
  pageNumber: number;
  title: string;
  section: string;
  contentHtml: string;
  backgroundImageUrl: string | null;
  thumbnailUrl: string | null;
  refs: PageRefDTO[];
}

export interface IssueDTO {
  id: string;
  title: string;
  coverImageUrl: string | null;
}

export interface IssueWithPagesDTO {
  issue: IssueDTO;
  pages: PageDTO[];
}

export interface SearchHitDTO {
  pageNumber: number;
  title: string;
  section: string;
  snippet: string;
}
