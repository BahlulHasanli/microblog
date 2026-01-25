import { useStore } from "@nanostores/react";
import { isSaveBtn } from "@/store/buttonStore";
import { useState } from "react";
import PreviewModal from "@/components/PreviewModal";

interface EditorActionButtonsProps {
  onPreview?: () => void;
  onCancel?: () => void;
  previewData?: {
    title: string;
    description: string;
    content: any;
    coverImageUrl?: string;
    categories?: string[];
  };
}

export default function EditorActionButtons({
  onPreview,
  onCancel,
  previewData,
}: EditorActionButtonsProps) {
  const saveBtnState = useStore(isSaveBtn);
  const [showPreview, setShowPreview] = useState(false);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      if (window.confirm("Dəyişikliklər yadda saxlanılmayacaq. Çıxmaq istədiyinizə əminsiniz?")) {
        window.location.href = "/";
      }
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview();
    } else if (previewData) {
      setShowPreview(true);
    }
  };

  const handleSave = () => {
    if (saveBtnState.handleSave) {
      saveBtnState.handleSave();
    }
  };

  const isDisabled =
    saveBtnState.isSaving ||
    !saveBtnState.editorContent ||
    !saveBtnState.title ||
    saveBtnState.isDisabled;

  if (!saveBtnState.isView) {
    return null;
  }

  return (
    <div className="editor-action-buttons">
      <div className="action-buttons-container">
        {/* Ləğv et */}
        <button
          type="button"
          onClick={handleCancel}
          className="action-btn cancel-btn"
          title="Ləğv et"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="btn-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="btn-divider" />

        {/* Ön izləmə */}
        <button
          type="button"
          onClick={handlePreview}
          className="action-btn preview-btn"
          disabled={!saveBtnState.editorContent || !saveBtnState.title}
          title="Ön izləmə"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="btn-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </button>

        <div className="btn-divider" />

        {/* Yadda saxla */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isDisabled}
          className={`action-btn save-btn ${saveBtnState.saveStatus}`}
          title="Yadda saxla"
        >
          {saveBtnState.saveStatus === "saving" ? (
            <svg
              className="btn-icon animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : saveBtnState.saveStatus === "success" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="btn-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="btn-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
              />
            </svg>
          )}
        </button>
      </div>

      {previewData && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={previewData.title}
          description={previewData.description}
          content={previewData.content}
          coverImageUrl={previewData.coverImageUrl}
          categories={previewData.categories}
        />
      )}

      <style>{`
        .editor-action-buttons {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 100;
        }

        .action-buttons-container {
          display: flex;
          align-items: center;
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 9999px;
          overflow: hidden;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.625rem 0.875rem;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          background: transparent;
        }

        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-icon {
          width: 1.125rem;
          height: 1.125rem;
        }

        .btn-divider {
          width: 1px;
          height: 1.25rem;
          background-color: #e5e7eb;
        }

        .cancel-btn {
          color: #6b7280;
        }

        .cancel-btn:hover:not(:disabled) {
          background-color: #f3f4f6;
          color: #374151;
        }

        .preview-btn {
          color: #6b7280;
        }

        .preview-btn:hover:not(:disabled) {
          background-color: #f3f4f6;
          color: #0369a1;
        }

        .save-btn {
          color: #10b981;
        }

        .save-btn:hover:not(:disabled) {
          background-color: #ecfdf5;
        }

        .save-btn.saving {
          color: #f59e0b;
        }

        .save-btn.success {
          color: #10b981;
        }

        .save-btn.error {
          color: #ef4444;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 480px) {
          .editor-action-buttons {
            bottom: calc(var(--tt-toolbar-height, 2.75rem) + var(--tt-safe-area-bottom, 0px) + 0.75rem);
            right: 0.75rem;
          }

          .action-btn {
            padding: 0.5rem 0.75rem;
          }

          .btn-icon {
            width: 1rem;
            height: 1rem;
          }

          .btn-divider {
            height: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
