import { useState, useRef, useEffect } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { isSaveBtn } from "@/store/buttonStore";
import { uploadTemporaryImages } from "@/lib/tiptap-utils";
import { markdownToTiptap } from "@/utils/markdown-to-tiptap";
import { useStore } from "@nanostores/react";
// editorStore artıq lazım deyil - şəkillər save zamanı yüklənir
import { categories as CATEGORIES } from "@/data/categories";

// Global tip tanımlaması
declare global {
  interface Window {
    _currentEditorTitle?: string;
  }
}

export default function PostEditor({ post, content, slug, author }: any) {
  const [editorContent, setEditorContent] = useState(null);
  const [title, setTitle] = useState(post.title || "");
  const [description, setDescription] = useState(post.description || "");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>(
    post.image?.url || ""
  );
  const [existingImageUrl, setExistingImageUrl] = useState<string>(
    post.image?.url || ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    post.categories || []
  );

  // Markdown içeriğini JSON'a dönüştür
  const [initialEditorContent, setInitialEditorContent] = useState<any>(null);
  const [isContentProcessed, setIsContentProcessed] = useState(false);

  // Store artıq lazım deyil

  useEffect(() => {
    window._currentEditorTitle = title;
  }, [title]);

  // Markdown içeriğini yalnız bir dəfə işlə
  useEffect(() => {
    if (content && !isContentProcessed) {
      try {
        // Markdown içeriğini JSON'a dönüştür
        const processedContent = markdownToTiptap(content, title, description);

        // İçeriği ayarla
        setInitialEditorContent(processedContent);
        setIsContentProcessed(true);
        console.log("Markdown içeriği başarıyla işlendi", processedContent);
      } catch (error) {
        console.error("Markdown içeriği işlenirken hata oluştu:", error);
      }
    }
  }, [content, title, description, isContentProcessed]);

  const handleCoverImageChange = (file: File | null) => {
    setCoverImage(file);
    if (!file) {
      setCoverImagePreview(existingImageUrl);
    } else {
      // Create a preview URL for the new image
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
    }
  };

  const handleSave = async () => {
    if (!title) {
      console.error("Başlık alanı zorunludur");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    if (!editorContent) {
      console.error("İçerik alanı zorunludur");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      console.log("Geçici resimler Bunny CDN'e yükleniyor...");

      // Resim ID'lerini saklamak için bir Map oluştur
      let imageIdMapData: Record<string, string> = {};

      // window._imageIdMap varsa, içeriğini al
      if (window._imageIdMap && window._imageIdMap.size > 0) {
        console.log(
          "Resim ID'leri bulundu:",
          Array.from(window._imageIdMap.entries())
        );
        imageIdMapData = Object.fromEntries(window._imageIdMap.entries());
      }

      const updatedContent = await uploadTemporaryImages(
        editorContent,
        (current, total) => {
          console.log(`Resim yükleniyor: ${current}/${total}`);
        }
      );

      // Yükleme sonrası güncel resim ID'lerini al
      if (window._imageIdMap && window._imageIdMap.size > 0) {
        console.log(
          "Güncel resim ID'leri:",
          Array.from(window._imageIdMap.entries())
        );
        imageIdMapData = Object.fromEntries(window._imageIdMap.entries());
      }

      const markdownContent = convertJsonToMarkdown(updatedContent);

      let descriptionValue = description;
      if (
        updatedContent &&
        updatedContent.content &&
        updatedContent.content.length >= 2
      ) {
        const descNode = updatedContent.content[1];
        if (descNode && descNode.type === "description" && descNode.content) {
          // Description düğümünden metin içeriğini al
          const descText = descNode.content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("");

          if (descText && descText.trim() !== "") {
            descriptionValue = descText;
            // State'i de güncelle
            setDescription(descText);
          }
        }
      }

      console.log("Kaydedilen açıklama:", descriptionValue);

      // FormData oluştur
      const formData = new FormData();
      formData.append("slug", slug);
      formData.append("title", title);
      formData.append("description", descriptionValue);
      formData.append("content", markdownContent);

      // Resim ID'lerini JSON olarak ekle
      if (Object.keys(imageIdMapData).length > 0) {
        console.log("Resim ID'leri API'ye gönderiliyor:", imageIdMapData);
        formData.append("imageIdMap", JSON.stringify(imageIdMapData));
      }

      // Kategorileri ekle
      selectedCategories.forEach((category) => {
        formData.append("categories", category);
      });

      // Mevcut kapak resmi URL'si
      if (existingImageUrl) {
        formData.append("existingImageUrl", existingImageUrl);
      }

      // Kapak resmi varsa ekle
      if (coverImage) {
        console.log(
          "Kapak resmi yükleniyor:",
          coverImage.name,
          coverImage.type,
          coverImage.size
        );

        // Dosya uzantısını al
        const fileExtension = coverImage.name.split(".").pop() || "jpg";

        // Resim adını oluştur: slug-cover.extension formatında
        const imageFileName = `${slug}-cover.${fileExtension}`;
        console.log("Oluşturulan resim dosya adı:", imageFileName);

        try {
          // Resim dosyasını FormData'ya ekle
          // Dosya adını belirterek yükleme
          const newFile = new File([coverImage], imageFileName, {
            type: coverImage.type,
          });
          formData.append("uploadedImage", newFile);
          // Kapak resmi için aynı klasör yapısını kullan (notes/[slug]/images)
          formData.append("image", `notes/${slug}/images/${imageFileName}`);
          formData.append("imageAlt", title);
          console.log("Resim FormData'ya eklendi, dosya adı:", imageFileName);

          // Revoke any object URLs to prevent memory leaks
          if (coverImagePreview && coverImagePreview !== existingImageUrl) {
            URL.revokeObjectURL(coverImagePreview);
          }
        } catch (error) {
          console.error("FormData'ya resim ekleme hatası:", error);
        }
      }

      // API'ye istek gönder
      const response = await fetch("/api/edit-post", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Güncelleme işlemi başarısız oldu");
      }

      // Başarılı kaydetme
      console.log("Post başarıyla güncellendi", data);

      setSaveStatus("success");

      // Başarılı güncelleme sonrası post sayfasına yönlendir
      // Əgər slug dəyişibsə, yeni slug-a yönləndir
      const finalSlug = data.slug || slug;

      // Dərhal redirect et
      window.location.href = `/posts/${finalSlug}`;
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Tiptap JSON içeriğini Markdown formatına dönüştürür
   */
  function convertJsonToMarkdown(json: any): string {
    // Eğer içerik yoksa boş bir string döndür
    if (!json || !json.content || json.content.length === 0) {
      return "";
    }

    let markdown = "";

    // İlk başlık (title) ve ilk paragraf (description) düğümlerini atla
    // Bunlar zaten frontmatter'da bulunuyor
    let foundHeading = false;
    let foundParagraph = false;

    // İçerik sadece başlık ve açıklamadan oluşuyorsa boş bir içerik döndür
    // Bu durumda içerik boş olsa bile kaydetmeye izin ver
    if (json.content.length <= 2) {
      // Başlık ve açıklama varsa boş string döndür
      const hasHeading = json.content.some(
        (node: any) => node.type === "heading"
      );
      const hasParagraph = json.content.some(
        (node: any) => node.type === "paragraph"
      );

      if (hasHeading && hasParagraph) {
        return " "; // Boş olmayan bir string döndür (boşluk karakteri)
      }
    }

    json.content.forEach((node: any) => {
      // İlk heading düğümünü atla (başlık)
      if (node.type === "heading" && !foundHeading) {
        foundHeading = true;
        return;
      }

      // İlk paragraph düğümünü atla (açıklama)
      if (node.type === "paragraph" && !foundParagraph) {
        foundParagraph = true;
        return;
      }

      markdown += processNode(node);
    });

    // Eğer içerik boşsa (sadece başlık ve açıklama varsa) boş olmayan bir string döndür
    return markdown || " ";
  }

  /**
   * JSON düğümünü işleyerek Markdown'a dönüştürür
   */
  function processNode(node: any): string {
    if (!node) return "";

    switch (node.type) {
      case "title":
        // Title düğümünü başlık olarak işle
        return (
          "# " +
          (node.content ? node.content.map(processTextNode).join("") : "") +
          "\n\n"
        );
      case "description":
        // Description düğümünü normal paragraf olarak işle
        return (
          (node.content ? node.content.map(processTextNode).join("") : "") +
          "\n\n"
        );
      case "paragraph":
        return processParagraph(node) + "\n\n";
      case "heading":
        return processHeading(node) + "\n\n";
      case "bulletList":
        return processBulletList(node) + "\n";
      case "orderedList":
        return processOrderedList(node) + "\n";
      case "taskList":
        return processTaskList(node) + "\n";
      case "blockquote":
        return processBlockquote(node) + "\n\n";
      case "codeBlock":
        return processCodeBlock(node) + "\n\n";
      case "horizontalRule":
        return "---\n\n";
      case "image":
        return processImage(node) + "\n\n";
      case "youtube":
        return processYoutubeVideo(node) + "\n\n";
      default:
        if (node.content) {
          return node.content.map(processNode).join("");
        }
        return "";
    }
  }

  function processParagraph(node: any): string {
    if (!node.content) return "";
    const content = node.content.map(processTextNode).join("");

    // TextAlign desteği
    const textAlign = node.attrs?.textAlign;
    if (textAlign && textAlign !== "left") {
      return `<p style="text-align:${textAlign}">${content}</p>`;
    }

    return content;
  }

  function processHeading(node: any): string {
    if (!node.content) return "";
    const level = node.attrs?.level || 1;
    const content = node.content.map(processTextNode).join("");

    // TextAlign desteği
    const textAlign = node.attrs?.textAlign;
    if (textAlign && textAlign !== "left") {
      const tag = `h${Math.min(level, 4)}`;
      return `<${tag} style="text-align:${textAlign}">${content}</${tag}>`;
    }

    const prefix = "#".repeat(Math.min(level, 4)) + " ";
    return prefix + content;
  }

  function processBulletList(node: any): string {
    if (!node.content) return "";
    return node.content
      .map((item: any) => {
        if (item.type === "listItem" && item.content) {
          return "- " + item.content.map(processNode).join("").trim();
        }
        return "";
      })
      .join("\n");
  }

  function processOrderedList(node: any): string {
    if (!node.content) return "";
    return node.content
      .map((item: any, index: number) => {
        if (item.type === "listItem" && item.content) {
          return (
            `${index + 1}. ` + item.content.map(processNode).join("").trim()
          );
        }
        return "";
      })
      .join("\n");
  }

  function processTaskList(node: any): string {
    if (!node.content) return "";
    return node.content
      .map((item: any) => {
        if (item.type === "taskItem" && item.content) {
          const checked = item.attrs?.checked ? "x" : " ";
          return (
            `- [${checked}] ` + item.content.map(processNode).join("").trim()
          );
        }
        return "";
      })
      .join("\n");
  }

  function processBlockquote(node: any): string {
    if (!node.content) return "";
    return "> " + node.content.map(processNode).join("").replace(/\n/g, "\n> ");
  }

  function processCodeBlock(node: any): string {
    if (!node.content) return "";
    const language = node.attrs?.language || "";
    const code = node.content.map((n: any) => n.text || "").join("");
    return "```" + language + "\n" + code + "\n```";
  }

  function processImage(node: any): string {
    const alt = node.attrs?.alt || "";
    let src = node.attrs?.src || "";

    // Eğer src bir URL nesnesi ise, düzgün bir şekilde dönüştür
    try {
      // URL'yi düzgün bir şekilde işle
      if (src.includes("blob:") || src.includes("#temp-")) {
        console.warn("Geçici resim URL bulundu:", src);
        // Geçici URL'leri işleme - bunlar zaten CDN'e yüklenmiş olmalı
        // Geçici URL'yi olduğu gibi bırak, uploadTemporaryImages tarafından düzeltilecek
        // Bu sayede edit-post API'si tarafında da işlenebilir
      }
    } catch (error) {
      console.error("Resim URL işleme hatası:", error);
    }

    return `![${alt}](${src})`;
  }

  function processYoutubeVideo(node: any): string {
    const src = node.attrs?.src || "";

    // YouTube URL'sinden video ID'sini çıkar
    let videoId = "";

    try {
      if (src.includes("youtube.com/embed/")) {
        videoId = src.split("youtube.com/embed/")[1].split("?")[0];
      } else if (src.includes("youtube.com/watch")) {
        const url = new URL(src);
        videoId = url.searchParams.get("v") || "";
      } else if (src.includes("youtu.be/")) {
        videoId = src.split("youtu.be/")[1].split("?")[0];
      }
    } catch (error) {
      console.error("YouTube URL işleme hatası:", error);
    }

    console.log("Video ID:", videoId);

    // iframe kullanmadan sadece data-youtube-video özniteliği ile video ID'sini ekle
    // Öznitelikler arasında boşluk bırak
    return `<div data-youtube-video="${videoId}" class="aspect-video rounded-xl overflow-hidden"></div>`;
  }

  function processTextNode(node: any): string {
    if (!node) return "";

    if (node.type === "text") {
      let text = node.text || "";

      // Metin biçimlendirmelerini uygula
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case "bold":
              text = `**${text}**`;
              break;
            case "italic":
              text = `*${text}*`;
              break;
            case "strike":
              text = `~~${text}~~`;
              break;
            case "code":
              text = `\`${text}\``;
              break;
            case "link":
              text = `[${text}](${mark.attrs?.href || ""})`;
              break;
            case "highlight":
              // Markdown'da highlight için standart bir sözdizimi yok, HTML kullanabiliriz
              const color =
                mark.attrs?.color || "var(--tt-color-highlight-yellow)";
              text = `<mark style="background-color:${color}">${text}</mark>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "superscript":
              text = `<sup>${text}</sup>`;
              break;
            case "subscript":
              text = `<sub>${text}</sub>`;
              break;
          }
        });
      }

      return text;
    }

    if (node.content) {
      return node.content.map(processTextNode).join("");
    }

    return "";
  }

  useEffect(() => {
    isSaveBtn.set({
      isView: true,
      handleSave,
      isSaving,
      editorContent,
      title,
      saveStatus,
    });
  }, [editorContent, title, isSaving, saveStatus]);

  return (
    <div className="editor-container">
      <h1 className="text-2xl font-bold mb-4 text-center">Gönderi Düzenle</h1>
      <SimpleEditor
        onUpdate={setEditorContent}
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        coverImage={coverImage}
        onCoverImageChange={handleCoverImageChange}
        onCategoriesChange={setSelectedCategories}
        selectedCategories={selectedCategories}
        initialContent={initialEditorContent}
        initialCoverImageUrl={existingImageUrl}
      />

      <style>{`
      body { 
        overflow-x: hidden;
      }
        .editor-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          padding: 20px;
        }
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 10px;
          border-bottom: 1px solid #eaeaea;
          margin-bottom: 10px;
        }
        .editor-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
          margin-right: 16px;
        }
        .editor-field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-label {
          font-size: 14px;
          font-weight: 500;
          color: #555;
        }
        .editor-title,
        .editor-description,
        .editor-tags {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .editor-title {
          font-weight: 600;
          font-size: 16px;
        }
        .editor-title::placeholder {
          color: #999;
        }
        .save-button {
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          background-color: #0070f3;
          color: white;
          border: none;
          transition: all 0.2s ease;
          align-self: flex-start;
          white-space: nowrap;
        }
        .save-button:hover:not(:disabled) {
          background-color: #0051a8;
        }
        .save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .save-button.saving {
          background-color: #f5a623;
        }
        .save-button.success {
          background-color: #28a745;
        }
        .save-button.error {
          background-color: #dc3545;
        }
        
        /* Kapak resmi stilleri */
        .cover-image-section {
          margin-top: 8px;
        }
        .cover-image-button {
          padding: 8px 12px;
          background-color: #f0f0f0;
          border: 1px dashed #ccc;
          border-radius: 4px;
          cursor: pointer;
          color: #555;
          width: 100%;
          text-align: center;
          transition: all 0.2s ease;
        }
        .cover-image-button:hover {
          background-color: #e0e0e0;
          border-color: #999;
        }
        .cover-image-preview-container {
          position: relative;
          margin-top: 8px;
          border-radius: 4px;
          overflow: hidden;
          max-height: 200px;
        }
        .cover-image-preview {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 4px;
        }
        .remove-cover-image {
          position: absolute;
          top: 5px;
          right: 5px;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        .remove-cover-image:hover {
          background-color: rgba(0, 0, 0, 0.7);
        }
        
        @media (max-width: 768px) {
          .editor-header {
            flex-direction: column;
            gap: 10px;
          }
          .editor-fields {
            margin-right: 0;
            width: 100%;
          }
          .save-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
