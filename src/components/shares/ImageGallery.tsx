import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 4 şəkilə qədər göstər
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length > 4 ? images.length - 4 : 0;

  // Grid layout hesabla
  const getGridClass = () => {
    if (displayImages.length === 1) return "grid-cols-1";
    return "grid-cols-2";
  };

  // Border radius class-ları
  const getBorderRadiusClass = (index: number) => {
    const length = displayImages.length;

    if (length === 1) return "rounded-lg";
    if (length === 2) {
      return index === 0 ? "rounded-l-lg" : "rounded-r-lg";
    }
    if (length === 3) {
      if (index === 0) return "rounded-tl-lg";
      if (index === 1) return "rounded-tr-lg";
      if (index === 2) return "rounded-bl-lg rounded-br-lg";
      return "";
    }
    // 4 şəkil
    if (index === 0) return "rounded-tl-lg";
    if (index === 1) return "rounded-tr-lg";
    if (index === 2) return "rounded-bl-lg";
    return "rounded-br-lg";
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className={`mt-3 grid ${getGridClass()} gap-1`}>
        {displayImages.map((image, index) => (
          <div
            key={index}
            className={`relative cursor-pointer bg-slate-100 overflow-hidden ${getBorderRadiusClass(
              index
            )}`}
            onClick={() => {
              setCurrentIndex(index);
              setIsOpen(true);
            }}
          >
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className={`w-full h-44 object-cover hover:opacity-90 transition-opacity`}
            />

            {/* 4+ overlay */}
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-2xl">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Slider Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors z-10"
            >
              <X size={24} className="text-black" />
            </button>

            {/* Main image */}
            <div className="relative w-full max-w-2xl px-4">
              <img
                src={images[currentIndex]}
                alt={`Full view ${currentIndex + 1}`}
                className="w-full h-auto rounded-lg"
              />

              {/* Navigation buttons */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="cursor-pointer absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft size={24} className="text-black" />
                  </button>

                  <button
                    onClick={handleNext}
                    className="cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight size={24} className="text-black" />
                  </button>
                </>
              )}

              {/* Image counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
