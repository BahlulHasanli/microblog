/**
 * Bunny Stream — server tərəfdə video yaratmaq və fayl yükləmək.
 * @see https://docs.bunny.net/docs/stream-uploading-videos-through-our-http-api
 */

const API_BASE = "https://video.bunnycdn.com";

const DEFAULT_LIBRARY_ID = 486986;

export type CreateBunnyVideoResult = {
  guid: string;
  success: true;
} | {
  success: false;
  message: string;
  status?: number;
};

export async function bunnyCreateVideo(params: {
  apiKey: string;
  libraryId: number;
  title: string;
  collectionId?: string | null;
}): Promise<CreateBunnyVideoResult> {
  const body: Record<string, string> = { title: params.title };
  if (params.collectionId) {
    body.collectionId = params.collectionId;
  }

  const res = await fetch(`${API_BASE}/library/${params.libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: params.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    return { success: false, message: text || `HTTP ${res.status}`, status: res.status };
  }

  let data: { guid?: string; videoId?: string; id?: string };
  try {
    data = JSON.parse(text) as { guid?: string; videoId?: string; id?: string };
  } catch {
    return { success: false, message: "Bunny cavabı JSON deyil" };
  }

  const guid = data.guid || data.videoId || data.id;
  if (!guid) {
    return { success: false, message: "Bunny video guid qaytarmadı" };
  }

  return { success: true, guid };
}

export async function bunnyUploadVideoFile(params: {
  apiKey: string;
  libraryId: number;
  videoGuid: string;
  body: ArrayBuffer | Uint8Array;
}): Promise<{ ok: boolean; status: number; message?: string }> {
  const len = params.body.byteLength;

  const res = await fetch(
    `${API_BASE}/library/${params.libraryId}/videos/${params.videoGuid}`,
    {
      method: "PUT",
      headers: {
        AccessKey: params.apiKey,
        Accept: "application/json",
        "Content-Type": "application/octet-stream",
        "Content-Length": String(len),
      },
      body: params.body as BodyInit,
    }
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: t || res.statusText };
  }

  return { ok: true, status: res.status };
}

export function readStreamEnv(
  name: string,
  runtimeEnv?: Record<string, string | undefined>
): string | undefined {
  const fromRuntime = runtimeEnv?.[name];
  if (fromRuntime !== undefined && fromRuntime !== "") return fromRuntime;
  return (import.meta.env as Record<string, string | undefined>)[name];
}
