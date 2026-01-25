import { useCurrentEditor } from "@tiptap/react";
import { Button } from "@/components/tiptap-ui-primitive/button";

export function HorizontalRuleButton() {
  const { editor } = useCurrentEditor();

  if (!editor) return null;

  return (
    <Button
      onClick={() => {
        editor
          .chain()
          .focus()
          .setHorizontalRule()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const { $from } = tr.selection;
              // If we are in a heading, force a paragraph after
              return true;
            }
            return false;
          })
          .insertContent({ type: "paragraph" })
          .run();
      }}
      data-state={editor.isActive("horizontalRule") ? "on" : "off"}
      data-style="ghost"
      title="Ayırıcı əlavə et"
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
          d="M5 12h14"
        />
      </svg>
    </Button>
  );
}
