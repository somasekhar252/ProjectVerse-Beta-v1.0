/**
 * Resilient fetch wrapper that automatically retries failed network requests
 * (e.g. "Failed to fetch" due to a cold-starting or restarting server)
 * using exponential backoff.
 */
export async function robustFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 5,
  delay = 800
): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(input, init);
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("text/html")) {
        const urlStr = typeof input === "string"
          ? input
          : (input instanceof URL ? input.href : (input as Request).url || "");
        if (urlStr.includes("/api/")) {
          throw new Error("Server returned HTML for API request (restarting/offline)");
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      // Only retry on network errors (e.g., TypeError: Failed to fetch)
      console.warn(
        `[RobustFetch] Attempt ${i + 1} failed for ${input.toString()}. Retrying in ${delay}ms...`,
        error
      );
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 5000); // Backoff, cap at 5 seconds
      }
    }
  }
  throw lastError;
}
