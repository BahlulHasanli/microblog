import * as React from "react";
import { EditorContent, EditorContext, useEditor, Node } from "@tiptap/react";
import { ChangeEvent, useRef } from "react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection, Placeholder, Focus } from "@tiptap/extensions";
// import Youtube from "@tiptap/extension-youtube";
import { YoutubeNode } from "@/components/tiptap-node/youtube-node/youtube-node-extension";
import { Rating } from "@/components/tiptap-node/rating-node/rating";

import { Document } from "@tiptap/extension-document";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "@/components/tiptap-node/rating-node/rating-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import { RatingButton } from "@/components/tiptap-ui/rating-button";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

import { supabase } from "@/db/supabase";

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  editor,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
  editor: any;
}) => {
  // Resim ekleme pozisyonu kontrolü için ayrı effect
  React.useEffect(() => {
    // Editor null ise işlem yapma
    if (!editor) return;

    const handleBeforeCreate = () => {};

    // Image upload button click handler
    const imageButton = document.querySelector(
      '[data-testid="image-upload-button"]'
    );
    if (imageButton) {
      imageButton.addEventListener("click", handleBeforeCreate);
    }

    return () => {
      if (imageButton) {
        imageButton.removeEventListener("click", handleBeforeCreate);
      }
    };
  }, [editor]);

  const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
      return null;
    }

    const addYoutubeVideo = () => {
      try {
        const url = prompt("YouTube URL'sini girin");

        if (url) {
          console.log("YouTube video ekleme deneniyor:", url);

          // Komutu çağır
          const result = editor.commands.setYoutubeVideo({
            src: url,
            width: "100%",
            height: "260",
          });

          console.log("YouTube video ekleme sonucu:", result);
        }
      } catch (error) {
        console.error("YouTube video ekleme hatası:", error);
        alert(
          "YouTube video eklenirken bir hata oluştu. Lütfen konsolu kontrol edin."
        );
      }
    };

    return (
      <Button
        onClick={addYoutubeVideo}
        type="button"
        data-style="ghost"
        role="button"
        tabIndex={-1}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="tiptap-button-icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        YouTube
      </Button>
    );
  };

  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Şəkil" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <RatingButton editor={editor} />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MenuBar editor={editor} />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      {/* <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup> */}
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

interface SimpleEditorProps {
  onUpdate?: (content: any) => void;
  title?: string;
  description?: string;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  coverImage?: File | null;
  onCoverImageChange?: (file: File | null, clearExisting?: boolean) => void;
  onCategoriesChange?: (categories: string[]) => void;
  initialContent?: string;
  initialCoverImageUrl?: string;
  selectedCategories?: string[];
  // Musiqi props
  audioFile?: File | null;
  onAudioFileChange?: (file: File | null) => void;
  audioTitle?: string;
  onAudioTitleChange?: (title: string) => void;
  audioArtist?: string;
  onAudioArtistChange?: (artist: string) => void;
  initialAudioUrl?: string;
  onAudioRemove?: () => void;
}

export function SimpleEditor({
  onUpdate,
  title = "",
  description = "",
  onTitleChange,
  onDescriptionChange,
  coverImage = null,
  onCoverImageChange,
  onCategoriesChange,
  initialContent,
  initialCoverImageUrl,
  selectedCategories = [],
  // Musiqi props
  audioFile = null,
  onAudioFileChange,
  audioTitle = "",
  onAudioTitleChange,
  audioArtist = "",
  onAudioArtistChange,
  initialAudioUrl = "",
  onAudioRemove,
}: SimpleEditorProps) {
  const isMobile = useIsMobile();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [coverImagePreview, setCoverImagePreview] = React.useState<string>(
    initialCoverImageUrl || ""
  );
  const [categories, setCategories] = React.useState<string[]>(
    selectedCategories || []
  );
  const [supabaseCategories, setSupabaseCategories] = React.useState<
    { slug: string; name: string }[]
  >([]);
  const [localAudioFile, setLocalAudioFile] = React.useState<File | null>(
    audioFile
  );
  const [localAudioTitle, setLocalAudioTitle] = React.useState(audioTitle);
  const [localAudioArtist, setLocalAudioArtist] = React.useState(audioArtist);
  const [existingAudioUrl, setExistingAudioUrl] =
    React.useState(initialAudioUrl);

  // Supabase-dən kategoriyaları çək
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase.from("categories").select("slug, name");
        if (data) setSupabaseCategories(data);
      } catch (error) {
        console.warn("Kategoriyalar çəkilərkən xəta:", error);
      }
    };
    fetchCategories();
  }, []);

  const FixedDocument = Document.extend({
    content: "heading paragraph block*",
  });

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      FixedDocument,
      YoutubeNode.configure({
        controls: false,
        nocookie: true,
        HTMLAttributes: {
          class: "aspect-video rounded-xl overflow-hidden",
        },
      }),
      StarterKit.configure({
        document: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      Focus.configure({
        className: "has-focus",
        mode: "all",
      }),
      Placeholder.configure({
        showOnlyCurrent: false,
        placeholder: ({ node, pos, editor }) => {
          const nodes = editor?.state.doc.content.content || [];

          if (node.type.name === "heading") {
            // Yalnız ilk başlığa "Başlıq" placeholder ver
            const firstHeadingIndex = nodes.findIndex(
              (n) => n.type.name === "heading"
            );
            const currentIndex = nodes.findIndex((n) => n === node);

            if (firstHeadingIndex === currentIndex) {
              return "Başlıq";
            }
          }

          if (node.type.name === "paragraph") {
            const firstParagraphIndex = nodes.findIndex(
              (n) => n.type.name === "paragraph"
            );
            const currentIndex = nodes.findIndex((n) => n === node);

            if (firstParagraphIndex === currentIndex) {
              return "Açıqlama";
            }
          }

          return "";
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      Rating,
    ],
    autofocus: true,
    content: initialContent || {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: {
            level: 1,
          },
          content: title ? [{ type: "text", text: title }] : undefined,
        },
        {
          type: "paragraph",
          content: description
            ? [{ type: "text", text: description }]
            : undefined,
        },
      ],
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getJSON());
      }
    },
    // onTransaction artıq lazım deyil - şəkillər save zamanı yüklənir
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  // Başlık ve açıklama değerlerini izlemek için bir useEffect kullanıyoruz
  React.useEffect(() => {
    if (!editor) return;

    // Başlık ve açıklama değerlerini izlemek için bir işlev
    const updateTitleAndDescription = () => {
      try {
        const content = editor.getJSON().content;

        if (!content || content.length === 0) return;

        // Başlık değerini al
        const headingNode = content.find((node) => node.type === "heading");
        if (headingNode?.content && onTitleChange) {
          const headingText = headingNode.content
            .filter((item) => item.type === "text")
            .map((item) => ("text" in item ? item.text : ""))
            .join("");

          if (headingText && headingText !== title) {
            onTitleChange(headingText);
          }
        }

        // Açıklama değerini al
        const paragraphNode = content.find((node) => node.type === "paragraph");
        if (paragraphNode?.content && onDescriptionChange) {
          const paragraphText = paragraphNode.content
            .filter((item) => item.type === "text")
            .map((item) => ("text" in item ? item.text : ""))
            .join("");

          if (paragraphText && paragraphText !== description) {
            onDescriptionChange(paragraphText);
          }
        }
      } catch (error) {
        console.error("Editör içeriği güncellenirken hata oluştu:", error);
      }
    };

    // Editör içeriği değiştiğinde başlık ve açıklama değerlerini güncelle
    editor.on("update", updateTitleAndDescription);

    // Temizleme işlevi
    return () => {
      editor.off("update", updateTitleAndDescription);
    };
  }, [editor, onTitleChange, onDescriptionChange, title, description]);

  // initialContent yalnız ilk dəfə set olunmalıdır
  const [isInitialContentSet, setIsInitialContentSet] = React.useState(false);

  React.useEffect(() => {
    if (!editor || !initialContent || isInitialContentSet) return;

    // Editör içeriğini yalnız bir dəfə güncelle
    try {
      editor.commands.setContent(initialContent);
      setIsInitialContentSet(true);
      console.log("Editör içeriği ilk dəfə set olundu", initialContent);
    } catch (error) {
      console.error("Editör içeriği güncellenirken hata oluştu:", error);
    }
  }, [editor, initialContent, isInitialContentSet]);

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  // Kapak resmi işlemleri
  React.useEffect(() => {
    // Eğer dışarıdan bir coverImage gelirse, önizlemeyi güncelle
    if (coverImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(coverImage);
    } else if (initialCoverImageUrl) {
      // Eğer mevcut bir kapağımız varsa onu kullan
      setCoverImagePreview(initialCoverImageUrl);
    } else {
      setCoverImagePreview("");
    }
  }, [coverImage, initialCoverImageUrl]);

  // Kategoriler değiştiğinde dışarıya bildir
  React.useEffect(() => {
    if (onCategoriesChange) {
      onCategoriesChange(categories);
    }
  }, [categories, onCategoriesChange]);

  // Kapak resmi yükleme işleyicisi
  const handleCoverImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onCoverImageChange) {
        onCoverImageChange(file);
      }

      // Resim önizlemesi oluştur
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Kapak resmi seçme dialogunu açma
  const handleSelectCoverImage = () => {
    fileInputRef.current?.click();
  };

  // Kapak resmini kaldırma
  const handleRemoveCoverImage = () => {
    // Cover image silmə - clearExisting=true ilə çağır ki, köhnə URL sıfırlansın
    if (onCoverImageChange) {
      onCoverImageChange(null, true);
    }
    setCoverImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Kategori seçme/kaldırma işleyicisi
  const handleCategoryToggle = (categoryId: string) => {
    setCategories((prev) => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId];

      // Kategorileri dışarıya bildir
      if (onCategoriesChange) {
        onCategoriesChange(newCategories);
      }

      return newCategories;
    });
  };

  // Musiqi faylı seçmə
  const handleAudioFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log(
      "SimpleEditor: Audio fayl seçildi:",
      file?.name,
      file?.type,
      file?.size
    );
    console.log(
      "SimpleEditor: onAudioFileChange mövcuddur:",
      !!onAudioFileChange
    );
    if (file) {
      // MP3 faylları üçün tip yoxlaması (audio/mpeg, audio/mp3)
      const isAudio =
        file.type.startsWith("audio/") || file.name.endsWith(".mp3");
      console.log("SimpleEditor: isAudio:", isAudio);
      if (isAudio) {
        setLocalAudioFile(file);
        // Birbaşa window-a yaz
        (window as any)._currentAudioFile = file;
        console.log(
          "SimpleEditor: window._currentAudioFile yazıldı:",
          file.name
        );
        // Callback-i də çağır
        if (onAudioFileChange) {
          onAudioFileChange(file);
        }
      } else {
        console.warn("SimpleEditor: Seçilən fayl audio deyil:", file.type);
      }
    }
  };

  // Musiqi faylını silmə
  const handleRemoveAudio = () => {
    console.log("SimpleEditor: handleRemoveAudio çağırıldı");
    setLocalAudioFile(null);
    setLocalAudioTitle("");
    setLocalAudioArtist("");
    setExistingAudioUrl(""); // Mövcud URL-i də sıfırla
    // Window-a da yaz
    (window as any)._currentAudioFile = null;
    (window as any)._audioRemoved = true;
    if (onAudioFileChange) onAudioFileChange(null);
    if (onAudioTitleChange) onAudioTitleChange("");
    if (onAudioArtistChange) onAudioArtistChange("");
    if (onAudioRemove) onAudioRemove(); // Silmə callback-ini çağır
    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  };

  // Musiqi başlığı dəyişikliyi
  const handleAudioTitleChange = (value: string) => {
    setLocalAudioTitle(value);
    if (onAudioTitleChange) onAudioTitleChange(value);
  };

  // Musiqi artist dəyişikliyi
  const handleAudioArtistChange = (value: string) => {
    setLocalAudioArtist(value);
    if (onAudioArtistChange) onAudioArtistChange(value);
  };

  return (
    <>
      <div className="simple-editor-wrapper mt-8">
        <EditorContext.Provider value={{ editor }}>
          <Toolbar
            ref={toolbarRef}
            style={{
              ...(isMobile
                ? {
                    bottom: `calc(100% - ${height - rect.y}px)`,
                  }
                : {}),
            }}
          >
            {mobileView === "main" ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                isMobile={isMobile}
                editor={editor}
              />
            ) : (
              <MobileToolbarContent
                type={mobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>

          <div className="simple-editor-content">
            {/* Kategoriler Bölümü */}
            <div className="categories-container mt-8 mb-5">
              <div className="flex flex-wrap gap-2">
                {supabaseCategories.map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    className={`cursor-pointer px-3 py-1 rounded-full text-sm bg-neutral-100 transition-all font-medium hover:bg-neutral-200 hover:text-base-800 ${
                      categories.includes(category.slug)
                        ? "bg-rose-500 text-white"
                        : ""
                    }`}
                    onClick={() => handleCategoryToggle(category.slug)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Kapak resmi alanı */}
            <div className="editor-cover-image-container">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCoverImageChange}
                accept="image/*"
                style={{ display: "none" }}
              />

              {!coverImagePreview ? (
                <button
                  type="button"
                  onClick={handleSelectCoverImage}
                  className="cover-image-button font-medium font-display flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-6 stroke-rose-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                  </svg>
                  Örtük şəkli əlavə et
                </button>
              ) : (
                <div className="cover-image-preview-container">
                  <img
                    src={coverImagePreview}
                    alt="Örtük şəkli önizləmə"
                    className="cover-image-preview"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCoverImage}
                    className="remove-cover-image"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Musiqi yükləmə sahəsi */}
            <div className="audio-upload-container mt-4 mb-4">
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioFileChange}
                accept=".mp3,audio/*"
                style={{ display: "none" }}
              />

              {!localAudioFile && !existingAudioUrl ? (
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="audio-upload-button font-medium font-display flex items-center gap-2 px-4 py-3 border-2 border-dashed border-zinc-300 rounded-xl hover:border-rose-400 hover:bg-rose-50 transition-all w-full justify-center text-zinc-500 hover:text-rose-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
                    />
                  </svg>
                  Musiqi əlavə et (MP3)
                </button>
              ) : existingAudioUrl && !localAudioFile ? (
                <div className="audio-preview-container p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-6 text-rose-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-700 truncate mb-2">
                        Mövcud musiqi
                      </p>
                      <p className="text-xs text-zinc-400 mb-3 truncate">
                        {existingAudioUrl.split("/").pop()}
                      </p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Mahnı adı"
                          value={localAudioTitle}
                          onChange={(e) =>
                            handleAudioTitleChange(e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="İfaçı adı"
                          value={localAudioArtist}
                          onChange={(e) =>
                            handleAudioArtistChange(e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="mt-3 text-xs text-rose-500 hover:text-rose-600 font-medium"
                      >
                        Yeni musiqi seç
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingAudioUrl("");
                        handleRemoveAudio();
                      }}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="audio-preview-container p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-6 text-rose-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-700 truncate mb-2">
                        {localAudioFile.name}
                      </p>
                      <p className="text-xs text-zinc-400 mb-3">
                        {(localAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Mahnı adı"
                          value={localAudioTitle}
                          onChange={(e) =>
                            handleAudioTitleChange(e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="İfaçı adı"
                          value={localAudioArtist}
                          onChange={(e) =>
                            handleAudioArtistChange(e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAudio}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <EditorContent
              editor={editor}
              role="presentation"
              className="tiptap-editor-content"
            />
          </div>
        </EditorContext.Provider>
      </div>
    </>
  );
}
