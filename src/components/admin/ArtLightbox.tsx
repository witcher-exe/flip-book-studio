import { History, ImageOff, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface PastVersion {
  id: string;
  src: string;
}

export interface LightboxArt {
  pageNumber: number;
  label: string;
  currentSrc: string | null;
  history: PastVersion[];
}

interface ArtLightboxProps {
  art: LightboxArt | null;
  busy: boolean;
  onClose: () => void;
  onRestore: (pageNumber: number, archivedId: string) => void;
}

export function ArtLightbox({ art, busy, onClose, onRestore }: ArtLightboxProps) {
  return (
    <Dialog
      open={Boolean(art)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-screen w-screen max-w-none flex-col items-center justify-center gap-4 border-0 bg-black/95 p-0 text-white sm:rounded-none [&>button]:right-5 [&>button]:top-5 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:p-2 [&>button]:opacity-100 [&>button]:hover:bg-white/20 [&>button>svg]:h-6 [&>button>svg]:w-6">
        <DialogTitle className="sr-only">{art?.label ?? "Artwork preview"}</DialogTitle>
        {art ? (
          <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/80">
            {art.label}
          </span>
        ) : null}

        <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-14">
          {art?.currentSrc ? (
            <img
              src={art.currentSrc}
              alt={art.label}
              draggable={false}
              className="max-h-[70vh] max-w-[96vw] select-none object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/45">
              <ImageOff className="h-10 w-10" />
              <p className="text-sm">No artwork — this page uses its text layout.</p>
            </div>
          )}
        </div>

        {art && art.history.length > 0 ? (
          <div className="w-full max-w-[96vw] shrink-0 px-4 pb-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/60">
              <History className="h-3.5 w-3.5" />
              Previous versions
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {art.history.map((version) => (
                <div key={version.id} className="group relative shrink-0">
                  <img
                    src={version.src}
                    alt="Past version"
                    draggable={false}
                    className="h-28 w-20 rounded-md border border-white/15 object-cover opacity-80 transition group-hover:opacity-100"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => onRestore(art.pageNumber, version.id)}
                    className="mt-1.5 h-6 w-20 px-1 text-[10px]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
