import { useState } from "react";
import { useShare } from "@/context/ShareContext";

interface ShareEditorProps {
  onShareCreated?: () => void;
}

export default function ShareEditor({ onShareCreated }: ShareEditorProps) {
  const { triggerRefresh } = useShare();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Paylaşım boş olmalı deyil");
      return;
    }

    if (content.length > 500) {
      setError("Paylaşım 500 simvoldan çox olmalı deyil");
      return;
    }

    setIsLoading(true);

    try {
      // API endpoint-i istifadə edərək paylaşım əlavə et
      const response = await fetch("/api/shares/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Paylaşım əlavə edilərkən xəta");
        setIsLoading(false);
        return;
      }

      setContent("");

      // Refresh timeline
      triggerRefresh();
      if (onShareCreated) {
        onShareCreated();
      }
    } catch (err) {
      setError("Xəta baş verdi");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full border-b border-slate-200 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nə düşünürsən?"
          maxLength={500}
          disabled={isLoading}
          className="w-full p-3 sm:p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
          rows={3}
        />

        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm text-slate-500">
            {content.length}/500
          </div>
          <button
            type="submit"
            disabled={isLoading || !content.trim()}
            className="px-4 sm:px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Göndərilir..." : "Paylaş"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
