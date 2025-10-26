import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import RatingComponent from "./rating-component";

export interface RatingOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    rating: {
      setRating: (options: { score: number }) => ReturnType;
    };
  }
}

export const Rating = Node.create<RatingOptions>({
  name: "rating",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      score: {
        default: 0,
        parseHTML: (element) => element.getAttribute("data-score"),
        renderHTML: (attributes) => {
          return {
            "data-score": attributes.score,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="rating"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "rating",
      }),
    ];
  },

  addCommands() {
    return {
      setRating:
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
    return ReactNodeViewRenderer(RatingComponent);
  },
});

export default Rating;
