import { useRef, useState, type ChangeEvent } from "react";
import { ChevronDown, ImageIcon, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface PageTileProps {
  pageNumber: number;
  label: string;
  thumbSrc: string | null;
  large?: boolean;
  onReplace: (
    pageNumber: number,
    file: File,
    onProgress: (fraction: number) => void,
  ) => Promise<void>;
  onDelete: (pageNumber: number) => Promise<void>;
  onOpen: (pageNumber: number) => void;
}

export function PageTile({
  pageNumber,
  label,
  thumbSrc,
  large = false,
  onReplace,
  onDelete,
  onOpen,
}: PageTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasArt = Boolean(thumbSrc);

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      await onReplace(pageNumber, file, setProgress);
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await onDelete(pageNumber);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`relative w-full aspect-[550/777] overflow-hidden rounded-md border bg-muted/40 ${
          hasArt ? "border-border" : "border-dashed border-border/70"
        }`}
      >
        {hasArt ? (
          <button
            type="button"
            onClick={() => !busy && onOpen(pageNumber)}
            className="group absolute inset-0 h-full w-full cursor-zoom-in"
            aria-label={`Enlarge ${label}`}
          >
            <img
              src={thumbSrc!}
              alt={label}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
            <ImageIcon className={large ? "h-8 w-8" : "h-5 w-5"} />
          </div>
        )}

        <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {pageNumber}
        </span>

        {busy ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-[10px] font-medium">{Math.round(progress * 100)}%</span>
          </div>
        ) : null}
      </div>

      {hasArt ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              className="h-6 w-full justify-between px-1.5 text-[10px] font-medium"
            >
              Edit
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onSelect={() => setTimeout(pickFile, 0)}>
              <RefreshCw className="h-4 w-4" />
              Replace
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setTimeout(() => setConfirmOpen(true), 0)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={pickFile}
          className="h-6 w-full px-1.5 text-[10px] font-medium"
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {label} artwork?</AlertDialogTitle>
            <AlertDialogDescription>
              The page will fall back to its text layout. The image is moved to the Cloudinary{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">past-images/</code>{" "}
              folder (never deleted), so you can restore it any time from the page preview.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
