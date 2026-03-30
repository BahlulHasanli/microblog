/**
 * Bunny Stream CDN: https://{host}/{videoGuid}/playlist.m3u8
 * Bəzən index.m3u8 / master.m3u8 — eyni qovluq strukturu.
 */
export function parseBunnyStreamPlaylistUrl(input: string): { guid: string } | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (!/^https?:$/i.test(url.protocol)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1] ?? "";
  if (!/\.m3u8$/i.test(last)) return null;

  const guid = parts[parts.length - 2]?.trim() ?? "";
  /* Bunny video id: UUID və ya oxşar uzun slug */
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(guid)) return null;

  return { guid };
}
