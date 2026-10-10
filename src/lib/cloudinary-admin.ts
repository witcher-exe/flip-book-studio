import { CLOUDINARY_CLOUD_NAME } from "@/config/cloudinary";
import { signAdminUpload } from "./admin.functions";

const IMAGE_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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
  return new Error("Cloudinary rejected the upload. Please try again.");
}

/**
 * Uploads page artwork directly to Cloudinary. The API secret never reaches the
 * browser — a server function verifies the admin and returns a short-lived
 * signature for a single, server-chosen public id.
 */
export function uploadPageImage(
  file: File,
  idToken: string,
  page: number,
  onProgress?: (fraction: number) => void,
): Promise<UploadedArtwork> {
  return new Promise((resolve, reject) => {
    void (async () => {
      let signed: Awaited<ReturnType<typeof signAdminUpload>>;
      try {
        signed = await signAdminUpload({ data: { idToken, page } });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Could not start the upload."));
        return;
      }

      const form = new FormData();
      form.append("file", file);
      form.append("public_id", signed.publicId);
      form.append("timestamp", String(signed.timestamp));
      form.append("api_key", signed.apiKey);
      form.append("signature", signed.signature);

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
    })();
  });
}
