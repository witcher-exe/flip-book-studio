import { queryOptions } from "@tanstack/react-query";

import { getPageArtManifest } from "./page-art.functions";

export const PAGE_ART_MANIFEST_QUERY_KEY = ["page-art-manifest"] as const;

export const pageArtManifestQueryOptions = () =>
  queryOptions({
    queryKey: PAGE_ART_MANIFEST_QUERY_KEY,
    queryFn: () => getPageArtManifest(),
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
