import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { YoutubeNodeView } from './youtube-node-view';

export interface YoutubeOptions {
  addPasteHandler: boolean;
  allowFullscreen: boolean;
  controls: boolean;
  height: number;
  HTMLAttributes: Record<string, any>;
  inline: boolean;
  nocookie: boolean;
  width: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      /**
       * Add a YouTube video
       */
      setYoutubeVideo: (options: { src: string; width?: number; height?: number; start?: number }) => ReturnType;
    };
  }
}

export const YoutubeNode = Node.create<YoutubeOptions>({
  name: 'youtube',
  
  addOptions() {
    return {
      addPasteHandler: true,
      allowFullscreen: true,
      controls: true,
      height: 480,
      HTMLAttributes: {
        class: 'aspect-video rounded-xl overflow-hidden',
      },
      inline: false,
      nocookie: false,
      width: 640,
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      start: {
        default: 0,
      },
      width: {
        default: this.options.width,
      },
      height: {
        default: this.options.height,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video]',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          const element = node as HTMLElement;
          const src = element.getAttribute('data-youtube-video');
          return { 
            src: src ? `https://www.youtube.com/embed/${src}` : null 
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, ...rest } = HTMLAttributes;
    
    // Extract video ID from src
    let videoId = '';
    if (src) {
      if (src.includes('youtube.com/embed/')) {
        videoId = src.split('youtube.com/embed/')[1].split('?')[0];
      } else if (src.includes('youtube.com/watch')) {
        const url = new URL(src);
        videoId = url.searchParams.get('v') || '';
      } else if (src.includes('youtu.be/')) {
        videoId = src.split('youtu.be/')[1].split('?')[0];
      }
    }

    // Return the exact format needed
    return [
      'div',
      mergeAttributes(
        { 
          'data-youtube-video': videoId, 
          'class': 'aspect-video rounded-xl overflow-hidden' 
        },
        this.options.HTMLAttributes,
        rest
      ),
    ];
  },

  addCommands() {
    return {
      setYoutubeVideo: (options) => ({ commands }) => {
        if (!options.src) {
          return false;
        }

        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(YoutubeNodeView);
  },
});
