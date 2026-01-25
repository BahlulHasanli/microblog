import { useEditor } from "@tiptap/react";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { StarIcon } from "lucide-react";

interface RatingButtonProps {
  editor: ReturnType<typeof useEditor>;
}

export function RatingButton({ editor }: RatingButtonProps) {
  if (!editor) {
    return null;
  }

  const handleClick = () => {
    editor.commands.setRating({ score: 0 });
  };

  return (
    <Button onClick={handleClick} data-style="ghost" title="Reytinq əlavə et">
      <StarIcon className="tiptap-button-icon" />
    </Button>
  );
}
