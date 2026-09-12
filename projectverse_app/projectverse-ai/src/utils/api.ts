export interface RobustFetchOptions extends RequestInit {
  retries?: number;
  delay?: number;
  silent?: boolean;
}

/**
 * Resilient fetch wrapper that automatically retries failed network requests
 * (e.g. "Failed to fetch" due to a cold-starting or restarting server)
 * using exponential backoff. Handles offline/SPA HTML fallbacks gracefully.
 */
export async function robustFetch(
  input: RequestInfo | URL,
  init?: RequestInit | RobustFetchOptions,
  retries = 2,
  delay = 400,
  silent = false
): Promise<Response> {
  let lastError: any;

  const initObj = (init || {}) as RobustFetchOptions;
  const maxRetries = initObj.retries ?? retries;
  let currentDelay = initObj.delay ?? delay;
  const isSilent = initObj.silent ?? silent;

  const urlStr = typeof input === "string"
    ? input
    : (input instanceof URL ? input.href : (input as Request)?.url || "");
  const isLocalApi = urlStr.includes("/api/");

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(input, init);
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("text/html")) {
        if (isLocalApi) {
          const htmlErr = new Error("Server returned HTML for API request (restarting/offline)");
          (htmlErr as any).isSpaFallback = true;
          throw htmlErr;
        }
      }
      return response;
    } catch (error: any) {
      lastError = error;

      // SPA fallback indicates the Express API route is offline/unhandled by Vite dev server.
      // Do not retry because Vite will continue to return index.html.
      if (error?.isSpaFallback) {
        if (!isSilent) {
          console.debug(`[RobustFetch] Local API offline (SPA HTML returned for ${urlStr || input})`);
        }
        break;
      }

      if (!isSilent) {
        console.warn(
          `[RobustFetch] Attempt ${i + 1} failed for ${urlStr || input.toString()}. Retrying in ${currentDelay}ms...`,
          error
        );
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay = Math.min(currentDelay * 1.5, 3000);
      }
    }
  }

  if (!isSilent && lastError && !lastError?.isSpaFallback) {
    console.warn(`[RobustFetch] All ${maxRetries} attempts failed for ${urlStr || input.toString()}:`, lastError);
  }

  throw lastError;
}
