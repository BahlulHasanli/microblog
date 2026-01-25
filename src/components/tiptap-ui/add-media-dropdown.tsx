import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "@/components/tiptap-ui-primitive/button";

interface AddMediaDropdownProps {
  onImageUpload?: () => void;
}

export function AddMediaDropdown({ onImageUpload }: AddMediaDropdownProps) {
  const { editor } = useCurrentEditor();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const handleAddMedia = () => {
    setIsOpen(false);
    if (onImageUpload) {
      onImageUpload();
    }
  };

  const handleAddSeparator = () => {
    setIsOpen(false);
    if (editor) {
      editor.chain().focus().setHorizontalRule().run();
    }
  };

  const handleAddCode = () => {
    setIsOpen(false);
    if (editor) {
      editor.chain().focus().toggleCodeBlock().run();
    }
  };

  const handleAddYoutube = () => {
    setIsOpen(false);
    const url = prompt("YouTube URL-sini daxil edin:");
    if (url && editor) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: 640,
        height: 360,
      });
    }
  };

  const menuItems = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="dropdown-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
      label: "Medya",
      onClick: handleAddMedia,
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="dropdown-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      ),
      label: "YouTube",
      onClick: handleAddYoutube,
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="dropdown-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      ),
      label: "Ayırıcı",
      onClick: handleAddSeparator,
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="dropdown-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
        </svg>
      ),
      label: "Kod",
      onClick: handleAddCode,
    },
  ];

  return (
    <div className="add-media-dropdown-wrapper">
      <Button
        ref={buttonRef}
        type="button"
        data-style="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="add-media-trigger"
      >
        Əlavə et
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="dropdown-chevron"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </Button>

      {isOpen && (
        <div ref={dropdownRef} className="add-media-dropdown">
          {menuItems.map((item, index) => (
            <button
              key={index}
              type="button"
              className="dropdown-item"
              onClick={item.onClick}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .add-media-dropdown-wrapper {
          position: relative;
        }

        .add-media-trigger {
          display: flex !important;
          align-items: center !important;
          gap: 0.25rem !important;
          padding: 0.375rem 0.625rem !important;
          font-size: 0.875rem !important;
          color: var(--editor-text, #e7e9ea) !important;
        }

        .dropdown-chevron {
          width: 0.875rem;
          height: 0.875rem;
          transition: transform 0.2s ease;
        }

        .add-media-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background-color: #000;
          border: 1px solid #2f3336;
          border-radius: 12px;
          padding: 0.5rem 0;
          min-width: 160px;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
          z-index: 1000;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: #e7e9ea;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: background-color 0.15s ease;
          text-align: left;
        }

        .dropdown-item:hover {
          background-color: #16181c;
        }

        .dropdown-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #71767b;
        }
      `}</style>
    </div>
  );
}
