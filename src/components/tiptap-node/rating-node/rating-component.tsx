import { NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

export default function RatingComponent({
  node,
  updateAttributes,
  deleteNode,
}: any) {
  const [isEditing, setIsEditing] = useState(!node.attrs.score);
  const [score, setScore] = useState(node.attrs.score || "");

  const handleSave = () => {
    const numericScore = parseFloat(score);
    if (numericScore >= 0 && numericScore <= 10) {
      updateAttributes({ score: numericScore });
      setIsEditing(false);
    } else {
      alert("Xal 0 ilə 10 arasında olmalıdır");
    }
  };

  const handleDelete = () => {
    deleteNode();
  };

  return (
    <NodeViewWrapper className="rating-node-wrapper">
      <div className="relative bg-white text-center">
        {isEditing ? (
          <div className="flex flex-col gap-4 p-6 bg-gray-50 rounded-lg">
            <label className="text-gray-800 text-sm font-semibold uppercase tracking-wide">
              Reytinq Xalı (0-10):
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="8.75"
                className="flex-1 px-3 py-3 text-base rounded border-2 border-gray-300 outline-none focus:border-gray-500"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-black text-white rounded font-semibold text-sm uppercase hover:opacity-90 hover:-translate-y-px transition-all active:translate-y-0"
              >
                Yadda saxla
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-3 bg-red-500 text-white rounded font-semibold text-sm hover:opacity-90 hover:-translate-y-px transition-all active:translate-y-0"
              >
                Sil
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 px-4 relative">
            {/* Top line */}
            <div className="w-full max-w-sm h-px bg-gray-300 mb-4"></div>

            {/* Score */}
            <div className="text-5xl font-bold leading-none text-black mb-1">
              {node.attrs.score.toFixed(2)}
            </div>

            {/* Link to edit */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsEditing(true);
              }}
              className="text-xs text-blue-600 no-underline mt-1 hover:text-blue-900 hover:underline transition-colors"
            >
              Reytinqi dəyişdir
            </a>

            {/* Bottom line */}
            <div className="w-full max-w-sm h-px bg-gray-300 mt-4"></div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
