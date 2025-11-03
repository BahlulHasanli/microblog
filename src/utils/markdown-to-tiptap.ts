/**
 * Markdown içeriğini Tiptap JSON formatına dönüştüren yardımcı fonksiyon
 */

interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, any> }[];
}

interface TiptapDocument {
  type: string;
  content: TiptapNode[];
}

export function markdownToTiptap(
  markdown: string,
  title: string,
  description: string
): TiptapDocument {
  // Temel doküman yapısını oluştur
  const document: TiptapDocument = {
    type: "doc",
    content: [],
  };

  // Eğer title ve description varsa, başlıq ve paragraf ekle
  if (title) {
    document.content.push({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: title }],
    });
  }

  if (description) {
    document.content.push({
      type: "paragraph",
      content: [{ type: "text", text: description }],
    });
  }

  // HTML elementlerini tek satıra birleştir
  let processedMarkdown = markdown;

  // <div> etiketlerini tek satıra birleştir
  processedMarkdown = processedMarkdown.replace(
    /<div([\s\S]*?)<\/div>/g,
    (match) => match.replace(/\s+/g, " ")
  );

  // Markdown içeriğini satırlara ayır
  const lines = processedMarkdown.split("\n");
  let currentParagraph: TiptapNode | null = null;
  let inCodeBlock = false;
  let codeBlockContent = "";
  let codeBlockLanguage = "";
  let firstHeadingSkipped = false;
  let firstParagraphSkipped = false;

  // Her satırı işle
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Boş satırları atla
    if (line === "" && !inCodeBlock) {
      if (currentParagraph) {
        document.content.push(currentParagraph);
        currentParagraph = null;
      }
      continue;
    }

    // Kod bloğu başlangıcı
    if (line.startsWith("```") && !inCodeBlock) {
      inCodeBlock = true;
      codeBlockLanguage = line.substring(3).trim();
      codeBlockContent = "";
      continue;
    }

    // Kod bloğu bitişi
    if (line.startsWith("```") && inCodeBlock) {
      inCodeBlock = false;
      document.content.push({
        type: "codeBlock",
        attrs: { language: codeBlockLanguage },
        content: [{ type: "text", text: codeBlockContent }],
      });
      continue;
    }

    // Kod bloğu içeriği
    if (inCodeBlock) {
      codeBlockContent += line + "\n";
      continue;
    }

    // HTML styled heading veya paragraph kontrolü
    const htmlStyleMatch = line.match(
      /^<(h[1-4]|p)\s+style="text-align:(left|center|right|justify)">(.+)<\/\1>$/
    );
    if (htmlStyleMatch) {
      const tag = htmlStyleMatch[1];
      const textAlign = htmlStyleMatch[2];
      const content = htmlStyleMatch[3];

      if (tag.startsWith("h")) {
        const level = parseInt(tag.substring(1));
        document.content.push({
          type: "heading",
          attrs: { level, textAlign },
          content: processInlineMarkdown(content),
        });
      } else {
        document.content.push({
          type: "paragraph",
          attrs: { textAlign },
          content: processInlineMarkdown(content),
        });
      }
      continue;
    }

    // Başlıklar
    if (line.startsWith("# ")) {
      // İlk başlığı atla (title parametrəsi ilə artıq yaradılıb)
      if (!firstHeadingSkipped) {
        firstHeadingSkipped = true;
        continue;
      }

      // Başlık içeriğini al
      const headingContent = line.substring(2);

      // Başlık içeriğinde vurgu işaretleri (bold, italic) olup olmadığını kontrol et
      const processedContent = processInlineMarkdown(headingContent);

      document.content.push({
        type: "heading",
        attrs: { level: 2 },
        content: processedContent,
      });
      continue;
    }

    if (line.startsWith("## ")) {
      // Başlık içeriğini al
      const headingContent = line.substring(3);

      // Başlık içeriğinde vurgu işaretleri (bold, italic) olup olmadığını kontrol et
      const processedContent = processInlineMarkdown(headingContent);

      document.content.push({
        type: "heading",
        attrs: { level: 2 },
        content: processedContent,
      });
      continue;
    }

    if (line.startsWith("### ")) {
      // Başlık içeriğini al
      const headingContent = line.substring(4);

      // Başlık içeriğinde vurgu işaretleri (bold, italic) olup olmadığını kontrol et
      const processedContent = processInlineMarkdown(headingContent);

      document.content.push({
        type: "heading",
        attrs: { level: 3 },
        content: processedContent,
      });
      continue;
    }

    if (line.startsWith("#### ")) {
      // Başlık içeriğini al
      const headingContent = line.substring(5);

      // Başlık içeriğinde vurgu işaretleri (bold, italic) olup olmadığını kontrol et
      const processedContent = processInlineMarkdown(headingContent);

      document.content.push({
        type: "heading",
        attrs: { level: 4 },
        content: processedContent,
      });
      continue;
    }

    // Resimler
    const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      const alt = imageMatch[1];
      const src = imageMatch[2];
      document.content.push({
        type: "image",
        attrs: { src, alt },
      });
      continue;
    }

    // Rating komponenti
    if (line.includes("<Rating")) {
      const scoreMatch = line.match(/score="([^"]+)"/);

      if (scoreMatch && scoreMatch[1]) {
        const score = parseFloat(scoreMatch[1]);
        console.log("Bulunan Rating score:", score);

        document.content.push({
          type: "rating",
          attrs: { score },
        });
        continue;
      }
    }

    // YouTube videoları - tam olarak istenen formatta kontrol et
    if (line.includes("data-youtube-video")) {
      // Video ID'yi çıkar - önce boşluklu format için kontrol et
      const videoIdMatch = line.match(/data-youtube-video="([^"]+)"/);

      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        console.log("Bulunan YouTube video ID:", videoId);

        document.content.push({
          type: "youtube",
          attrs: { src: `https://www.youtube.com/embed/${videoId}` },
        });
        continue;
      }
    }

    // YouTube videoları için alternatif format kontrolü
    if (/<div[^>]*data-youtube-video/.test(line)) {
      const multiLineContent = lines.slice(i, i + 5).join(" ");
      const videoIdMatch = multiLineContent.match(
        /data-youtube-video="([^"]+)"/
      );

      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        console.log("Alternatif yolla bulunan YouTube video ID:", videoId);

        document.content.push({
          type: "youtube",
          attrs: { src: `https://www.youtube.com/embed/${videoId}` },
        });

        // Birkaç satırı atlayarak ilerle
        while (i < lines.length && !lines[i].includes("</div>")) {
          i++;
        }
        continue;
      }
    }

    // Alıntılar (blockquote)
    if (line.startsWith("> ")) {
      const quoteText = line.substring(2);
      const lastNode = document.content[document.content.length - 1];

      // Eğer önceki düğüm bir blockquote ise, ona ekle
      if (lastNode?.type === "blockquote") {
        // Boş satır ise yeni paragraf ekle
        if (quoteText === "") {
          lastNode.content?.push({
            type: "paragraph",
            content: [],
          });
        } else {
          // Son paragrafı bul veya yeni paragraf oluştur
          const lastQuoteNode = lastNode.content?.[lastNode.content.length - 1];
          if (
            lastQuoteNode?.type === "paragraph" &&
            lastQuoteNode.content?.length === 0
          ) {
            // Boş paragrafa metin ekle
            lastQuoteNode.content = processInlineMarkdown(quoteText);
          } else {
            // Yeni paragraf ekle
            lastNode.content?.push({
              type: "paragraph",
              content: processInlineMarkdown(quoteText),
            });
          }
        }
      } else {
        // Yeni blockquote oluştur
        document.content.push({
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: quoteText ? processInlineMarkdown(quoteText) : [],
            },
          ],
        });
      }
      continue;
    }

    // Todo listeler (task items)
    const taskItemMatch = line.match(/^-\s\[([ xX])\]\s(.*)$/);
    if (taskItemMatch) {
      const checked = taskItemMatch[1].toLowerCase() === "x";
      const taskText = taskItemMatch[2];

      const lastNode = document.content[document.content.length - 1];
      if (lastNode?.type !== "taskList") {
        document.content.push({
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked },
              content: [
                {
                  type: "paragraph",
                  content: processInlineMarkdown(taskText),
                },
              ],
            },
          ],
        });
      } else {
        lastNode.content.push({
          type: "taskItem",
          attrs: { checked },
          content: [
            {
              type: "paragraph",
              content: processInlineMarkdown(taskText),
            },
          ],
        });
      }
      continue;
    }

    // Madde işaretli listeler
    if (line.startsWith("- ")) {
      // Eğer önceki düğüm bir liste değilse, yeni bir liste oluştur
      const lastNode = document.content[document.content.length - 1];
      if (lastNode?.type !== "bulletList") {
        document.content.push({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: processInlineMarkdown(line.substring(2)),
                },
              ],
            },
          ],
        });
      } else {
        // Mevcut listeye yeni bir öğe ekle
        lastNode.content.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: processInlineMarkdown(line.substring(2)),
            },
          ],
        });
      }
      continue;
    }

    // Numaralı listeler
    const numberedListMatch = line.match(/^(\d+)\.\s(.*)$/);
    if (numberedListMatch) {
      const lastNode = document.content[document.content.length - 1];
      if (lastNode?.type !== "orderedList") {
        document.content.push({
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: processInlineMarkdown(numberedListMatch[2]),
                },
              ],
            },
          ],
        });
      } else {
        lastNode.content.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: processInlineMarkdown(numberedListMatch[2]),
            },
          ],
        });
      }
      continue;
    }

    // Yatay çizgi
    if (line === "---") {
      document.content.push({
        type: "horizontalRule",
      });
      continue;
    }

    // Normal paragraf
    // İlk paragrafı atla (description parametrəsi ilə artıq yaradılıb)
    // Ancaq sadəcə description boşsa atla
    if (!firstParagraphSkipped && !firstHeadingSkipped && !description) {
      firstParagraphSkipped = true;
      continue;
    }
    
    // Əgər description varsa, firstParagraphSkipped-i true yap
    if (!firstParagraphSkipped && description) {
      firstParagraphSkipped = true;
    }

    if (!currentParagraph) {
      currentParagraph = {
        type: "paragraph",
        content: [],
      };
    }

    // Paragraf içeriğini işle (kalın, italik, vb.)
    const textContent = processInlineMarkdown(line);
    if (currentParagraph.content) {
      currentParagraph.content.push(...textContent);
    }
  }

  // Son paragrafı ekle
  if (
    currentParagraph &&
    currentParagraph.content &&
    currentParagraph.content.length > 0
  ) {
    document.content.push(currentParagraph);
  }

  return document;
}

// Satır içi markdown işaretlerini işle (kalın, italik, vb.)
function processInlineMarkdown(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    // Hem kalın hem italik metin (***text***)
    if (
      text.substring(i, i + 3) === "***" &&
      text.indexOf("***", i + 3) !== -1
    ) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endBoldItalic = text.indexOf("***", i + 3);
      const boldItalicText = text.substring(i + 3, endBoldItalic);
      nodes.push({
        type: "text",
        text: boldItalicText,
        marks: [{ type: "bold" }, { type: "italic" }],
      });
      i = endBoldItalic + 3;
      continue;
    }

    // Kalın metin
    if (text.substring(i, i + 2) === "**" && text.indexOf("**", i + 2) !== -1) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endBold = text.indexOf("**", i + 2);
      const boldText = text.substring(i + 2, endBold);
      nodes.push({
        type: "text",
        text: boldText,
        marks: [{ type: "bold" }],
      });
      i = endBold + 2;
      continue;
    }

    // İtalik metin
    if (text[i] === "*" && text.indexOf("*", i + 1) !== -1) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endItalic = text.indexOf("*", i + 1);
      const italicText = text.substring(i + 1, endItalic);
      nodes.push({
        type: "text",
        text: italicText,
        marks: [{ type: "italic" }],
      });
      i = endItalic + 1;
      continue;
    }

    // Üstü çizili metin
    if (text.substring(i, i + 2) === "~~" && text.indexOf("~~", i + 2) !== -1) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endStrike = text.indexOf("~~", i + 2);
      const strikeText = text.substring(i + 2, endStrike);
      nodes.push({
        type: "text",
        text: strikeText,
        marks: [{ type: "strike" }],
      });
      i = endStrike + 2;
      continue;
    }

    // Altı çizili metin (HTML <u> tag)
    if (text.substring(i, i + 3) === "<u>" && text.indexOf("</u>", i) !== -1) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endUnderline = text.indexOf("</u>", i);
      const underlineText = text.substring(i + 3, endUnderline);

      // İç içe markdown işaretlerini işle
      const innerNodes = processInlineMarkdown(underlineText);

      innerNodes.forEach((node) => {
        if (node.type === "text") {
          const existingMarks = node.marks || [];
          nodes.push({
            ...node,
            marks: [...existingMarks, { type: "underline" }],
          });
        }
      });

      i = endUnderline + 4;
      continue;
    }

    // Superscript (HTML <sup> tag)
    if (
      text.substring(i, i + 5) === "<sup>" &&
      text.indexOf("</sup>", i) !== -1
    ) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endSup = text.indexOf("</sup>", i);
      const supText = text.substring(i + 5, endSup);
      nodes.push({
        type: "text",
        text: supText,
        marks: [{ type: "superscript" }],
      });
      i = endSup + 6;
      continue;
    }

    // Subscript (HTML <sub> tag)
    if (
      text.substring(i, i + 5) === "<sub>" &&
      text.indexOf("</sub>", i) !== -1
    ) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endSub = text.indexOf("</sub>", i);
      const subText = text.substring(i + 5, endSub);
      nodes.push({
        type: "text",
        text: subText,
        marks: [{ type: "subscript" }],
      });
      i = endSub + 6;
      continue;
    }

    // Kod
    if (text[i] === "`" && text.indexOf("`", i + 1) !== -1) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endCode = text.indexOf("`", i + 1);
      const codeText = text.substring(i + 1, endCode);
      nodes.push({
        type: "text",
        text: codeText,
        marks: [{ type: "code" }],
      });
      i = endCode + 1;
      continue;
    }

    // Bağlantı
    if (text[i] === "[" && text.indexOf("](", i) !== -1) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const closeBracket = text.indexOf("](", i);
      const closeParenthesis = text.indexOf(")", closeBracket);

      if (closeParenthesis !== -1) {
        const linkText = text.substring(i + 1, closeBracket);
        const linkUrl = text.substring(closeBracket + 2, closeParenthesis);

        nodes.push({
          type: "text",
          text: linkText,
          marks: [{ type: "link", attrs: { href: linkUrl } }],
        });

        i = closeParenthesis + 1;
        continue;
      }
    }

    // Highlight (mark elementi)
    if (
      text.substring(i, i + 6) === "<mark " &&
      text.indexOf("</mark>", i) !== -1
    ) {
      if (currentText) {
        nodes.push({ type: "text", text: currentText });
        currentText = "";
      }

      const endMark = text.indexOf("</mark>", i);
      const markContent = text.substring(i, endMark + 7);

      // Style attribute'ünden rengi çıkar
      const styleMatch = markContent.match(/style="background-color:([^"]+)"/);
      const color = styleMatch
        ? styleMatch[1]
        : "var(--tt-color-highlight-yellow)";

      // Mark içindeki metni çıkar
      const textMatch = markContent.match(/>([^<]+)</);
      const markText = textMatch ? textMatch[1] : "";

      // İç içe markdown işaretlerini işle (bold, italic vb.)
      const innerNodes = processInlineMarkdown(markText);

      // Her bir node'a highlight mark'ı ekle
      innerNodes.forEach((node) => {
        if (node.type === "text") {
          const existingMarks = node.marks || [];
          nodes.push({
            ...node,
            marks: [...existingMarks, { type: "highlight", attrs: { color } }],
          });
        }
      });

      i = endMark + 7;
      continue;
    }

    // Normal metin
    currentText += text[i];
    i++;
  }

  // Kalan metni ekle
  if (currentText) {
    nodes.push({ type: "text", text: currentText });
  }

  return nodes;
}
