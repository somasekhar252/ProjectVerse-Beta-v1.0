import { Reel } from "../types";

/**
 * Returns canonical public URL for exact Reel deep link
 */
export function getPublicReelUrl(reelId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/reels?reel=${reelId}`;
}

/**
 * Copies the exact Reel public link to clipboard
 */
export async function copyReelLink(reelId: string): Promise<boolean> {
  const url = getPublicReelUrl(reelId);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    } else {
      // Fallback for non-HTTPS or legacy browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    }
  } catch (err) {
    console.warn("copyReelLink error:", err);
    return false;
  }
}

/**
 * Opens WhatsApp web intent with Reel title, optional custom note, and public URL
 */
export function shareToWhatsApp(reel: Reel, customNote?: string): void {
  const url = getPublicReelUrl(reel.id);
  const noteText = customNote?.trim() ? `"${customNote.trim()}"\n\n` : "";
  const message = `${noteText}Check out this Spec Reel: ${reel.title}\n${url}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

/**
 * Opens X (Twitter) tweet intent with Reel title and public URL
 */
export function shareToX(reel: Reel, customNote?: string): void {
  const url = getPublicReelUrl(reel.id);
  const noteText = customNote?.trim() ? `"${customNote.trim()}" ` : "";
  const text = `${noteText}Check out this Spec Reel on NexCivic: ${reel.title}`;
  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(xUrl, "_blank", "noopener,noreferrer");
}

/**
 * Opens Telegram share intent with Reel title and public URL
 */
export function shareToTelegram(reel: Reel, customNote?: string): void {
  const url = getPublicReelUrl(reel.id);
  const noteText = customNote?.trim() ? `"${customNote.trim()}" - ` : "";
  const text = `${noteText}${reel.title}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(telegramUrl, "_blank", "noopener,noreferrer");
}

/**
 * Opens Facebook sharer with public Reel URL
 */
export function shareToFacebook(reel: Reel): void {
  const url = getPublicReelUrl(reel.id);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(fbUrl, "_blank", "noopener,noreferrer");
}

/**
 * Opens mailto prompt with subject and body containing Reel URL
 */
export function shareByEmail(reel: Reel, customNote?: string): void {
  const url = getPublicReelUrl(reel.id);
  const subject = `Check out this Spec Reel: ${reel.title}`;
  const noteText = customNote?.trim() ? `Note: "${customNote.trim()}"\n\n` : "";
  const body = `Hi,\n\n${noteText}Check out this Spec Reel on NexCivic:\n${reel.title}\n\nWatch here: ${url}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

/**
 * Checks whether native Web Share API is available in current browser
 */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}

/**
 * Triggers native Web Share API (Android/iOS/Desktop native share sheet)
 */
export async function shareNative(reel: Reel, customNote?: string): Promise<boolean> {
  if (!canNativeShare()) return false;
  const url = getPublicReelUrl(reel.id);
  const text = customNote?.trim() || `Check out this Spec Reel: ${reel.title}`;

  try {
    await navigator.share({
      title: reel.title,
      text,
      url
    });
    return true;
  } catch (err: any) {
    // AbortError happens when user cancels native share; do not treat as failure
    if (err?.name !== "AbortError") {
      console.warn("shareNative error:", err);
    }
    return false;
  }
}
