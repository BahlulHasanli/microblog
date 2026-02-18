import type { APIRoute } from "astro";
import { GoogleGenAI } from "@google/genai";
import { getUserFromCookies } from "@/utils/auth";

const GRID_SIZE = 7;

interface GeneratedWord {
  id: string;
  word: string;
  x: number;
  y: number;
  direction: "H" | "V";
  clue: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getUserFromCookies(cookies, () => null);
    if (!user || user.role_id !== 1) {
      return new Response(
        JSON.stringify({ error: "Admin hüququ tələb olunur" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const apiKey = import.meta.env.GOOGLE_AI_API;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API key .env faylında tapılmadı" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await request.json().catch(() => ({}));
    const wordCount = Math.min(Math.max(body.wordCount || 4, 2), 6);
    const theme = body.theme || "";

    const ai = new GoogleGenAI({ apiKey });

    const themeInstruction = theme
      ? `Mövzu: "${theme}". Sözlər bu mövzu ilə əlaqəli olmalıdır.`
      : "Müxtəlif mövzularda sözlər seç";

    const prompt = `Sən Azərbaycan dilli krossword oyunu üçün söz generasiya edən assistentsən.

${GRID_SIZE}x${GRID_SIZE} ölçülü grid-ə yerləşən ${wordCount} söz yarat.

QAYDAlar:
1. Bütün sözlər Azərbaycan dilində olmalıdır
2. Sözlər 2-7 hərf uzunluğunda olmalıdır
3. Sözlər grid-ə sığmalıdır (${GRID_SIZE}x${GRID_SIZE})
4. Hər sözün x (sütun, 0-${GRID_SIZE - 1}) və y (sətir, 0-${GRID_SIZE - 1}) başlanğıc koordinatı olmalıdır
5. Horizontal (H) sözlər: x + söz_uzunluğu <= ${GRID_SIZE}
6. Vertical (V) sözlər: y + söz_uzunluğu <= ${GRID_SIZE}
7. Ən azı 2 söz bir-biri ilə kəsişməlidir (eyni xanada eyni hərf)
8. Hər söz üçün qısa ipucu ver (1-4 söz) (sinonim kimidə ola bilər)
9. Sözlər sadə, gündəlik istifadə olunan sözlər olmalıdır
10. Sözlər təkrarlanmamalıdır
11. Sözlərin ipucuları daha məntiqli olmalıdır. Məsələn "Kitab" sözü üçün "Oxumaq üçün vasitə" yox, "Nəşr" kimi daha məntiqli ipucu ver. Bir növ sinonim bənzəri.
13. Çətin sözlərdəndə istifadə et. Məsələn "Rast" sözünün ipucusu "Düz, Doğru" ola bilər.
${themeInstruction}

CAVAB FORMATI — yalnız JSON array, başqa heç nə yazma:
[
  {"word": "ALMA", "x": 0, "y": 0, "direction": "H", "clue": "Qırmızı meyvə"},
  {"word": "ANA", "x": 0, "y": 0, "direction": "V", "clue": "Ailə üzvü"}
]

Diqqət:
- Kəsişən sözlərdə eyni xanadakı hərflər eyni olmalıdır
- JSON array-dən başqa heç nə yazma — heç bir izahat, markdown, code block yox
- Yalnız böyük hərflərdən istifadə et
- Azərbaycan əlifbasındakı xüsusi hərfləri istifadə et: Ə, Ö, Ü, Ç, Ş, Ğ, I, İ`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash",
      contents: prompt,
    });

    const text = response.text?.trim() || "";

    // JSON parse — markdown code block silinməsi
    let jsonStr = text;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let words: GeneratedWord[];
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Boş və ya yanlış format");
      }

      // Validasiya və id əlavə et
      words = parsed.map((w: any, i: number) => {
        const word = (w.word || "").toUpperCase().trim();
        const x = Number(w.x) || 0;
        const y = Number(w.y) || 0;
        const direction = w.direction === "V" ? "V" : "H";
        const clue = (w.clue || "").trim();

        // Grid sınırı yoxla
        const endX = direction === "H" ? x + word.length - 1 : x;
        const endY = direction === "V" ? y + word.length - 1 : y;

        if (endX >= GRID_SIZE || endY >= GRID_SIZE || x < 0 || y < 0) {
          // Koordinatları düzəlt
          const fixedX =
            direction === "H"
              ? Math.min(x, GRID_SIZE - word.length)
              : Math.min(x, GRID_SIZE - 1);
          const fixedY =
            direction === "V"
              ? Math.min(y, GRID_SIZE - word.length)
              : Math.min(y, GRID_SIZE - 1);
          return {
            id: String(i + 1),
            word,
            x: Math.max(0, fixedX),
            y: Math.max(0, fixedY),
            direction,
            clue: clue || word,
          };
        }

        return {
          id: String(i + 1),
          word,
          x,
          y,
          direction,
          clue: clue || word,
        };
      });
    } catch (parseError) {
      console.error("AI cavabı parse olunmadı:", text);
      return new Response(
        JSON.stringify({
          error: "AI cavabı düzgün formatda deyil. Yenidən cəhd edin.",
          raw: text.substring(0, 500),
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, words }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("AI generate xətası:", error);
    return new Response(
      JSON.stringify({
        error: "AI xətası: " + (error.message || "Naməlum xəta"),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
