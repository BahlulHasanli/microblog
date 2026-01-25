import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import * as React from "react";
import { AltTextModal } from "@/components/tiptap-ui/alt-text-modal";

const ImageNodeView = ({ node, deleteNode, selected, updateAttributes }: NodeViewProps) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <NodeViewWrapper className={`tiptap-image-wrapper ${selected ? "selected" : ""}`}>
      <img 
        src={node.attrs.src as string} 
        alt={(node.attrs.alt as string) || ""} 
        title={(node.attrs.title as string) || ""} 
      />
      
      <div className="image-node-actions">
        <button
          type="button"
          className="image-alt-btn"
          onClick={() => setIsModalOpen(true)}
          title={node.attrs.alt ? `Alt: ${node.attrs.alt}` : "Alt mətn əlavə et"}
        >
          ALT
        </button>
        <button
          type="button"
          className="image-delete-btn"
          onClick={() => deleteNode()}
          title="Şəkli sil"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <AltTextModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialAltText={(node.attrs.alt as string) || ""}
        onSave={(newAltText) => {
          updateAttributes({ 
            alt: newAltText,
            title: newAltText 
          });
          setIsModalOpen(false);
        }}
      />
      
      {node.attrs.alt && (
        <span className="image-caption">
          {node.attrs.alt}
        </span>
      )}
    </NodeViewWrapper>
  );
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageWithDelete: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

export const ImageWithDelete = Node.create({
  name: "image",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // Check if current node is an image
        const node = $from.parent;
        const nodeAfter = $from.nodeAfter;
        
        if (node.type.name === this.name || nodeAfter?.type.name === this.name) {
          // Insert paragraph after the image
          return editor.chain().insertContentAt(selection.to, { type: 'paragraph' }).focus().run();
        }
        
        return false;
      },
    };
  },
});
