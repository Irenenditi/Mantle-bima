import { API_BASE_URL } from "./api";

/**
 * Resolve a metadata/media reference into a fetchable URL.
 *
 * Supported inputs:
 * - Full http(s) URL (returned as-is)
 * - ipfs://<cid>/<path> (converted to https gateway)
 * - Bare CID/path (converted to gateway)
 * - local-* hashes (converted to backend storage URLs via resolver)
 */
export function resolveIpfsUrl(
  value: unknown,
  opts?: { gatewayBase?: string; cacheBust?: boolean; isImage?: boolean },
): string | null {
  if (!value) return null;
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  const cacheBust = opts?.cacheBust ?? false;
  const gatewayBase =
    opts?.gatewayBase ?? "https://gateway.pinata.cloud/ipfs/";

  // Already a URL (local backend URLs come through here too)
  if (/^https?:\/\//i.test(raw)) {
    if (!cacheBust) return raw;
    const joiner = raw.includes("?") ? "&" : "?";
    return `${raw}${joiner}cb=${Date.now()}`;
  }

  // Backend-relative storage path
  if (raw.startsWith("/storage/")) {
    const url = `${API_BASE_URL}${raw}`;
    if (!cacheBust) return url;
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}cb=${Date.now()}`;
  }

  // Local dev hashes (local-* or local-json-*)
  // These need to be resolved via backend endpoint since filenames don't match hashes
  if (raw.startsWith("local-")) {
    // Return resolver endpoint URL - components should fetch this to get actual file URL
    const resolverUrl = `${API_BASE_URL}/ipfs/resolve/${encodeURIComponent(raw)}`;
    return resolverUrl;
  }

  // ipfs://CID[/path]
  if (raw.toLowerCase().startsWith("ipfs://")) {
    const noProto = raw.slice("ipfs://".length);
    const url = `${gatewayBase}${noProto}`;
    if (!cacheBust) return url;
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}cb=${Date.now()}`;
  }

  // Bare CID or CID/path - only use gateway if it looks like a real CID (Qm... or bafy...)
  // Don't try to resolve random strings as IPFS CIDs
  const looksLikeCid = /^(Qm[1-9A-Za-z]{44}|bafy[a-z0-9]{56,})/i.test(raw);
  if (looksLikeCid) {
    const url = `${gatewayBase}${raw}`;
    if (!cacheBust) return url;
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}cb=${Date.now()}`;
  }

  // Unknown format - return null rather than trying to use gateway
  return null;
}

/**
 * Async helper to resolve IPFS URLs, including local hashes that need backend resolution
 */
export async function resolveIpfsUrlAsync(
  value: unknown,
  opts?: { gatewayBase?: string; cacheBust?: boolean; isImage?: boolean },
): Promise<string | null> {
  const url = resolveIpfsUrl(value, opts);
  if (!url) return null;
  
  // If it's a resolver endpoint, fetch the actual URL
  if (url.includes("/ipfs/resolve/")) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.url || null;
      }
    } catch (err) {
      console.error("Failed to resolve local hash:", err);
      return null;
    }
  }
  
  return url;
}


