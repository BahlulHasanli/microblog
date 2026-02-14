import * as React from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { CloseIcon } from "@/components/tiptap-icons/close-icon";
import "./audio-upload-node.scss";
import { isValidPosition } from "@/lib/tiptap-utils";

export interface AudioFileItem {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  url?: string;
  abortController?: AbortController;
}

export interface AudioUploadOptions {
  maxSize: number;
  limit: number;
  accept: string;
  upload: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal
  ) => Promise<string>;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

function useAudioUpload(options: AudioUploadOptions) {
  const [fileItems, setFileItems] = React.useState<AudioFileItem[]>([]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (file.size > options.maxSize) {
      const error = new Error(
        `File size exceeds maximum allowed (${options.maxSize / 1024 / 1024}MB)`
      );
      options.onError?.(error);
      return null;
    }

    const abortController = new AbortController();
    const fileId = crypto.randomUUID();

    const newFileItem: AudioFileItem = {
      id: fileId,
      file,
      progress: 0,
      status: "uploading",
      abortController,
    };

    setFileItems((prev) => [...prev, newFileItem]);

    try {
      if (!options.upload) {
        throw new Error("Upload function is not defined");
      }

      const url = await options.upload(
        file,
        (event: { progress: number }) => {
          setFileItems((prev) =>
            prev.map((item) =>
              item.id === fileId ? { ...item, progress: event.progress } : item
            )
          );
        },
        abortController.signal
      );

      if (!url) throw new Error("Upload failed: No URL returned");

      if (!abortController.signal.aborted) {
        setFileItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "success", url, progress: 100 }
              : item
          )
        );
        options.onSuccess?.(url);
        return url;
      }

      return null;
    } catch (error) {
      if (!abortController.signal.aborted) {
        setFileItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "error", progress: 0 }
              : item
          )
        );
        options.onError?.(
          error instanceof Error ? error : new Error("Upload failed")
        );
      }
      return null;
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) {
      options.onError?.(new Error("No files to upload"));
      return [];
    }

    if (options.limit && files.length > options.limit) {
      options.onError?.(
        new Error(
          `Maximum ${options.limit} file${
            options.limit === 1 ? "" : "s"
          } allowed`
        )
      );
      return [];
    }

    const uploadPromises = files.map((file) => uploadFile(file));
    const results = await Promise.all(uploadPromises);

    return results.filter((url): url is string => url !== null);
  };

  const removeFileItem = (fileId: string) => {
    setFileItems((prev) => {
      const fileToRemove = prev.find((item) => item.id === fileId);
      if (fileToRemove?.abortController) {
        fileToRemove.abortController.abort();
      }
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter((item) => item.id !== fileId);
    });
  };

  const clearAllFiles = () => {
    fileItems.forEach((item) => {
      if (item.abortController) {
        item.abortController.abort();
      }
      if (item.url) {
        URL.revokeObjectURL(item.url);
      }
    });
    setFileItems([]);
  };

  return {
    fileItems,
    uploadFiles,
    removeFileItem,
    clearAllFiles,
  };
}

const AudioIcon: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="tiptap-audio-upload-icon"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 0 1 .298.599V16.303a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.403-4.909l2.311-.66a1.5 1.5 0 0 0 1.088-1.442V6.994l-9 2.572v9.737a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.402-4.909l2.31-.66a1.5 1.5 0 0 0 1.088-1.442V5.25a.75.75 0 0 1 .544-.721l10.5-3a.75.75 0 0 1 .658.122Z" clipRule="evenodd" />
  </svg>
);

const AudioFileIcon: React.FC = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="tiptap-audio-upload-dropzone-rect-primary"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 0 1 .298.599V16.303a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.403-4.909l2.311-.66a1.5 1.5 0 0 0 1.088-1.442V6.994l-9 2.572v9.737a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.402-4.909l2.31-.66a1.5 1.5 0 0 0 1.088-1.442V5.25a.75.75 0 0 1 .544-.721l10.5-3a.75.75 0 0 1 .658.122Z" clipRule="evenodd" />
  </svg>
);

interface AudioUploadDragAreaProps {
  onFile: (files: File[]) => void;
  children?: React.ReactNode;
}

const AudioUploadDragArea: React.FC<AudioUploadDragAreaProps> = ({
  onFile,
  children,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFile(files);
    }
  };

  return (
    <div
      className={`tiptap-audio-upload-drag-area ${
        isDragActive ? "drag-active" : ""
      } ${isDragOver ? "drag-over" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
};

interface AudioUploadPreviewProps {
  fileItem: AudioFileItem;
  onRemove: () => void;
}

const AudioUploadPreview: React.FC<AudioUploadPreviewProps> = ({
  fileItem,
  onRemove,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="tiptap-audio-upload-preview">
      {fileItem.status === "uploading" && (
        <div
          className="tiptap-audio-upload-progress"
          style={{ width: `${fileItem.progress}%` }}
        />
      )}

      <div className="tiptap-audio-upload-preview-content">
        <div className="tiptap-audio-upload-file-info">
          <div className="tiptap-audio-upload-file-icon">
            <AudioIcon />
          </div>
          <div className="tiptap-audio-upload-details">
            <span className="tiptap-audio-upload-text">
              {fileItem.file.name}
            </span>
            <span className="tiptap-audio-upload-subtext">
              {formatFileSize(fileItem.file.size)}
            </span>
          </div>
        </div>
        <div className="tiptap-audio-upload-actions">
          {fileItem.status === "uploading" && (
            <span className="tiptap-audio-upload-progress-text">
              {fileItem.progress}%
            </span>
          )}
          <Button
            type="button"
            data-style="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <CloseIcon className="tiptap-button-icon" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const DropZoneContent: React.FC<{ maxSize: number; limit: number }> = ({
  maxSize,
  limit,
}) => (
  <>
    <div className="tiptap-audio-upload-dropzone">
      <AudioFileIcon />
      <div className="tiptap-audio-upload-icon-container">
        <AudioIcon />
      </div>
    </div>

    <div className="tiptap-audio-upload-content">
      <span className="tiptap-audio-upload-text">
        <em>Komputerdən seçərək yüklə</em> və ya sürüklə və bura at
      </span>
      <span className="tiptap-audio-upload-subtext">
        Max {limit} fayl{limit === 1 ? "" : "lar"}, {maxSize / 1024 / 1024}MB
        həcmi.
      </span>
    </div>
  </>
);

export const AudioUploadNode: React.FC<NodeViewProps> = (props) => {
  const { accept, limit, maxSize } = props.node.attrs;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const extension = props.extension;

  const uploadOptions: AudioUploadOptions = {
    maxSize,
    limit,
    accept,
    upload: extension.options.upload,
    onSuccess: extension.options.onSuccess,
    onError: extension.options.onError,
  };

  const { fileItems, uploadFiles, removeFileItem, clearAllFiles } =
    useAudioUpload(uploadOptions);

  const handleUpload = async (files: File[]) => {
    const urls = await uploadFiles(files);

    if (urls.length > 0) {
      const pos = props.getPos();

      if (isValidPosition(pos)) {
        const audioNodes = urls.map((url, index) => {
          const filename =
            files[index]?.name.replace(/\.[^/.]+$/, "") || "unknown";
          return {
            type: "audio",
            attrs: { src: url, title: filename, artist: "" },
          };
        });

        props.editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + 1 })
          .insertContentAt(pos, audioNodes)
          .run();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      extension.options.onError?.(new Error("No file selected"));
      return;
    }
    handleUpload(Array.from(files));
  };

  const handleClick = () => {
    if (inputRef.current && fileItems.length === 0) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const hasFiles = fileItems.length > 0;

  return (
    <NodeViewWrapper
      className="tiptap-audio-upload"
      tabIndex={0}
      onClick={handleClick}
    >
      {!hasFiles && (
        <AudioUploadDragArea onFile={handleUpload}>
          <DropZoneContent maxSize={maxSize} limit={limit} />
        </AudioUploadDragArea>
      )}

      {hasFiles && (
        <div className="tiptap-audio-upload-previews">
          {fileItems.map((fileItem) => (
            <AudioUploadPreview
              key={fileItem.id}
              fileItem={fileItem}
              onRemove={() => removeFileItem(fileItem.id)}
            />
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        name="audio-file"
        accept={accept}
        type="file"
        multiple={limit > 1}
        onChange={handleChange}
        onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
        className="hidden"
      />
    </NodeViewWrapper>
  );
};
