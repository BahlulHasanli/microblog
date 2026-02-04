import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AudioUploadNode } from "./audio-upload-node";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audioUpload: {
      addAudioUpload: () => ReturnType;
    };
  }
}

export interface AudioUploadOptions {
  limit: number;
  maxSize: number;
  accept: string;
  upload: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal
  ) => Promise<string>;
  onSuccess: (url: string) => void;
  onError: (error: Error) => void;
}

export const AudioUploadExtension = Node.create<AudioUploadOptions>({
  name: "audioUpload",

  group: "block",

  isolating: true,

  defining: true,

  addOptions() {
    return {
      limit: 1,
      maxSize: 10 * 1024 * 1024, // 10MB default
      accept: "audio/*",
      upload: async (file: File) => {
        return URL.createObjectURL(file);
      },
      onSuccess: () => {},
      onError: () => {},
    };
  },

  addAttributes() {
    return {
      limit: {
        default: this.options.limit,
      },
      maxSize: {
        default: this.options.maxSize,
      },
      accept: {
        default: this.options.accept,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-audio-upload]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-audio-upload": "" }),
    ];
  },

  addCommands() {
    return {
      addAudioUpload:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioUploadNode);
  },
});
