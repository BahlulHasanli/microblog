import { useState } from "react";
import { useShare } from "@/context/ShareContext";
import { Image, X, Play } from "lucide-react";

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
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setError("");
  };

  const handleAddYoutubeVideo = () => {
    if (!youtubeUrl.trim()) {
      setError("YouTube URL-i daxil edin");
      return;
    }

    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      setError("Etibarsız YouTube URL-i");
      return;
    }

    setYoutubeUrl("");
    setShowYoutubeInput(false);
  };

  const handleRemoveYoutube = () => {
    setYoutubeUrl("");
  };

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
      // YouTube video ID-ni çıxar
      let videoId: string | null = null;
      if (youtubeUrl) {
        videoId = extractYoutubeVideoId(youtubeUrl);
        if (!videoId) {
          setError("Etibarsız YouTube URL-i");
          setIsLoading(false);
          return;
        }
      }

      // API endpoint-i istifadə edərək paylaşım əlavə et
      const response = await fetch("/api/shares/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          imageUrls: null,
          youtubeVideoId: videoId,
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
      setYoutubeUrl("");
      setShowYoutubeInput(false);

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
        {youtubeUrl && (
          <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
            <button
              type="button"
              onClick={handleRemoveYoutube}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
              title="Videoyu sil"
            >
              <X size={16} className="text-white" />
            </button>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${extractYoutubeVideoId(youtubeUrl)}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {showYoutubeInput && !youtubeUrl && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Play size={14} className="text-red-600" />
              <span className="text-xs font-medium text-slate-600">
                YouTube Video
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="youtu.be/... yaxud youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                className="flex-1 p-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder:text-slate-400"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddYoutubeVideo}
                disabled={isLoading || !youtubeUrl.trim()}
                className="px-3 py-2 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Əlavə et
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowYoutubeInput(false);
                  setYoutubeUrl("");
                }}
                disabled={isLoading}
                className="px-3 py-2 text-xs bg-white text-slate-600 border border-slate-300 rounded font-medium hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                Ləğv et
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={() => setShowYoutubeInput(!showYoutubeInput)}
              disabled={isLoading || !!youtubeUrl}
              className="cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="YouTube video əlavə et"
            >
              <Play size={16} className="text-red-600" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {content.length > 0 && (
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg
                  className="w-8 h-8 transform -rotate-90"
                  viewBox="0 0 32 32"
                >
                  {/* Background circle */}
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-200"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${(content.length / 500) * 88} 88`}
                    className={`transition-all duration-300 ${
                      content.length > 450
                        ? "text-red-500"
                        : content.length > 400
                          ? "text-yellow-500"
                          : "text-slate-900"
                    }`}
                  />
                </svg>
                <span className="absolute text-xs font-medium text-slate-600"></span>
              </div>
            )}
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
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  />
                </svg>
              )}
            </button>
          </div>
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
