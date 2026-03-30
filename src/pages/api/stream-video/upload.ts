import type { APIRoute } from "astro";
import {
  isMultipartRequest,
  parseMultipartRequest,
  MultipartParseError,
  MaxFileSizeExceededError,
} from "@mjackson/multipart-parser";
import { requireAuth } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";
import { bunnyCreateVideo, bunnyUploadVideoFile, readStreamEnv } from "@/lib/bunny-stream-upload";
import { resolveOrCreateBunnyCollectionForCategory } from "@/lib/bunny-stream-collections";

function isStreamVideoUploader(u: { role_id?: number }): boolean {
  return u?.role_id === 1;
}

const DEFAULT_LIBRARY = 486986;
/** Fayl yükləmə — Cloudflare Worker limiti ayrıca tətbiq oluna bilər */
const MAX_BYTES = 500 * 1024 * 1024;

export const POST: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    if (user instanceof Response) return user;

    if (!isStreamVideoUploader(user)) {
      return new Response(JSON.stringify({ success: false, message: "Video yükləmək üçün admin hüququ lazımdır" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const runtimeEnv = context.locals?.runtime?.env as Record<string, string | undefined> | undefined;
    const apiKey = readStreamEnv("BUNNY_STREAM_API_KEY", runtimeEnv);
    const libraryId = Number(readStreamEnv("BUNNY_STREAM_LIBRARY_ID", runtimeEnv) || DEFAULT_LIBRARY);

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, message: "BUNNY_STREAM_API_KEY təyin edilməyib" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isMultipartRequest(context.request)) {
      return new Response(JSON.stringify({ success: false, message: "multipart/form-data gözlənilir" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let fileBuffer: ArrayBuffer | null = null;
    let title = "";
    let descriptionRaw = "";
    let categoryIdRaw = "";

    try {
      for await (const part of parseMultipartRequest(context.request, { maxFileSize: MAX_BYTES })) {
        const n = part.name;
        /* Brauzerlər tez-tez video üçün Content-Type: video/mp4 verir; multipart-parser
           yalnız octet-stream və ya filename ilə "fayl" sayır. name=file həmişə ikili oxunur. */
        if (n === "file" && part.size > 0) {
          const raw = part.bytes;
          fileBuffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
        } else if (n === "title") {
          title = part.text.trim();
        } else if (n === "description") {
          descriptionRaw = part.text.trim();
        } else if (n === "categoryId") {
          categoryIdRaw = part.text.trim();
        }
      }
    } catch (e) {
      if (e instanceof MaxFileSizeExceededError) {
        return new Response(JSON.stringify({ success: false, message: "Fayl 500 MB-dan böyük ola bilməz" }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (e instanceof MultipartParseError) {
        console.warn("[stream-video/upload] multipart parse:", e.message);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Form məlumatı oxunmadı. Səhifəni yeniləyib yenidən cəhd edin.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      throw e;
    }

    const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, 8000) : null;

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ success: false, message: "Video faylı seçin" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!title) {
      return new Response(JSON.stringify({ success: false, message: "Başlıq daxil edin" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (typeof categoryIdRaw !== "string" || !categoryIdRaw.trim()) {
      return new Response(JSON.stringify({ success: false, message: "Kateqoriya seçin" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const categoryId = categoryIdRaw.trim();

    const { data: catRow, error: catErr } = await supabaseAdmin
      .from("stream_video_category")
      .select("id, name, slug, bunny_collection_guid")
      .eq("id", categoryId)
      .maybeSingle();

    if (catErr || !catRow) {
      return new Response(JSON.stringify({ success: false, message: "Kateqoriya tapılmadı" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const collectionResolved = await resolveOrCreateBunnyCollectionForCategory({
      apiKey,
      libraryId,
      category: {
        name: catRow.name,
        slug: catRow.slug,
        bunnyCollectionGuid: catRow.bunny_collection_guid,
      },
    });

    if (!collectionResolved.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Bunny kolleksiya: ${collectionResolved.message}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const collectionGuid = collectionResolved.guid;

    const guidToStore = catRow.bunny_collection_guid?.trim() || null;
    if (!guidToStore || guidToStore !== collectionGuid) {
      const { error: upCatErr } = await supabaseAdmin
        .from("stream_video_category")
        .update({ bunny_collection_guid: collectionGuid })
        .eq("id", categoryId);
      if (upCatErr) {
        console.warn("[stream-video/upload] bunny_collection_guid yenilənmədi", upCatErr.message);
      }
    }

    const created = await bunnyCreateVideo({
      apiKey,
      libraryId,
      title,
      collectionId: collectionGuid,
    });

    if (!created.success) {
      return new Response(JSON.stringify({ success: false, message: created.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const up = await bunnyUploadVideoFile({
      apiKey,
      libraryId,
      videoGuid: created.guid,
      body: fileBuffer,
    });

    if (!up.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Bunny fayl yükləməsi uğursuz: ${up.message || up.status}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("stream_video")
      .insert({
        bunny_video_guid: created.guid,
        title,
        description,
        user_id: user.id,
        category_id: categoryId,
        published: true,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[stream-video/upload] DB insert", insErr);
      return new Response(
        JSON.stringify({
          success: false,
          message: insErr.message.includes("stream_video")
            ? "Verilənlər bazası: stream_video cədvəli yoxdur — migrasiya tətbiq edin"
            : insErr.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: inserted?.id,
        bunnyGuid: created.guid,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[stream-video/upload]", e);
    return new Response(JSON.stringify({ success: false, message: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
