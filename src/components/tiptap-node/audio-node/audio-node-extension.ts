import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AudioComponent } from "./audio-component";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (options: { src: string; title?: string; artist?: string }) => ReturnType;
    };
  }
}

export const AudioNode = Node.create({
  name: "audio",

  group: "block",

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: null,
      },
      artist: {
        default: null,
      },
      // CDN'e yükləndikdən sonra type əlavə etmək olar, default mp3
      type: {
        default: 'audio/mpeg',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "audio",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["audio", mergeAttributes(HTMLAttributes, { controls: "" })];
  },

  addCommands() {
    return {
      setAudio:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioComponent as any);
  },
});
