import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_FOLDER } from "@/config/cloudinary";
import {
  CLOUDINARY_UPLOAD_PRESET_IMAGES,
  CLOUDINARY_UPLOAD_PRESET_RAW,
  PAGE_ART_MANIFEST_PUBLIC_ID,
} from "@/config/admin";
import type { ArtManifest } from "./page-art";

const IMAGE_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const RAW_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;

export interface UploadedArtwork {
  publicId: string;
  version: number;
  secureUrl: string;
}

function cloudinaryError(body: string): Error {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) return new Error(parsed.error.message);
  } catch {
    /* fall through */
  }
  return new Error("Cloudinary rejected the upload. Check your unsigned preset setup.");
}

/**
 * Uploads (or replaces) a page artwork directly to Cloudinary using the signed
 * out unsigned preset. Passing the existing public_id with overwrite reuses the
 * same asset the reader already points at.
 */
export function uploadPageImage(
  file: File,
  publicId: string,
  onProgress?: (fraction: number) => void,
): Promise<UploadedArtwork> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET_IMAGES);
    form.append("public_id", publicId);
    form.append("overwrite", "true");
    if (CLOUDINARY_FOLDER) form.append("folder", CLOUDINARY_FOLDER);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", IMAGE_UPLOAD_URL);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            public_id: string;
            version: number;
            secure_url: string;
          };
          resolve({
            publicId: data.public_id,
            version: data.version,
            secureUrl: data.secure_url,
          });
        } catch {
          reject(new Error("Unexpected response from Cloudinary."));
        }
      } else {
        reject(cloudinaryError(xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading to Cloudinary."));
    xhr.send(form);
  });
}

/** Overwrites the raw JSON manifest on Cloudinary so the reader sees the change. */
export async function saveArtManifest(manifest: ArtManifest): Promise<void> {
  const body = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  const form = new FormData();
  form.append("file", body, PAGE_ART_MANIFEST_PUBLIC_ID);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET_RAW);
  form.append("public_id", PAGE_ART_MANIFEST_PUBLIC_ID);
  form.append("overwrite", "true");
  if (CLOUDINARY_FOLDER) form.append("folder", CLOUDINARY_FOLDER);

  const res = await fetch(RAW_UPLOAD_URL, { method: "POST", body: form });
  if (!res.ok) throw cloudinaryError(await res.text());
}
