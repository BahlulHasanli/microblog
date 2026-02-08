import * as React from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { ChangeEvent, useRef, useCallback } from "react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { ImageWithDelete } from "@/components/tiptap-node/image-node/image-with-delete";
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
import { AudioNode } from "@/components/tiptap-node/audio-node/audio-node-extension";
import { AudioUploadExtension } from "@/components/tiptap-node/audio-upload-node/audio-upload-node-extension";

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
import { GifButton } from "@/components/tiptap-ui/gif-button";
import { HorizontalRuleButton } from "@/components/tiptap-ui/horizontal-rule-button";
import { AudioUploadButton } from "@/components/tiptap-ui/audio-upload-button";

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
import { handleImageUpload, handleAudioUpload, MAX_FILE_SIZE, MAX_AUDIO_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

import { supabase } from "@/db/supabase";
import { AudioButton } from "@/components/tiptap-ui/audio-button";

// Global tip tanımlaması
declare global {
  interface Window {
    _currentAudioFile?: File | null;
    _audioRemoved?: boolean;
  }
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onAudioClick,
  hasAudio,
  isMobile,
  editor,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  onAudioClick: () => void;
  hasAudio: boolean;
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
        const url = prompt("YouTube URL");

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
        title="YouTube video əlavə et"
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
      </Button>
    );
  };

  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <BlockquoteButton />
        <CodeBlockButton />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="" />
        <GifButton />
        <MenuBar editor={editor} />
        <AudioButton onClick={onAudioClick} hasAudio={hasAudio} />
        <AudioUploadButton editor={editor} />
        <HorizontalRuleButton />
        <RatingButton editor={editor} />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}
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
  // Author info
  author?: {
    avatar?: string;
    avatar_url?: string;
    fullName?: string;
    full_name?: string;
    display_name?: string;
    fullname?: string;
    name?: string;
    username?: string;
    verified?: boolean;
    is_verified?: boolean;
  };
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
  // Author info
  author,
}: SimpleEditorProps) {
  const isMobile = useIsMobile();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = React.useState(false);
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [coverImagePreview, setCoverImagePreview] = React.useState<string>(
    initialCoverImageUrl || ""
  );
  const [coverImageCleared, setCoverImageCleared] = React.useState(false);
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

  // Komponent sökülməsində cleanup
  React.useEffect(() => {
    return () => {
      // Preview URL-ləri azad et (data URL-lər için lazım deyil, amma blob URL-lər varsa azad edilir)
      if (coverImagePreview && coverImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverImagePreview);
      }
      // Window global dəyişənlərini təmizlə
      delete window._currentAudioFile;
      delete window._audioRemoved;
    };
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
      ImageWithDelete,
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
      AudioNode,
      AudioUploadExtension.configure({
        limit: 1,
        maxSize: MAX_AUDIO_SIZE,
        accept: "audio/*",
        upload: handleAudioUpload,
        onError: (error) => console.error("Audio Upload failed:", error),
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
      // Yeni cover seçildi, cleared flag-i sıfırla
      setCoverImageCleared(false);
    } else if (initialCoverImageUrl && !coverImageCleared) {
      // Eğer mevcut bir kapağımız varsa ve silinmemişse onu kullan
      setCoverImagePreview(initialCoverImageUrl);
    } else {
      setCoverImagePreview("");
    }
  }, [coverImage, initialCoverImageUrl, coverImageCleared]);

  // Kategoriler değiştiğinde dışarıya bildir
  React.useEffect(() => {
    if (onCategoriesChange) {
      onCategoriesChange(categories);
    }
  }, [categories, onCategoriesChange]);

  // Kapak resmi yükleme işleyicisi
  const handleCoverImageChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
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
      // Input-u sıfırla ki, eyni faylı yenidən seçmək mümkün olsun
      e.target.value = "";
    },
    [onCoverImageChange]
  );

  // Kapak resmi seçme dialogunu açma
  const handleSelectCoverImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Kapak resmini kaldırma
  const handleRemoveCoverImage = useCallback(() => {
    // Cover image silmə - clearExisting=true ilə çağır ki, köhnə URL sıfırlansın
    if (onCoverImageChange) {
      onCoverImageChange(null, true);
    }
    setCoverImagePreview("");
    setCoverImageCleared(true); // İmage silinib işarəsi
    // Input-u tamamilə sıfırla
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onCoverImageChange]);

  // Kategori seçme/kaldırma işleyicisi
  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
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
    },
    [onCategoriesChange]
  );

  // Musiqi faylı seçmə
  const handleAudioFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
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
          window._currentAudioFile = file;
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
    },
    [onAudioFileChange]
  );

  // Musiqi faylını silmə
  const handleRemoveAudio = useCallback(() => {
    console.log("SimpleEditor: handleRemoveAudio çağırıldı");
    setLocalAudioFile(null);
    setLocalAudioTitle("");
    setLocalAudioArtist("");
    setExistingAudioUrl(""); // Mövcud URL-i də sıfırla
    // Window-a da yaz
    window._currentAudioFile = null;
    window._audioRemoved = true;
    if (onAudioFileChange) onAudioFileChange(null);
    if (onAudioTitleChange) onAudioTitleChange("");
    if (onAudioArtistChange) onAudioArtistChange("");
    if (onAudioRemove) onAudioRemove(); // Silmə callback-ini çağır
    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  }, [onAudioFileChange, onAudioTitleChange, onAudioArtistChange, onAudioRemove]);

  // Musiqi başlığı dəyişikliyi
  const handleAudioTitleChange = useCallback(
    (value: string) => {
      setLocalAudioTitle(value);
      if (onAudioTitleChange) onAudioTitleChange(value);
    },
    [onAudioTitleChange]
  );

  // Musiqi artist dəyişikliyi
  const handleAudioArtistChange = useCallback(
    (value: string) => {
      setLocalAudioArtist(value);
      if (onAudioArtistChange) onAudioArtistChange(value);
    },
    [onAudioArtistChange]
  );

  return (
    <>
      <div className="simple-editor-wrapper">
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
                onAudioClick={() => audioInputRef.current?.click()}
                hasAudio={!!localAudioFile || !!existingAudioUrl}
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
            {/* Kapak resmi alanı - X/Twitter Style */}
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
                  className="cover-image-placeholder"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="placeholder-icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                  </svg>
                  <span className="placeholder-text">
                    Ən yaxşı nəticələr üçün 5:2 en boy nisbətinə sahib bir şəkil istifadə etməyinizi tövsiyə edirik.
                  </span>
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

            {/* Author Info Section */}
            {author && (
              <div className="author-info-section">
                <img
                  src={author.avatar || author.avatar_url || "/default-avatar.png"}
                  alt={author.fullName || author.full_name || "Author"}
                  className="author-avatar squircle"
                />
                <div className="author-details">
                  <div className="author-name-row">
                    <span className="author-name">
                      {author.fullName || author.full_name || author.display_name || author.fullname || author.name || "Anonim"}
                    </span>
                    {(author.verified || author.is_verified) && (
                      <svg className="verified-badge" viewBox="0 0 22 22" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                      </svg>
                    )}
                  </div>
                  <span className="author-username">@{author.username || "user"}</span>
                </div>
              </div>
            )}

            {/* Kategoriler Bölümü - Compact & Scrollable */}
            <div className={`categories-container ${isCategoriesExpanded ? "expanded" : ""}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-inter">Kateqoriyalar</span>
                <button
                  type="button"
                  onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-md hover:bg-zinc-100"
                  title={isCategoriesExpanded ? "Yığcam görünüş" : "Genişləndir"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`tiptap-button-icon w-3.5 h-3.5 transition-transform duration-200 ${
                      isCategoriesExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
              </div>

              <div className="categories-list">
                {supabaseCategories.map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    className={`category-item cursor-pointer ${
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

            {/* Hidden inputs for functionality */}
            <input
              type="file"
              ref={audioInputRef}
              onChange={handleAudioFileChange}
              accept=".mp3,audio/*"
              style={{ display: "none" }}
            />

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
