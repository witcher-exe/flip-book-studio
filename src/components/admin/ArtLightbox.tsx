import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface LightboxArt {
  pageNumber: number;
  label: string;
  src: string;
}

export function ArtLightbox({ art, onClose }: { art: LightboxArt | null; onClose: () => void }) {
  return (
    <Dialog
      open={Boolean(art)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-screen w-screen max-w-none items-center justify-center border-0 bg-black/95 p-0 text-white sm:rounded-none [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:p-2 [&>button]:opacity-100 [&>button]:hover:bg-white/20 [&>button>svg]:h-6 [&>button>svg]:w-6">
        <DialogTitle className="sr-only">{art?.label ?? "Artwork preview"}</DialogTitle>
        {art ? (
          <img
            src={art.src}
            alt={art.label}
            draggable={false}
            className="max-h-[94vh] max-w-[96vw] select-none object-contain"
          />
        ) : null}
        {art ? (
          <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/80">
            {art.label}
          </span>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
