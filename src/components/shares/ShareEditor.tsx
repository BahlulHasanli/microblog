import { useState } from "react";
import { useShare } from "@/context/ShareContext";
import { Image, X } from "lucide-react";

interface ShareEditorProps {
  onShareCreated?: () => void;
}

interface ImagePreview {
  file: File;
  preview: string;
}

export default function ShareEditor({ onShareCreated }: ShareEditorProps) {
  const { triggerRefresh } = useShare();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: ImagePreview[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > 5 * 1024 * 1024) {
          setError(`"${file.name}" 5MB-dan kiçik olmalıdır`);
          continue;
        }

        if (!file.type.startsWith("image/")) {
          setError(`"${file.name}" şəkil faylı deyil`);
          continue;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          setImages((prev) => [
            ...prev,
            {
              file,
              preview: reader.result as string,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }

      setError("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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
      // API endpoint-i istifadə edərək paylaşım əlavə et (şəkilsiz)
      const response = await fetch("/api/shares/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          imageUrls: null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Paylaşım əlavə edilərkən xəta");
        setIsLoading(false);
        return;
      }

      const shareId = data.data[0]?.id;

      if (!shareId) {
        setError("Paylaşım ID-si alına bilmədi");
        setIsLoading(false);
        return;
      }

      const imageUrls: string[] = [];

      // Şəkillər varsa BunnyCDN-ə yüklə (post ID-si ilə)
      if (images.length > 0) {
        for (const image of images) {
          const formData = new FormData();
          formData.append("file", image.file);
          formData.append("shareId", shareId);

          const uploadResponse = await fetch("/api/upload/share-image", {
            method: "POST",
            body: formData,
          });

          const uploadData = await uploadResponse.json();

          if (!uploadResponse.ok || !uploadData.success) {
            setError(uploadData.message || "Şəkil yüklənərkən xəta");
            setIsLoading(false);
            return;
          }

          imageUrls.push(uploadData.imageUrl);
        }

        // Şəkilləri Supabase-ə yenilə
        const updateResponse = await fetch("/api/shares/update-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shareId,
            imageUrls,
          }),
        });

        const updateData = await updateResponse.json();

        if (!updateResponse.ok || !updateData.success) {
          setError(updateData.message || "Şəkillər yenilənərkən xəta");
          setIsLoading(false);
          return;
        }
      }

      setContent("");
      setImages([]);

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
    <div className="w-full border-b border-slate-100 p-3 sm:p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nə düşünürsən?"
          maxLength={500}
          disabled={isLoading}
          className="w-full p-2 sm:p-3 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
          rows={2}
        />

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative inline-block">
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="max-h-32 rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 p-1 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">{content.length}/500</div>

            <label className="cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <Image size={16} className="text-slate-600" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                disabled={isLoading}
                className="hidden"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isLoading || !content.trim()}
            className="cursor-pointer px-3 sm:px-4 py-1.5 text-sm bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              "Göndərilir..."
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                className="size-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
