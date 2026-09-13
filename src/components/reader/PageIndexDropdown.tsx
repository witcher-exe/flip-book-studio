import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { pageSearchQueryOptions } from "@/lib/magazine.queries";
import type { PageDTO } from "@/lib/magazine.types";
import { cn } from "@/lib/utils";

interface Props {
  issueId: string;
  pages: PageDTO[];
  currentPage: number;
  onSelect: (pageNumber: number) => void;
  className?: string;
}

function groupBySection(pages: PageDTO[]) {
  const map = new Map<string, PageDTO[]>();
  pages.forEach((page) => {
    const list = map.get(page.section) ?? [];
    list.push(page);
    map.set(page.section, list);
  });
  return [...map.entries()];
}

function PanelBody({ issueId, pages, currentPage, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  const { data: contentHits = [] } = useQuery(pageSearchQueryOptions(issueId, trimmed));

  const localMatches = pages.filter(
    (page) =>
      !lower ||
      String(page.pageNumber) === lower ||
      String(page.pageNumber).startsWith(lower) ||
      page.title.toLowerCase().includes(lower) ||
      page.section.toLowerCase().includes(lower),
  );

  const localNumbers = new Set(localMatches.map((p) => p.pageNumber));
  const contentOnly = contentHits.filter((hit) => !localNumbers.has(hit.pageNumber));

  return (
    <Command shouldFilter={false} className="bg-transparent flex flex-col h-full">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search pages, sections, or words inside articles…"
        className="font-sans shrink-0"
      />

      <div
        data-vaul-no-drag
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <CommandList
          data-vaul-no-drag
          className="max-h-none overflow-visible touch-pan-y"
        >
          <CommandEmpty>No pages matched.</CommandEmpty>

          {groupBySection(localMatches).map(([section, sectionPages]) => (
            <CommandGroup key={section} heading={section}>
              {sectionPages.map((page) => (
                <CommandItem
                  key={page.id}
                  value={`page-${page.pageNumber}`}
                  onSelect={() => onSelect(page.pageNumber)}
                  className="gap-3"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border font-sans text-xs ${
                      page.pageNumber === currentPage ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {page.thumbnailUrl ? (
                      <img src={page.thumbnailUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      page.pageNumber
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm">{page.title}</span>
                    <span className="block text-xs text-muted-foreground">Page {page.pageNumber}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {contentOnly.length > 0 ? (
            <CommandGroup heading="Found in page text">
              {contentOnly.map((hit) => (
                <CommandItem
                  key={`hit-${hit.pageNumber}`}
                  value={`hit-${hit.pageNumber}`}
                  onSelect={() => onSelect(hit.pageNumber)}
                  className="flex-col items-start gap-1"
                >
                  <span className="font-display text-sm">{hit.title}</span>
                  <span className="text-xs text-muted-foreground">Page {hit.pageNumber} · {hit.section}</span>
                  <span className="line-clamp-2 text-xs italic text-muted-foreground">{hit.snippet}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </div>
    </Command>
  );
}

export function PageIndexDropdown(props: Props) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelect = (pageNumber: number) => {
    setOpen(false);
    props.onSelect(pageNumber);
  };

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-2 font-sans", props.className)}
      aria-label="Open contents"
    >
      <LayoutGrid className="size-4" aria-hidden="true" />
      Contents
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="px-2 pb-4 max-h-[85vh] h-[85vh] flex flex-col">
          <DrawerTitle className="px-3 pt-2 font-display text-base shrink-0">Contents</DrawerTitle>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <PanelBody {...props} onSelect={handleSelect} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <PanelBody {...props} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
