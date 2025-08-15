import { useState, useRef, ChangeEvent, useEffect } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { categories as CATEGORIES, slugifyCategory } from "@/data/categories";

export default function Editor() {
  const [editorContent, setEditorContent] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  // Kategori seçme/kaldırma işleyicisi
  const handleCategoryToggle = (categoryId: string) => {
    setCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Kapak resmi değişikliğini izleme
  const handleCoverImageChange = (file: File | null) => {
    setCoverImage(file);
    // Önizleme artık SimpleEditor içinde yapılıyor
    if (!file) {
      setCoverImagePreview("");
    }
  };

  const handleSave = async () => {
    if (!editorContent || !title) {
      console.error("Başlık ve içerik alanları zorunludur");
      setSaveStatus("error");

      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      // JSON içeriğini Markdown'a dönüştür
      const markdownContent = convertJsonToMarkdown(editorContent);

      // Editör içeriğinden description değerini kontrol et
      // Eğer description değeri boşsa ve editorContent içinde description düğümü varsa
      // description değerini editorContent'ten al
      let descriptionValue = description;
      if (
        editorContent &&
        editorContent.content &&
        editorContent.content.length >= 2
      ) {
        const descNode = editorContent.content[1];
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
      formData.append("description", descriptionValue);
      formData.append("content", markdownContent);
      formData.append("categories", categories.join(","));

      // Kapak resmi varsa ekle
      if (coverImage) {
        console.log(
          "Kapak resmi yükleniyor:",
          coverImage.name,
          coverImage.type,
          coverImage.size
        );

        // Slug oluştur (başlıktan)
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Dosya uzantısını al
        const fileExtension = coverImage.name.split(".").pop() || "jpg";

        // Resim adını oluştur: slug.extension
        const imageFileName = `${slug}.${fileExtension}`;
        console.log("Oluşturulan resim dosya adı:", imageFileName);

        try {
          // Resim dosyasını FormData'ya ekle
          // Dosya adını belirterek yükleme
          const newFile = new File([coverImage], imageFileName, {
            type: coverImage.type,
          });
          formData.append("uploadedImage", newFile);
          formData.append("image", `/images/posts/${imageFileName}`);
          formData.append("imageAlt", title);
          console.log("Resim FormData'ya eklendi, dosya adı:", imageFileName);
        } catch (error) {
          console.error("FormData'ya resim ekleme hatası:", error);
        }
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

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
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
    let markdown = "";

    // İçeriği işle
    if (json.content) {
      json.content.forEach((node: any) => {
        markdown += processNode(node);
      });
    }

    return markdown;
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
    const src = node.attrs?.src || "";
    return `![${alt}](${src})`;
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
    console.log(editorContent);
  }, [editorContent]);

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-fields">
          {/* Kategoriler Bölümü */}
          <div className="editor-field-group">
            <label className="field-label">Kateqoriyalar:</label>
            <div className="categories-container">
              {CATEGORIES.map((category) => (
                <button
                  key={slugifyCategory(category)}
                  type="button"
                  className={`category-button ${
                    categories.includes(slugifyCategory(category))
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleCategoryToggle(slugifyCategory(category))
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !editorContent || !title}
          className={`save-button ${saveStatus}`}
        >
          {saveStatus === "saving"
            ? "Yadda saxlanılır..."
            : saveStatus === "success"
            ? "Yadda saxlanıldı!"
            : saveStatus === "error"
            ? "Xəta!"
            : "Yadda saxla"}
        </button>
      </div>
      <SimpleEditor
        onUpdate={setEditorContent}
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        coverImage={coverImage}
        onCoverImageChange={handleCoverImageChange}
      />

      <style>{`
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
        .categories-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .category-button {
          padding: 6px 12px;
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .category-button:hover {
          background-color: #e0e0e0;
        }
        .category-button.selected {
          background-color: #2563eb;
          color: white;
          border-color: #2563eb;
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
