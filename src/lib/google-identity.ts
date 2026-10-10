interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleButtonOptions {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
  logo_alignment?: "left" | "center";
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  prompt(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let loader: Promise<void> | null = null;

/** Lazily injects the Google Identity Services script. */
export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });

  return loader;
}

export interface InitializeGoogleOptions {
  clientId: string;
  onCredential: (credential: string) => void;
}

/** Initialises Google Sign-In once the GIS script has loaded. */
export async function initializeGoogleSignIn({
  clientId,
  onCredential,
}: InitializeGoogleOptions): Promise<void> {
  await loadGoogleIdentity();
  window.google?.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response?.credential) onCredential(response.credential);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

/** Renders Google's official "Sign in with Google" button into a container. */
export function renderGoogleButton(
  container: HTMLElement,
  options: GoogleButtonOptions = {},
): void {
  window.google?.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: 280,
    ...options,
  });
}

export function googleSignOut(): void {
  window.google?.accounts.id.disableAutoSelect();
}

export type { GoogleButtonOptions };
