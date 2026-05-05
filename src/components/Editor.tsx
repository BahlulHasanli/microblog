import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  SimpleEditor,
  type SimpleEditorAuthor,
} from "@/components/tiptap-templates/simple/simple-editor";
import { isSaveBtn } from "@/store/buttonStore";
import { uploadTemporaryImages } from "@/lib/tiptap-utils";
import { slugify } from "../utils/slugify";
import { generateBlurhashFromFile } from "@/utils/blurhash";
import EditorActionButtons from "@/components/EditorActionButtons";

declare global {
  interface Window {
    _currentEditorTitle?: string;
  }
}

type SaveStatus = "idle" | "saving" | "success" | "error";

type EditorJSONNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: EditorJSONNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

type EditorJSON = {
  type: string;
  content?: EditorJSONNode[];
};

interface EditorProps {
  author: SimpleEditorAuthor & {
    fullname?: string;
    username?: string;
    avatar?: string;
  };
}

// Markdown conversion helpers (modul scope-da saxlanır ki, hər render-də yenidən
// yaradılmasın)
function processTextNode(node: EditorJSONNode): string {
  if (!node) return "";

  if (node.type === "text") {
    let text = node.text ?? "";
    if (node.marks) {
      node.marks.forEach((mark) => {
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
            text = `[${text}](${
              (mark.attrs?.href as string | undefined) ?? ""
            })`;
            break;
          case "highlight": {
            const color = (mark.attrs?.color as string | undefined) ?? "yellow";
            text = `<mark style="background-color:${color}">${text}</mark>`;
            break;
          }
          default:
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

function processParagraph(node: EditorJSONNode): string {
  if (!node.content) return "";
  return node.content.map(processTextNode).join("");
}

function processHeading(node: EditorJSONNode): string {
  if (!node.content) return "";
  const level = Math.min((node.attrs?.level as number | undefined) ?? 1, 6);
  const prefix = "#".repeat(level) + " ";
  return prefix + node.content.map(processTextNode).join("");
}

function processBulletList(node: EditorJSONNode): string {
  if (!node.content) return "";
  return node.content
    .map((item) => {
      if (item.type === "listItem" && item.content) {
        return "- " + item.content.map(processNode).join("").trim();
      }
      return "";
    })
    .join("\n");
}

function processOrderedList(node: EditorJSONNode): string {
  if (!node.content) return "";
  return node.content
    .map((item, index) => {
      if (item.type === "listItem" && item.content) {
        return `${index + 1}. ` + item.content.map(processNode).join("").trim();
      }
      return "";
    })
    .join("\n");
}

function processTaskList(node: EditorJSONNode): string {
  if (!node.content) return "";
  return node.content
    .map((item) => {
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

function processBlockquote(node: EditorJSONNode): string {
  if (!node.content) return "";
  return "> " + node.content.map(processNode).join("").replace(/\n/g, "\n> ");
}

function processCodeBlock(node: EditorJSONNode): string {
  if (!node.content) return "";
  const language = (node.attrs?.language as string | undefined) ?? "";
  const code = node.content.map((n) => n.text ?? "").join("");
  return "```" + language + "\n" + code + "\n```";
}

function processImage(node: EditorJSONNode): string {
  const alt = (node.attrs?.alt as string | undefined) ?? "";
  const src = (node.attrs?.src as string | undefined) ?? "";

  if (src.includes("blob:") || src.includes("#temp-")) {
    console.warn("Geçici resim URL bulundu:", src);
  }
  // Markdown sintaksisini qorumaq üçün alt mətnindən mötərizələri təmizlə
  const cleanAlt = alt.replace(/[\[\]]/g, "");
  return `![${cleanAlt}](${src})`;
}

function processYoutubeVideo(node: EditorJSONNode): string {
  const src = (node.attrs?.src as string | undefined) ?? "";
  let videoId = "";

  try {
    if (src.includes("youtube.com/embed/")) {
      videoId = src.split("youtube.com/embed/")[1].split("?")[0];
    } else if (src.includes("youtube.com/watch")) {
      const url = new URL(src);
      videoId = url.searchParams.get("v") ?? "";
    } else if (src.includes("youtu.be/")) {
      videoId = src.split("youtu.be/")[1].split("?")[0];
    }
  } catch (error) {
    console.error("YouTube URL işleme hatası:", error);
  }

  return `<div data-youtube-video="${videoId}" class="aspect-video rounded-xl overflow-hidden"></div>`;
}

function processRating(node: EditorJSONNode): string {
  const score = (node.attrs?.score as number | undefined) ?? 0;
  return `<Rating score="${score}" />`;
}

function processNode(node: EditorJSONNode): string {
  if (!node) return "";

  switch (node.type) {
    case "title":
      return (
        "# " +
        (node.content ? node.content.map(processTextNode).join("") : "") +
        "\n\n"
      );
    case "description":
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

function convertJsonToMarkdown(json: EditorJSON | null | undefined): string {
  if (!json || !json.content || json.content.length === 0) return "";

  let markdown = "";
  let foundHeading = false;
  let foundParagraph = false;

  if (json.content.length <= 2) {
    const hasHeading = json.content.some((node) => node.type === "heading");
    const hasParagraph = json.content.some((node) => node.type === "paragraph");
    if (hasHeading && hasParagraph) {
      return " ";
    }
  }

  json.content.forEach((node) => {
    if (node.type === "heading" && !foundHeading) {
      foundHeading = true;
      return;
    }
    if (node.type === "paragraph" && !foundParagraph) {
      foundParagraph = true;
      return;
    }
    markdown += processNode(node);
  });

  return markdown || " ";
}

function showSuccessNotification(message: string) {
  if (typeof window === "undefined") return;

  if (!document.getElementById("editor-notification-styles")) {
    const style = document.createElement("style");
    style.id = "editor-notification-styles";
    style.innerHTML = `
      @keyframes editor-slide-in {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes editor-slide-out {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
      }
      .editor-toast {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background-color: #2563eb;
        color: #ffffff;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: editor-slide-in 0.3s ease-out;
      }
      .editor-toast.leaving {
        animation: editor-slide-out 0.3s ease-in forwards;
      }
    `;
    document.head.appendChild(style);
  }

  const notification = document.createElement("div");
  notification.className = "editor-toast";
  notification.setAttribute("role", "status");
  notification.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;">
      <svg style="width:1.25rem;height:1.25rem;" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>
      <span></span>
    </div>
  `;
  const span = notification.querySelector("span");
  if (span) span.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("leaving");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

export default function Editor({ author }: EditorProps) {
  const [editorContent, setEditorContent] = useState<EditorJSON | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [coverImageBlurhash, setCoverImageBlurhash] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioArtist, setAudioArtist] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Stale closure-dən qoruyan ref-lər
  const coverImagePreviewRef = useRef<string>("");
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    coverImagePreviewRef.current = coverImagePreview;
  }, [coverImagePreview]);

  useEffect(() => {
    window._currentEditorTitle = title;
  }, [title]);

  useEffect(() => {
    return () => {
      if (
        coverImagePreviewRef.current &&
        coverImagePreviewRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(coverImagePreviewRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      delete window._currentEditorTitle;
    };
  }, []);

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setSaveStatus("error");
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setSaveStatus("idle");
      setErrorMessage(null);
      errorTimeoutRef.current = null;
    }, 4000);
  }, []);

  const handleCoverImageChange = useCallback(async (file: File | null) => {
    setCoverImage(file);

    if (!file) {
      setCoverImagePreview((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return "";
      });
      setCoverImageBlurhash(null);
      return;
    }

    // Yeni preview üçün blob URL yarat və köhnəni təmizlə
    setCoverImagePreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });

    try {
      const blurhash = await generateBlurhashFromFile(file);
      setCoverImageBlurhash(blurhash);
    } catch (error) {
      console.warn("Blurhash generasiya edilə bilmədi:", error);
      setCoverImageBlurhash(null);
    }
  }, []);

  const performSave = useCallback(
    async (asDraft: boolean) => {
    setErrorMessage(null);

    if (!asDraft) {
      if (!title.trim()) {
        setError("Başlıq sahəsi mütləqdir");
        return;
      }

      if (!editorContent) {
        setError("Məzmun sahəsi mütləqdir");
        return;
      }

      if (selectedCategories.length === 0) {
        setError("Ən azı bir bölmə seçilməlidir");
        return;
      }

      if (!coverImage) {
        setError("Örtük şəkli mütləqdir");
        return;
      }
    } else if (!title.trim() && !editorContent) {
      setError("Qaralama üçün ən azı başlıq və ya məzmun əlavə edin");
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const docForUpload = (editorContent ?? {
        type: "doc",
        content: [{ type: "paragraph" }],
      }) as EditorJSON;

      const updatedContent = (await uploadTemporaryImages(
        docForUpload,
        (current, total) => {
          console.log(`Resim yükleniyor: ${current}/${total}`);
        },
      )) as EditorJSON;

      const markdownContent = convertJsonToMarkdown(updatedContent);

      let descriptionValue = description;
      if (
        updatedContent &&
        updatedContent.content &&
        updatedContent.content.length >= 2
      ) {
        const descNode = updatedContent.content[1];
        if (descNode && descNode.type === "description" && descNode.content) {
          const descText = descNode.content
            .filter((item) => item.type === "text")
            .map((item) => item.text ?? "")
            .join("");

          if (descText && descText.trim() !== "") {
            descriptionValue = descText;
            setDescription(descText);
          }
        }
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("author.fullname", author?.fullname ?? "");
      formData.append("author.avatar", author?.avatar ?? "");
      formData.append("author.username", author?.username ?? "");
      formData.append("description", descriptionValue);
      formData.append("content", markdownContent);
      formData.append("isDraft", asDraft ? "true" : "false");
      selectedCategories.forEach((category) => {
        formData.append("categories", category);
      });

      const slug = slugify(title.trim() || "qaralama");

      if (coverImage) {
        // Cover fayl adı server tərəfdə `{slug}-cover-{randomId}` kimi verilir (create-post → edit ilə eyni).
        formData.append("uploadedImage", coverImage);
        formData.append("imageAlt", title);
        if (coverImageBlurhash) {
          formData.append("imageBlurhash", coverImageBlurhash);
        }
      }

      if (audioFile) {
        const audioFileName = `${slug}-audio.mp3`;
        const newAudioFile = new File([audioFile], audioFileName, {
          type: audioFile.type,
        });
        formData.append("audioFile", newAudioFile);
        formData.append("audioTitle", audioTitle || title);
        formData.append("audioArtist", audioArtist || author?.fullname || "");
      }

      const response = await fetch("/api/create-post", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Yaddaşa yazma əməliyyatı uğursuz oldu");
      }

      setSaveStatus("success");
      showSuccessNotification(
        asDraft
          ? "Qaralama yadda saxlanıldı"
          : "Post gözləmə rejimində yadda saxlanıldı",
      );

      setTimeout(() => {
        setSaveStatus("idle");
        if (data.slug) {
          window.location.href = asDraft
            ? `/edit-post/${data.slug}`
            : `/posts/${data.slug}`;
        }
      }, asDraft ? 800 : 2000);
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Yaddaşa yazma xətası";
      console.error("Yaddaşa yazma xətası:", error);
      setError(errMsg);
    } finally {
      setIsSaving(false);
    }
  },
    [
      title,
      editorContent,
      selectedCategories,
      coverImage,
      coverImageBlurhash,
      description,
      audioFile,
      audioTitle,
      audioArtist,
      author,
      setError,
    ],
  );

  const handleSave = useCallback(() => performSave(false), [performSave]);
  const handleSaveDraft = useCallback(() => performSave(true), [performSave]);

  useEffect(() => {
    isSaveBtn.set({
      isView: true,
      handleSave,
      handleSaveDraft,
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
    handleSave,
    handleSaveDraft,
    editorContent,
    title,
    isSaving,
    saveStatus,
    selectedCategories,
    coverImage,
  ]);

  // Komponent sökülərkən saxla butonunu gizlət
  useEffect(() => {
    return () => {
      isSaveBtn.set({
        isView: false,
        handleSave: null,
        handleSaveDraft: null,
        isSaving: false,
        editorContent: null,
        title: "",
        saveStatus: "idle",
        isDisabled: false,
      });
    };
  }, []);

  const previewData = useMemo(
    () => ({
      title,
      description,
      content: editorContent,
      coverImageUrl: coverImagePreview,
      categories: selectedCategories,
    }),
    [title, description, editorContent, coverImagePreview, selectedCategories],
  );

  return (
    <div className="editor-container">
      <SimpleEditor
        onUpdate={(content) => setEditorContent(content as EditorJSON)}
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        coverImage={coverImage}
        onCoverImageChange={handleCoverImageChange}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        audioFile={audioFile}
        onAudioFileChange={setAudioFile}
        audioTitle={audioTitle}
        onAudioTitleChange={setAudioTitle}
        audioArtist={audioArtist}
        onAudioArtistChange={setAudioArtist}
        author={author}
      />

      <EditorActionButtons previewData={previewData} />

      {errorMessage && (
        <div className="editor-error-banner" role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <style>{`
        body {
          overflow-x: hidden;
        }
        .editor-container {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .editor-error-banner {
          position: fixed;
          left: 50%;
          bottom: 5.5rem;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.06);
          z-index: 110;
          max-width: calc(100vw - 2rem);
        }
        .editor-error-banner svg {
          width: 1.125rem;
          height: 1.125rem;
          flex-shrink: 0;
        }
        :global(.dark) .editor-error-banner {
          background-color: rgba(127, 29, 29, 0.25);
          color: #fecaca;
          border-color: rgba(127, 29, 29, 0.6);
        }
        @media (max-width: 480px) {
          .editor-error-banner {
            bottom: 7.5rem;
          }
        }
      `}</style>
    </div>
  );
}
