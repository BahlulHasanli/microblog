import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { useState, useMemo, useEffect } from "react";

interface Share {
  id: string;
  user_id: string;
  content: string;
  image_urls?: string[] | null;
  youtube_video_id?: string | null;
  created_at: string;
  comments_count?: number;
  likes_count?: number;
  share_likes?: Array<{ id: string; user_id: string }>;
}

interface ProfileShareCardProps {
  share: Share;
  isLast?: boolean;
  currentUserId?: string;
  onLikeChange?: (shareId: string, isLiked: boolean) => void;
}

export default function ProfileShareCard({
  share,
  isLast = false,
  currentUserId,
  onLikeChange,
}: ProfileShareCardProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likesCount, setLikesCount] = useState(share.likes_count || 0);

  // Check if current user liked this share
  const isLiked = useMemo(() => {
    if (!currentUserId || !share.share_likes) return false;
    return share.share_likes.some((like) => like.user_id === currentUserId);
  }, [currentUserId, share.share_likes]);

  // Local like state for optimistic updates
  const [isLikedLocal, setIsLikedLocal] = useState(isLiked);

  // Sync local state when share data changes
  useEffect(() => {
    setIsLikedLocal(isLiked);
  }, [isLiked]);

  const createdDate = new Date(share.created_at);
  const timeAgo = formatDistanceToNow(createdDate, {
    locale: az,
    addSuffix: true,
  });

  // Parse image_urls
  let imageUrls: string[] = [];
  if (share.image_urls) {
    if (typeof share.image_urls === "string") {
      try {
        imageUrls = JSON.parse(share.image_urls);
      } catch {
        imageUrls = [];
      }
    } else if (Array.isArray(share.image_urls)) {
      imageUrls = share.image_urls;
    }
  }

  const displayImages = imageUrls.slice(0, 4);
  const remainingCount = imageUrls.length > 4 ? imageUrls.length - 4 : 0;

  // Grid class
  const getGridClass = () => {
    if (displayImages.length === 1) return "grid-cols-1";
    return "grid-cols-2";
  };

  // Border radius for each image
  const getBorderRadiusClass = (index: number) => {
    const length = displayImages.length;
    if (length === 1) return "rounded-lg";
    if (length === 2) return index === 0 ? "rounded-l-lg" : "rounded-r-lg";
    if (length === 3) {
      if (index === 0) return "rounded-tl-lg";
      if (index === 1) return "rounded-tr-lg";
      if (index === 2) return "rounded-bl-lg rounded-br-lg";
      return "";
    }
    if (index === 0) return "rounded-tl-lg";
    if (index === 1) return "rounded-tr-lg";
    if (index === 2) return "rounded-bl-lg";
    return "rounded-br-lg";
  };

  const handlePrev = () => {
    setCurrentImageIndex(
      currentImageIndex === 0 ? imageUrls.length - 1 : currentImageIndex - 1,
    );
  };

  const handleNext = () => {
    setCurrentImageIndex(
      currentImageIndex === imageUrls.length - 1 ? 0 : currentImageIndex + 1,
    );
  };

  const handleLike = async () => {
    if (!currentUserId) return;

    const newLikedState = !isLikedLocal;

    try {
      const response = await fetch(`/api/shares/toggle-like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareId: share.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLikedLocal(newLikedState);
        setLikesCount((prev) =>
          data.action === "added" ? prev + 1 : prev - 1,
        );

        // Notify parent component about like change
        if (onLikeChange) {
          onLikeChange(share.id, newLikedState);
        }
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  return (
    <>
      <div
        className={`p-4 sm:p-6 transition-colors duration-200 hover:bg-slate-50/50`}
      >
        {/* Time */}
        <span className="text-base-400 text-xs font-medium inline-flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          {timeAgo}
        </span>

        {/* Content */}
        <p className="mt-2.5 text-base-800 text-[13px] leading-relaxed wrap-break-word whitespace-pre-wrap">
          {share.content}
        </p>

        {/* Images */}
        {displayImages.length > 0 && (
          <div className={`mt-3 grid ${getGridClass()} gap-1`}>
            {displayImages.map((url, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setCurrentImageIndex(index);
                  setIsGalleryOpen(true);
                }}
                className={`relative cursor-pointer bg-slate-100 overflow-hidden ${getBorderRadiusClass(index)} p-0`}
                style={{
                  maxHeight: displayImages.length === 1 ? "400px" : "260px",
                }}
              >
                <img
                  src={url}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                />
                {index === 3 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-2xl">
                      +{remainingCount}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* YouTube Video */}
        {share.youtube_video_id && (
          <div className="mt-3 aspect-video bg-slate-900 rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${share.youtube_video_id}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-between text-base-400 text-sm">
          <a
            href={`/shares/${share.id}`}
            className="cursor-pointer flex items-center gap-1.5 hover:text-rose-500 transition-colors duration-200 text-xs font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"
              />
            </svg>
            <span>{share.comments_count || 0}</span>
          </a>
          <button
            onClick={handleLike}
            disabled={!currentUserId}
            className={`cursor-pointer flex items-center gap-1.5 transition-colors duration-200 text-xs font-medium ${
              isLiked || isLikedLocal
                ? "text-rose-500 hover:text-rose-600"
                : "hover:text-rose-500"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill={isLiked || isLikedLocal ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
            <span>{likesCount}</span>
          </button>
        </div>
      </div>

      {/* Image Slider Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="cursor-pointer absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors z-10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="size-6 text-black"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Main image */}
            <div className="relative w-full max-w-3xl px-4 flex items-center justify-center">
              <img
                src={imageUrls[currentImageIndex]}
                alt={`Full view ${currentImageIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />

              {/* Navigation buttons */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="cursor-pointer absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-6 text-black"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={handleNext}
                    className="cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-6 text-black"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </>
              )}

              {/* Dots indicator */}
              {imageUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
                  {imageUrls.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full cursor-pointer transition-all ${
                        index === currentImageIndex
                          ? "bg-white w-6"
                          : "bg-white/50 hover:bg-white/75 w-2"
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
