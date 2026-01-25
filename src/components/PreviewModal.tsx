import { useState, useEffect } from "react";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  content: any;
  coverImageUrl?: string;
  categories?: string[];
}

export default function PreviewModal({
  isOpen,
  onClose,
  title,
  description,
  content,
  coverImageUrl,
  categories = [],
}: PreviewModalProps) {
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    if (content && isOpen) {
      const html = convertContentToHtml(content);
      setHtmlContent(html);
    }
  }, [content, isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="preview-modal-fullscreen">
      {/* Close button */}
      <button onClick={onClose} className="preview-close-btn" title="Bağla (ESC)">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="close-icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="preview-scroll-container">
        <article className="preview-article">
          {/* Cover Image */}
          {coverImageUrl && (
            <div className="preview-cover-image">
              <img src={coverImageUrl} alt={title} />
            </div>
          )}

          <div className="preview-content-wrapper">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="preview-categories">
                {categories.map((cat) => (
                  <span key={cat} className="preview-category-tag">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="preview-title">{title || "Başlıq yoxdur"}</h1>

            {/* Description */}
            {description && (
              <p className="preview-description">{description}</p>
            )}

            {/* Content */}
            <div
              className="preview-body tiptap ProseMirror"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </article>
      </div>

      <style>{`
        .preview-modal-fullscreen {
          position: fixed;
          inset: 0;
          background: #ffffff;
          z-index: 9999;
          display: flex;
          flex-direction: column;
        }

        .preview-close-btn {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border: none;
          background: rgba(0, 0, 0, 0.7);
          cursor: pointer;
          border-radius: 50%;
          color: white;
          transition: all 0.15s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .preview-close-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.05);
        }

        .close-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .preview-scroll-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .preview-article {
          max-width: 100%;
          margin: 0 auto;
        }

        .preview-cover-image {
          width: 100%;
          max-height: 60vh;
          overflow: hidden;
        }

        .preview-cover-image img {
          width: 100%;
          height: auto;
          max-height: 60vh;
          object-fit: cover;
          display: block;
        }

        .preview-content-wrapper {
          max-width: 680px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }

        .preview-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .preview-category-tag {
          padding: 0.375rem 0.875rem;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          color: #dc2626;
          font-size: 0.8125rem;
          font-weight: 500;
          border-radius: 9999px;
          border: 1px solid #fecaca;
        }

        .preview-title {
          margin: 0 0 1rem;
          font-family: "DM Sans", sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .preview-description {
          margin: 0 0 2rem;
          font-family: "DM Sans", sans-serif;
          font-size: 1.25rem;
          color: #6b7280;
          line-height: 1.6;
        }

        .preview-body {
          font-family: "DM Sans", sans-serif;
          font-size: 1.125rem;
          line-height: 1.8;
          color: #374151;
        }

        .preview-body h1,
        .preview-body h2,
        .preview-body h3,
        .preview-body h4,
        .preview-body h5,
        .preview-body h6 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
          color: #111827;
          line-height: 1.3;
        }

        .preview-body h1 { font-size: 2rem; }
        .preview-body h2 { font-size: 1.5rem; }
        .preview-body h3 { font-size: 1.25rem; }
        .preview-body h4 { font-size: 1.125rem; }

        .preview-body p {
          margin: 0 0 1.25rem;
        }

        .preview-body ul,
        .preview-body ol {
          margin: 0 0 1.25rem;
          padding-left: 1.75rem;
        }

        .preview-body li {
          margin-bottom: 0.5rem;
        }

        .preview-body li p {
          margin: 0;
        }

        .preview-body blockquote {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          border-left: 4px solid #e5e7eb;
          background: #f9fafb;
          color: #4b5563;
          font-style: italic;
        }

        .preview-body blockquote p {
          margin: 0;
        }

        .preview-body pre {
          margin: 1.5rem 0;
          padding: 1.25rem;
          background: #1f2937;
          color: #e5e7eb;
          border-radius: 0.75rem;
          overflow-x: auto;
          font-size: 0.875rem;
          font-family: "Fira Code", "Monaco", monospace;
        }

        .preview-body code {
          padding: 0.2rem 0.4rem;
          background: #f3f4f6;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: "Fira Code", "Monaco", monospace;
        }

        .preview-body pre code {
          padding: 0;
          background: transparent;
          color: inherit;
        }

        .preview-body img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
          display: block;
        }

        .preview-body video {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
          display: block;
        }

        .preview-body iframe {
          max-width: 100%;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
        }

        .preview-body a {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .preview-body a:hover {
          color: #1d4ed8;
        }

        .preview-body hr {
          margin: 2.5rem 0;
          border: none;
          border-top: 1px solid #e5e7eb;
        }

        .preview-body .task-list {
          list-style: none;
          padding-left: 0;
        }

        .preview-body .task-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .preview-body figure {
          margin: 1.5rem 0;
        }

        .preview-body figcaption {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
        }

        .preview-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }

        .preview-body th,
        .preview-body td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem 1rem;
          text-align: left;
        }

        .preview-body th {
          background: #f9fafb;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .preview-title {
            font-size: 1.75rem;
          }

          .preview-description {
            font-size: 1.125rem;
          }

          .preview-content-wrapper {
            padding: 1.5rem 1rem 3rem;
          }

          .preview-body {
            font-size: 1rem;
          }

          .preview-close-btn {
            top: 0.75rem;
            right: 0.75rem;
            width: 2.25rem;
            height: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
}

function convertContentToHtml(content: any): string {
  if (!content || !content.content) return "";

  let html = "";
  let skipTitle = true;
  let skipDescription = true;

  for (const node of content.content) {
    // Skip title heading (first h1)
    if (node.type === "heading" && node.attrs?.level === 1 && skipTitle) {
      skipTitle = false;
      continue;
    }

    // Skip description (first paragraph after title)
    if (node.type === "paragraph" && skipDescription && skipTitle === false) {
      const text = node.content?.map((n: any) => n.text || "").join("") || "";
      if (text.length > 0) {
        skipDescription = false;
        continue;
      }
    }

    html += nodeToHtml(node);
  }

  return html;
}

function nodeToHtml(node: any): string {
  if (!node) return "";

  switch (node.type) {
    case "paragraph":
      const pContent = node.content?.map(nodeToHtml).join("") || "";
      return pContent ? `<p>${pContent}</p>` : "<p></p>";

    case "heading":
      const level = node.attrs?.level || 2;
      const hContent = node.content?.map(nodeToHtml).join("") || "";
      return `<h${level}>${hContent}</h${level}>`;

    case "bulletList":
      const ulItems = node.content?.map(nodeToHtml).join("") || "";
      return `<ul>${ulItems}</ul>`;

    case "orderedList":
      const olItems = node.content?.map(nodeToHtml).join("") || "";
      return `<ol>${olItems}</ol>`;

    case "listItem":
      const liContent = node.content?.map(nodeToHtml).join("") || "";
      return `<li>${liContent}</li>`;

    case "taskList":
      const taskItems = node.content?.map(nodeToHtml).join("") || "";
      return `<ul class="task-list">${taskItems}</ul>`;

    case "taskItem":
      const checked = node.attrs?.checked ? "☑" : "☐";
      const taskContent = node.content?.map(nodeToHtml).join("") || "";
      return `<li>${checked} ${taskContent}</li>`;

    case "blockquote":
      const bqContent = node.content?.map(nodeToHtml).join("") || "";
      return `<blockquote>${bqContent}</blockquote>`;

    case "codeBlock":
      const code = node.content?.map((n: any) => n.text || "").join("") || "";
      const lang = node.attrs?.language || "";
      return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;

    case "horizontalRule":
      return "<hr />";

    case "image":
      const imgSrc = node.attrs?.src || "";
      const imgAlt = node.attrs?.alt || "";
      const imgTitle = node.attrs?.title || "";
      if (imgTitle) {
        return `<figure><img src="${imgSrc}" alt="${imgAlt}" /><figcaption>${imgTitle}</figcaption></figure>`;
      }
      return `<img src="${imgSrc}" alt="${imgAlt}" />`;

    case "video":
      const videoSrc = node.attrs?.src || "";
      return `<video src="${videoSrc}" controls playsinline></video>`;

    case "youtube":
    case "iframe":
      const iframeSrc = node.attrs?.src || "";
      return `<iframe src="${iframeSrc}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`;

    case "table":
      const tableContent = node.content?.map(nodeToHtml).join("") || "";
      return `<table>${tableContent}</table>`;

    case "tableRow":
      const rowContent = node.content?.map(nodeToHtml).join("") || "";
      return `<tr>${rowContent}</tr>`;

    case "tableHeader":
      const thContent = node.content?.map(nodeToHtml).join("") || "";
      return `<th>${thContent}</th>`;

    case "tableCell":
      const tdContent = node.content?.map(nodeToHtml).join("") || "";
      return `<td>${tdContent}</td>`;

    case "hardBreak":
      return "<br />";

    case "text":
      let text = node.text || "";
      text = escapeHtml(text);

      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case "bold":
              text = `<strong>${text}</strong>`;
              break;
            case "italic":
              text = `<em>${text}</em>`;
              break;
            case "strike":
              text = `<s>${text}</s>`;
              break;
            case "code":
              text = `<code>${text}</code>`;
              break;
            case "link":
              const href = mark.attrs?.href || "";
              const target = mark.attrs?.target || "_blank";
              text = `<a href="${href}" target="${target}">${text}</a>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "highlight":
              const color = mark.attrs?.color || "#fef08a";
              text = `<mark style="background-color: ${color}">${text}</mark>`;
              break;
            case "textStyle":
              if (mark.attrs?.color) {
                text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
              }
              break;
          }
        }
      }

      return text;

    default:
      if (node.content) {
        return node.content.map(nodeToHtml).join("");
      }
      return "";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
