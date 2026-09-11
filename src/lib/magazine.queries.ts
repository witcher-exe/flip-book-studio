import { queryOptions } from "@tanstack/react-query";

import { getIssueWithPages, searchIssuePages } from "./magazine.functions";

export const issueQueryOptions = (issueId: string) =>
  queryOptions({
    queryKey: ["issue", issueId],
    queryFn: () => getIssueWithPages({ data: { issueId } }),
    staleTime: 5 * 60_000,
  });

export const pageSearchQueryOptions = (issueId: string, query: string) =>
  queryOptions({
    queryKey: ["issue-search", issueId, query],
    queryFn: () => searchIssuePages({ data: { issueId, query } }),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
