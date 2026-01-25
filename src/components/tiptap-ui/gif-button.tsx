import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "@/components/tiptap-ui-primitive/button";

// GIPHY API key - public beta key for testing
const GIPHY_API_KEY = "O8Q98f1kZimW3Dle57G4amKEPJ4lQvkH";

interface GifResult {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
      width: string;
      height: string;
    };
  };
}

export function GifButton() {
  const { editor } = useCurrentEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch trending GIFs on open
  useEffect(() => {
    if (isOpen && gifs.length === 0) {
      fetchTrendingGifs();
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const fetchTrendingGifs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Failed to fetch trending GIFs:", error);
    }
    setIsLoading(false);
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGifs();
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Failed to search GIFs:", error);
    }
    setIsLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(searchQuery);
  };

  const insertGif = (gif: GifResult) => {
    if (!editor) return;
    
    editor
      .chain()
      .focus()
      .setImage({
        src: gif.images.original.url,
        alt: gif.title,
        title: gif.title,
      })
      .run();
    
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        data-style="ghost"
        onClick={() => setIsOpen(true)}
        title="GIF əlavə et"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tiptap-button-icon"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <text x="12" y="14" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">GIF</text>
        </svg>
      </Button>

      {isOpen && (
        <div className="gif-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="gif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gif-modal-header">
              <h3>GIF Seç</h3>
              <button type="button" className="gif-close-btn" onClick={() => setIsOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSearch} className="gif-search-form">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="GIF axtar..."
                className="gif-search-input"
              />
              <button type="submit" className="gif-search-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </form>

            <div className="gif-grid">
              {isLoading ? (
                <div className="gif-loading">Yüklənir...</div>
              ) : gifs.length === 0 ? (
                <div className="gif-empty">GIF tapılmadı</div>
              ) : (
                gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    className="gif-item"
                    onClick={() => insertGif(gif)}
                  >
                    <img
                      src={gif.images.fixed_height.url}
                      alt={gif.title}
                      loading="lazy"
                    />
                  </button>
                ))
              )}
            </div>

            <div className="gif-powered-by">
              Powered by GIPHY
            </div>
          </div>
        </div>
      )}

      <style>{`
        .gif-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .gif-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 500px; /* Reduced width */
          max-height: 70vh; /* Reduced height */
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.12), 0 16px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .gif-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem; /* Reduced padding */
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .gif-modal-header h3 {
          margin: 0;
          font-size: 1rem; /* Smaller font */
          font-weight: 600;
          color: #111827;
          font-family: "Inter", sans-serif;
        }

        .gif-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem; /* Smaller button */
          height: 1.75rem;
          border: none;
          background: rgba(0, 0, 0, 0.05);
          cursor: pointer;
          border-radius: 50%;
          color: #6b7280;
          transition: all 0.2s;
        }

        .gif-close-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #111827;
        }

        .gif-close-btn svg {
          width: 1rem; /* Smaller icon */
          height: 1rem;
        }

        .gif-search-form {
          display: flex;
          padding: 0.75rem 1.25rem;
          gap: 0.5rem;
        }

        .gif-search-input {
          flex: 1;
          padding: 0.5rem 0.875rem; /* Reduced padding */
          background: #f3f4f6;
          border: 1px solid transparent;
          border-radius: 10px; /* Slightly smaller radius */
          font-size: 0.875rem; /* Smaller font */
          outline: none;
          transition: all 0.2s;
          color: #111827;
        }

        .gif-search-input:focus {
          background: white;
          border-color: #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        }

        .gif-search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; /* Smaller button */
          height: 36px;
          background: #18181b;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          color: white;
          transition: transform 0.2s, background 0.2s;
        }

        .gif-search-btn:hover {
          background: #27272a;
        }

        .gif-search-btn svg {
          width: 1.25rem; /* Smaller icon */
          height: 1.25rem;
        }

        .gif-grid {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0 1.25rem 1.25rem 1.25rem;
          align-content: flex-start;
        }

        .gif-item {
          border: none;
          background: #f3f4f6;
          padding: 0;
          cursor: pointer;
          border-radius: 10px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          width: calc(33.333% - 0.375rem);
          height: auto;
        }

        .gif-item:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }

        .gif-item img {
          width: 100%;
          height: 100px; /* Reduced height */
          object-fit: cover;
          display: block;
        }

        .gif-loading,
        .gif-empty {
          width: 100%;
          text-align: center;
          padding: 2rem;
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .gif-powered-by {
          padding: 0.5rem;
          text-align: center;
          font-size: 0.65rem;
          color: #9ca3af;
          background: white;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        @media (max-width: 640px) {
          .gif-modal {
            max-height: 80vh;
            border-radius: 20px;
          }

          .gif-grid {
            padding: 0 1rem 1rem 1rem;
          }
          
          .gif-item {
             width: calc(50% - 0.25rem);
          }
        }
      `}</style>
    </>
  );
}
