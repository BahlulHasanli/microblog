import React, { useState, useEffect, useRef } from 'react';

interface AltTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (altText: string) => void;
  initialAltText: string;
}

export const AltTextModal: React.FC<AltTextModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAltText,
}) => {
  const [altText, setAltText] = useState(initialAltText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAltText(initialAltText);
      // Focus textarea on open
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
        document.body.style.overflow = '';
    };
  }, [isOpen, initialAltText]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="alt-text-modal-overlay" onClick={onClose}>
      <div 
        className="alt-text-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alt-text-modal-header">
          <h3>Alternativ mətn (Alt Text)</h3>
          <button 
            type="button" 
            className="alt-text-close-btn" 
            onClick={onClose}
            title="Bağla"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="alt-text-modal-body">
          <p className="alt-text-description">
            Şəkil üçün qısa və aydın təsvir yazın. Bu mətn görmə məhdudiyyətli istifadəçilər və axtarış sistemləri üçün faydalıdır.
          </p>
          <textarea
            ref={textareaRef}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Şəkildə nə təsvir olunub?"
            className="alt-text-textarea"
            maxLength={1000}
          />
          <div className="alt-text-char-count">
            {altText.length}/1000
          </div>
        </div>

        <div className="alt-text-modal-footer">
          <button 
            type="button" 
            className="alt-text-cancel-btn"
            onClick={onClose}
          >
            Ləğv et
          </button>
          <button 
            type="button" 
            className="alt-text-save-btn"
            onClick={() => onSave(altText)}
          >
            Yadda saxla
          </button>
        </div>
      </div>

      <style>{`
        .alt-text-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }

        .alt-text-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .alt-text-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #f3f4f6;
        }

        .alt-text-modal-header h3 {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
        }

        .alt-text-close-btn {
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .alt-text-close-btn:hover {
            background: #f3f4f6;
            color: #111827;
        }

        .alt-text-close-btn svg {
            width: 1.25rem;
            height: 1.25rem;
        }

        .alt-text-modal-body {
            padding: 1.5rem;
        }

        .alt-text-description {
            margin: 0 0 1rem 0;
            font-size: 0.875rem;
            color: #6b7280;
            line-height: 1.5;
        }

        .alt-text-textarea {
            width: 100%;
            min-height: 120px;
            padding: 0.75rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.9375rem;
            color: #111827;
            resize: vertical;
            outline: none;
            transition: all 0.2s;
            font-family: inherit;
        }

        .alt-text-textarea:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .alt-text-char-count {
            text-align: right;
            font-size: 0.75rem;
            color: #9ca3af;
            margin-top: 0.5rem;
        }

        .alt-text-modal-footer {
            padding: 1rem 1.5rem;
            background: #f9fafb;
            border-top: 1px solid #f3f4f6;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
        }

        .alt-text-cancel-btn {
            padding: 0.625rem 1rem;
            border: 1px solid #e5e7eb;
            background: white;
            color: #374151;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .alt-text-cancel-btn:hover {
            background: #f9fafb;
            border-color: #d1d5db;
        }

        .alt-text-save-btn {
            padding: 0.625rem 1.25rem;
            border: none;
            background: #111827;
            color: white;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .alt-text-save-btn:hover {
            background: #000;
            transform: translateY(-1px);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
