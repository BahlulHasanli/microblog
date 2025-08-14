import * as React from "react";
import { EditorContent, EditorContext, useEditor, Node } from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection, Placeholder } from "@tiptap/extensions";
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

    const handleBeforeCreate = () => {
      // Resim eklenirken cursor pozisyonunu kontrol et
      const { state } = editor;
      const { selection } = state;

      const resolvedPos = state.doc.resolve(selection.from);
      let currentNode = resolvedPos.parent;
      let depth = resolvedPos.depth;

      // Title veya description içinde mi kontrol et
      while (depth >= 0) {
        if (
          currentNode.type.name === "title" ||
          currentNode.type.name === "description"
        ) {
          // Content alanının başlangıç pozisyonunu hesapla
          let contentPos = 1; // doc başlangıcı
          try {
            contentPos += state.doc.child(0).nodeSize; // title node size
            contentPos += state.doc.child(1).nodeSize; // description node size

            // Yeni pozisyona taşı
            const newSelection = state.selection.constructor.near(
              state.doc.resolve(contentPos)
            );
            editor.view.dispatch(state.tr.setSelection(newSelection));
          } catch (error) {
            console.warn("Position calculation error:", error);
          }
          break;
        }
        depth--;
        currentNode = depth >= 0 ? resolvedPos.node(depth) : null;
        if (!currentNode) break;
      }
    };

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
        <ImageUploadButton text="Add" />
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
}

export function SimpleEditor({
  onUpdate,
  title = "",
  description = "",
  onTitleChange,
  onDescriptionChange,
}: SimpleEditorProps) {
  const isMobile = useIsMobile();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  // Özel belge yapısı oluşturma - title ve description sadece bir kez olacak şekilde düzenleme
  const CustomDocument = Document.extend({
    content: "title description block+",

    // Document'in content kontrolü için özel parsing
    addGlobalAttributes() {
      return [
        {
          types: ["title", "description"],
          attributes: {
            unique: {
              default: true,
            },
          },
        },
      ];
    },
  });

  // Özel düğüm tanımlamaları
  const Title = Node.create({
    name: "title",
    group: "block",
    content: "text*",
    isolating: true, // Bu node'un başka node'lardan etkilenmesini önler
    defining: true, // Bu node'un belge yapısında özel rol oynadığını belirtir
    parseHTML() {
      return [{ tag: "h1.document-title" }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["h1", { class: "document-title", ...HTMLAttributes }, 0];
    },
    addKeyboardShortcuts() {
      return {
        Tab: () => {
          // Title'dan Tab ile description'a geç
          const { state, dispatch } = this.editor;
          const descriptionPos = state.doc.child(1).isText
            ? 3
            : state.doc.child(1).nodeSize + 1;
          const selection = state.selection.constructor.create(
            state.doc,
            descriptionPos
          );
          dispatch(state.tr.setSelection(selection));
          return true;
        },
        Enter: () => {
          // Title'dan Enter ile description'a geç
          const { state, dispatch } = this.editor;
          const descriptionPos = state.doc.child(1).isText
            ? 3
            : state.doc.child(1).nodeSize + 1;
          const selection = state.selection.constructor.create(
            state.doc,
            descriptionPos
          );
          dispatch(state.tr.setSelection(selection));
          return true;
        },
      };
    },
  });

  const Description = Node.create({
    name: "description",
    group: "block",
    content: "text*",
    isolating: true, // Bu node'un başka node'lardan etkilenmesini önler
    defining: true, // Bu node'un belge yapısında özel rol oynadığını belirtir
    parseHTML() {
      return [{ tag: "p.document-description" }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["p", { class: "document-description", ...HTMLAttributes }, 0];
    },
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          // Description'dan Enter ile ilk content paragraph'a geç
          const { state, dispatch } = this.editor;
          let contentPos = 1; // doc başlangıcı
          contentPos += state.doc.child(0).nodeSize; // title node size
          contentPos += state.doc.child(1).nodeSize; // description node size

          const selection = state.selection.constructor.create(
            state.doc,
            contentPos
          );
          dispatch(state.tr.setSelection(selection));
          return true;
        },
      };
    },
  });

  // Başlık ve açıklama değişikliklerini izleme
  const handleTitleUpdate = React.useCallback(
    (titleContent: string) => {
      if (onTitleChange) {
        onTitleChange(titleContent);
      }
    },
    [onTitleChange]
  );

  const handleDescriptionUpdate = React.useCallback(
    (descContent: string) => {
      if (onDescriptionChange) {
        onDescriptionChange(descContent);
      }
    },
    [onDescriptionChange]
  );

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
      CustomDocument,
      Title,
      Description,
      StarterKit.configure({
        document: false, // Özel belge kullandığımız için devre dışı bırakıyoruz
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      Placeholder.configure({
        showOnlyCurrent: false,
        placeholder: ({ node }) => {
          if (node.type.name === "title") {
            return "Başlıq";
          }
          if (node.type.name === "description") {
            return "Açıqlama";
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
    ],
    content: {
      type: "doc",
      content: [
        {
          type: "title",
          content: title ? [{ type: "text", text: title }] : [],
        },
        {
          type: "description",
          content: description ? [{ type: "text", text: description }] : [],
        },
        {
          type: "paragraph",
        },
      ],
    },
    onUpdate: ({ editor }) => {
      // Başlık ve açıklama içeriğini izleme - daha güvenli erişim
      const doc = editor.state.doc;

      try {
        const titleNode = doc.child(0);
        const descriptionNode = doc.child(1);

        if (titleNode && titleNode.type.name === "title") {
          const titleContent = titleNode.textContent;
          handleTitleUpdate(titleContent);
        }

        if (descriptionNode && descriptionNode.type.name === "description") {
          const descContent = descriptionNode.textContent;
          handleDescriptionUpdate(descContent);
        }
      } catch (error) {
        console.warn("Error accessing title/description nodes:", error);
      }

      if (onUpdate) {
        onUpdate(editor.getJSON());
      }
    },
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  // Editor mount olduktan sonra document yapısını kontrol et ve düzelt
  React.useEffect(() => {
    if (editor && editor.isEditable) {
      // Debounced document structure validation
      let timeoutId: number;

      const validateDocumentStructure = () => {
        const { state } = editor;
        const { doc } = state;

        // Title ve description node'larının düzgün konumda olduğunu kontrol et
        const firstChild = doc.child(0);
        const secondChild = doc.child(1);

        // İlk iki node title ve description olmalı
        if (
          firstChild.type.name !== "title" ||
          secondChild.type.name !== "description"
        ) {
          return; // Yapı bozuksa müdahale etme, kullanıcı deneyimini bozabilir
        }

        // Duplike title/description kontrolü - sadece 3. pozisyondan sonrası için
        let hasInvalidDuplicate = false;
        let pos = 0;

        doc.descendants((node, nodePos) => {
          if (nodePos > firstChild.nodeSize + secondChild.nodeSize) {
            if (
              node.type.name === "title" ||
              node.type.name === "description"
            ) {
              hasInvalidDuplicate = true;
            }
          }
        });

        if (hasInvalidDuplicate) {
          console.warn("Invalid duplicate title/description detected");
        }
      };

      const handleEditorUpdate = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(validateDocumentStructure, 100); // 100ms debounce
      };

      // İlk kontrol
      timeoutId = window.setTimeout(validateDocumentStructure, 0);

      // Editor update'lerinde kontrol et
      editor.on("update", handleEditorUpdate);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        editor.off("update", handleEditorUpdate);
      };
    }
  }, [editor]);

  return (
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

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  );
}
