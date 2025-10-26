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
    <Button onClick={handleClick} tooltip="Reytinq əlavə et" className="gap-1">
      <StarIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Reytinq</span>
    </Button>
  );
}
