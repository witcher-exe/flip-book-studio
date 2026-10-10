import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { TOTAL_PAGES } from "@/config/admin";
import { normalizeManifest, type ArtManifest } from "./page-art";

const token = z.string().min(1).max(4096);
const page = z.number().int().min(1).max(TOTAL_PAGES);

const signUploadSchema = z.object({ idToken: token, page });
export type SignUploadInput = z.infer<typeof signUploadSchema>;

const archiveSchema = z.object({
  idToken: token,
  page,
  publicId: z.string().min(1).max(220),
});
export type ArchiveInput = z.infer<typeof archiveSchema>;

const restoreSchema = z.object({
  idToken: token,
  page,
  archivedId: z.string().min(1).max(220),
});
export type RestoreInput = z.infer<typeof restoreSchema>;

const entrySchema = z.object({
  current: z.string().max(220).nullable(),
  history: z.array(z.string().max(220)).max(30),
});

const saveManifestSchema = z.object({
  idToken: token,
  manifest: z.object({
    version: z.number().optional(),
    entries: z.record(entrySchema),
  }),
});
export type SaveManifestInput = z.infer<typeof saveManifestSchema>;

export interface SignedUpload {
  publicId: string;
  timestamp: number;
  apiKey: string;
  signature: string;
  cloudName: string;
}

/** Verifies the admin and returns the signature needed to upload an image. */
export const signAdminUpload = createServerFn({ method: "POST" })
  .validator((data: SignUploadInput) => signUploadSchema.parse(data))
  .handler(async ({ data }): Promise<SignedUpload> => {
    const server = await import("./admin-cloudinary.server");
    await server.verifyAdmin(data.idToken);
    const publicId = server.currentUploadPublicId(data.page);
    return server.signImageUpload(publicId);
  });

/** Moves a page's current artwork into the `past-images/` archive folder. */
export const archiveAdminAsset = createServerFn({ method: "POST" })
  .validator((data: ArchiveInput) => archiveSchema.parse(data))
  .handler(async ({ data }): Promise<{ archivedId: string }> => {
    const server = await import("./admin-cloudinary.server");
    await server.verifyAdmin(data.idToken);
    const archivedId = await server.archiveCurrentArtwork(data.page, data.publicId);
    return { archivedId };
  });

/** Restores an archived image back to the live book. */
export const restoreAdminAsset = createServerFn({ method: "POST" })
  .validator((data: RestoreInput) => restoreSchema.parse(data))
  .handler(async ({ data }): Promise<{ publicId: string }> => {
    const server = await import("./admin-cloudinary.server");
    await server.verifyAdmin(data.idToken);
    const publicId = await server.restoreArtwork(data.page, data.archivedId);
    return { publicId };
  });

/** Persists the page-art manifest (signed overwrite of the raw JSON asset). */
export const saveAdminManifest = createServerFn({ method: "POST" })
  .validator((data: SaveManifestInput) => saveManifestSchema.parse(data))
  .handler(async ({ data }): Promise<ArtManifest> => {
    const server = await import("./admin-cloudinary.server");
    await server.verifyAdmin(data.idToken);
    const manifest = normalizeManifest(data.manifest);
    await server.writeManifest(manifest);
    return manifest;
  });
