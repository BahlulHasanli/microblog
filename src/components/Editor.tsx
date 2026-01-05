import { useState, useRef, useEffect } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { isSaveBtn } from "@/store/buttonStore";
import { uploadTemporaryImages } from "@/lib/tiptap-utils";
import { slugify } from "../utils/slugify";
import { generateBlurhashFromFile } from "@/utils/blurhash";

export default function Editor({ author }: any) {
  const [editorContent, setEditorContent] = useState(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    window._currentEditorTitle = title;
  }, [title]);

  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [coverImageBlurhash, setCoverImageBlurhash] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Musiqi state-ləri
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioArtist, setAudioArtist] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleCoverImageChange = async (file: File | null) => {
    setCoverImage(file);
    if (!file) {
      setCoverImagePreview("");
      setCoverImageBlurhash(null);
    } else {
      // Blurhash generasiya et (client-side)
      const blurhash = await generateBlurhashFromFile(file);
      setCoverImageBlurhash(blurhash);
      console.log("Blurhash generasiya edildi:", blurhash);
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

    if (selectedCategories.length === 0) {
      console.error("Ən azı bir kateqoriya seçilməlidir");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    if (!coverImage) {
      console.error("Kapak şəkli zorunludur");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      console.log("Geçici resimler Bunny CDN'e yükleniyor...");

      const updatedContent = await uploadTemporaryImages(
        editorContent,
        (current, total) => {
          console.log(`Resim yükleniyor: ${current}/${total}`);
        }
      );

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
      formData.append("title", title);
      formData.append("author.fullname", author.fullname);
      formData.append("author.avatar", author.avatar);
      formData.append("author.username", author.username);
      formData.append("description", descriptionValue);
      formData.append("content", markdownContent);
      // Kategorileri ayrı-ayrı əlavə et
      selectedCategories.forEach((category) => {
        formData.append("categories", category);
      });

      // Kapak resmi varsa ekle
      if (coverImage) {
        console.log(
          "Kapak resmi yükleniyor:",
          coverImage.name,
          coverImage.type,
          coverImage.size
        );

        // Slug oluştur (başlıktan) - utils/slugify.ts kullanarak
        const slug = slugify(title);

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
          formData.append("image", `posts/${slug}/images/${imageFileName}`);
          formData.append("imageAlt", title);

          // Blurhash varsa əlavə et
          if (coverImageBlurhash) {
            formData.append("imageBlurhash", coverImageBlurhash);
            console.log("Blurhash FormData'ya eklendi:", coverImageBlurhash);
          }

          console.log("Resim FormData'ya eklendi, dosya adı:", imageFileName);
        } catch (error) {
          console.error("FormData'ya resim ekleme hatası:", error);
        }
      }

      // Musiqi faylı varsa əlavə et
      if (audioFile) {
        const slug = slugify(title);
        const audioFileName = `${slug}-audio.mp3`;
        const newAudioFile = new File([audioFile], audioFileName, {
          type: audioFile.type,
        });
        formData.append("audioFile", newAudioFile);
        formData.append("audioTitle", audioTitle || title);
        formData.append("audioArtist", audioArtist || author.fullname);
        console.log("Musiqi faylı FormData'ya əlavə edildi:", audioFileName);
      }

      // API'ye istek gönder
      const response = await fetch("/api/create-post", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kaydetme işlemi başarısız oldu");
      }

      // Başarılı kaydetme
      console.log("Post başarıyla kaydedildi");

      setSaveStatus("success");

      // Bildiriş göstər
      if (typeof window !== "undefined") {
        // Animasiya stilləri əlavə et (bir dəfə)
        if (!document.getElementById("notification-styles")) {
          const style = document.createElement("style");
          style.id = "notification-styles";
          style.innerHTML = `
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateX(100%);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            @keyframes slideOut {
              from {
                opacity: 1;
                transform: translateX(0);
              }
              to {
                opacity: 0;
                transform: translateX(100%);
              }
            }
          `;
          document.head.appendChild(style);
        }

        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
        notification.style.animation = "slideIn 0.3s ease-out";
        notification.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Post gözləmə rejimində yadda saxlanıldı</span>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.style.animation = "slideOut 0.3s ease-in forwards";
          setTimeout(() => {
            notification.remove();
          }, 300);
        }, 3000);
      }

      setTimeout(() => {
        setSaveStatus("idle");
        // Başarılı kaydetme sonrası gönderi sayfasına yönlendir
        window.location.href = `/posts/${data.slug}`;
      }, 2000);
    } catch (error) {
      console.error("Kaydetme hatası:", error);
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
      case "rating":
        return processRating(node) + "\n\n";
      default:
        if (node.content) {
          return node.content.map(processNode).join("");
        }
        return "";
    }
  }

  function processParagraph(node: any): string {
    if (!node.content) return "";
    return node.content.map(processTextNode).join("");
  }

  function processHeading(node: any): string {
    if (!node.content) return "";
    const level = node.attrs?.level || 1;
    const prefix = "#".repeat(level) + " ";
    return prefix + node.content.map(processTextNode).join("");
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
        // Bu durumda boş bir string döndürüyoruz, çünkü bu resimler uploadTemporaryImages tarafından düzeltilecek
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

    // iframe kullanmadan sadece data-youtube-video özniteliği ile video ID'sini ekle
    return `<div data-youtube-video="${videoId}" class="aspect-video rounded-xl overflow-hidden"></div>`;
  }

  function processRating(node: any): string {
    const score = node.attrs?.score || 0;
    return `<Rating score="${score}" />`;
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
              const color = mark.attrs?.color || "yellow";
              text = `<mark style="background-color:${color}">${text}</mark>`;
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
      isDisabled:
        !title ||
        !editorContent ||
        selectedCategories.length === 0 ||
        !coverImage,
    });
  }, [
    editorContent,
    title,
    isSaving,
    saveStatus,
    selectedCategories,
    coverImage,
  ]);

  return (
    <div className="editor-container">
      <SimpleEditor
        onUpdate={setEditorContent}
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        coverImage={coverImage}
        onCoverImageChange={handleCoverImageChange}
        onCategoriesChange={setSelectedCategories}
        audioFile={audioFile}
        onAudioFileChange={setAudioFile}
        audioTitle={audioTitle}
        onAudioTitleChange={setAudioTitle}
        audioArtist={audioArtist}
        onAudioArtistChange={setAudioArtist}
      />

      <style>{`
      body {
        overflow-x: hidden;
      }
        .editor-container {
          display: flex;
          flex-direction: column;
          width: 100%;
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
