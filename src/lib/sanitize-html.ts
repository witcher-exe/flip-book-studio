/**
 * Minimal allow-list sanitizer for editorial page markup.
 * Content is authored in the CMS, but we still strip anything executable.
 */
const BLOCK_TAG = /<\s*(script|style|iframe|object|embed|link|meta|form)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const SELF_CLOSING_BLOCK = /<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi;
const EVENT_ATTR = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi;

export function sanitizeHtml(html: string): string {
  return html
    .replace(BLOCK_TAG, "")
    .replace(SELF_CLOSING_BLOCK, "")
    .replace(EVENT_ATTR, "")
    .replace(JS_URL, "");
}

export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
