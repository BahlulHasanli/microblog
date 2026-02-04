import type { Node as TiptapNode } from "@tiptap/pm/model"
import { NodeSelection } from "@tiptap/pm/state"
import type { Editor } from "@tiptap/react"
import { getOrCreateImageId } from "../utils/image-id-store"

// Global tip tanımlaması
declare global {
  interface Window {
    _currentEditorTitle?: string;
    _imageCounters?: Record<string, number>;
    _lastUploadedImageId?: string;
    _lastUploadedImageExtension?: string;
  }
}

// Geçici resim deposu
export const temporaryImages = new Map<string, File>();
// Geçici audio deposu
export const temporaryAudio = new Map<string, File>();

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_AUDIO_SIZE = 20 * 1024 * 1024 // 20MB

export const MAC_SYMBOLS: Record<string, string> = {
  mod: "⌘",
  ctrl: "⌘",
  alt: "⌥",
  shift: "⇧",
  backspace: "Del",
} as const

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ")
}

/**
 * Determines if the current platform is macOS
 * @returns boolean indicating if the current platform is Mac
 */
export function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  )
}

/**
 * Formats a shortcut key based on the platform (Mac or non-Mac)
 * @param key - The key to format (e.g., "ctrl", "alt", "shift")
 * @param isMac - Boolean indicating if the platform is Mac
 * @param capitalize - Whether to capitalize the key (default: true)
 * @returns Formatted shortcut key symbol
 */
export const formatShortcutKey = (
  key: string,
  isMac: boolean,
  capitalize: boolean = true
) => {
  if (isMac) {
    const lowerKey = key.toLowerCase()
    return MAC_SYMBOLS[lowerKey] || (capitalize ? key.toUpperCase() : key)
  }

  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key
}

/**
 * Parses a shortcut key string into an array of formatted key symbols
 * @param shortcutKeys - The string of shortcut keys (e.g., "ctrl-alt-shift")
 * @param delimiter - The delimiter used to split the keys (default: "-")
 * @param capitalize - Whether to capitalize the keys (default: true)
 * @returns Array of formatted shortcut key symbols
 */
export const parseShortcutKeys = (props: {
  shortcutKeys: string | undefined
  delimiter?: string
  capitalize?: boolean
}) => {
  const { shortcutKeys, delimiter = "+", capitalize = true } = props

  if (!shortcutKeys) return []

  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac(), capitalize))
}

/**
 * Checks if a mark exists in the editor schema
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 * @returns boolean indicating if the mark exists in the schema
 */
export const isMarkInSchema = (
  markName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false
  return editor.schema.spec.marks.get(markName) !== undefined
}

/**
 * Checks if a node exists in the editor schema
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 * @returns boolean indicating if the node exists in the schema
 */
export const isNodeInSchema = (
  nodeName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false
  return editor.schema.spec.nodes.get(nodeName) !== undefined
}

/**
 * Checks if a value is a valid number (not null, undefined, or NaN)
 * @param value - The value to check
 * @returns boolean indicating if the value is a valid number
 */
export function isValidPosition(pos: number | null | undefined): pos is number {
  return typeof pos === "number" && pos >= 0
}

/**
 * Checks if one or more extensions are registered in the Tiptap editor.
 * @param editor - The Tiptap editor instance
 * @param extensionNames - A single extension name or an array of names to check
 * @returns True if at least one of the extensions is available, false otherwise
 */
export function isExtensionAvailable(
  editor: Editor | null,
  extensionNames: string | string[]
): boolean {
  if (!editor) return false

  const names = Array.isArray(extensionNames)
    ? extensionNames
    : [extensionNames]

  const found = names.some((name) =>
    editor.extensionManager.extensions.some((ext) => ext.name === name)
  )

  if (!found) {
    console.warn(
      `None of the extensions [${names.join(", ")}] were found in the editor schema. Ensure they are included in the editor configuration.`
    )
  }

  return found
}

/**
 * Finds a node at the specified position with error handling
 * @param editor The Tiptap editor instance
 * @param position The position in the document to find the node
 * @returns The node at the specified position, or null if not found
 */
export function findNodeAtPosition(editor: Editor, position: number) {
  try {
    const node = editor.state.doc.nodeAt(position)
    if (!node) {
      console.warn(`No node found at position ${position}`)
      return null
    }
    return node
  } catch (error) {
    console.error(`Error getting node at position ${position}:`, error)
    return null
  }
}

/**
 * Finds the position and instance of a node in the document
 * @param props Object containing editor, node (optional), and nodePos (optional)
 * @param props.editor The Tiptap editor instance
 * @param props.node The node to find (optional if nodePos is provided)
 * @param props.nodePos The position of the node to find (optional if node is provided)
 * @returns An object with the position and node, or null if not found
 */
export function findNodePosition(props: {
  editor: Editor | null
  node?: TiptapNode | null
  nodePos?: number | null
}): { pos: number; node: TiptapNode } | null {
  const { editor, node, nodePos } = props

  if (!editor || !editor.state?.doc) return null

  // Zero is valid position
  const hasValidNode = node !== undefined && node !== null
  const hasValidPos = isValidPosition(nodePos)

  if (!hasValidNode && !hasValidPos) {
    return null
  }

  // First search for the node in the document if we have a node
  if (hasValidNode) {
    let foundPos = -1
    let foundNode: TiptapNode | null = null

    editor.state.doc.descendants((currentNode, pos) => {
      // TODO: Needed?
      // if (currentNode.type && currentNode.type.name === node!.type.name) {
      if (currentNode === node) {
        foundPos = pos
        foundNode = currentNode
        return false
      }
      return true
    })

    if (foundPos !== -1 && foundNode !== null) {
      return { pos: foundPos, node: foundNode }
    }
  }

  // If we have a valid position, use findNodeAtPosition
  if (hasValidPos) {
    const nodeAtPos = findNodeAtPosition(editor, nodePos!)
    if (nodeAtPos) {
      return { pos: nodePos!, node: nodeAtPos }
    }
  }

  return null
}

/**
 * Checks if the current selection in the editor is a node selection of specified types
 * @param editor The Tiptap editor instance
 * @param types An array of node type names to check against
 * @returns boolean indicating if the selected node matches any of the specified types
 */
export function isNodeTypeSelected(
  editor: Editor,
  types: string[] = []
): boolean {
  if (!editor || !editor.state.selection) return false

  const { state } = editor
  const { doc, selection } = state

  if (selection.empty) return false

  if (selection instanceof NodeSelection) {
    const node = doc.nodeAt(selection.from)
    return node ? types.includes(node.type.name) : false
  }

  return false
}

/**
 * Handles image upload with progress tracking and abort capability
 * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */

export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  // Validate file
  if (!file) {
    throw new Error("No file provided")
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
    )
  }
  
  try {
    // Dosya formatını al
    const fileExtension = file.name.split('.').pop() || 'jpg';
    
    // Dosya için benzersiz bir ID oluştur (format bilgisini içeren)
    const timestamp = Date.now();
    const tempId = `temp-${timestamp}-${fileExtension}`;
    
    console.log(`Geçici resim oluşturuluyor: ${tempId}, boyut: ${file.size} bytes`);
    
    // İlerleme simülasyonu başlat
    let progressInterval: NodeJS.Timeout | null = null;
    if (onProgress) {
      let progress = 0;
      progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
          onProgress({ progress });
        } else {
          clearInterval(progressInterval!);
          progressInterval = null;
        }
      }, 100);
    }
    
    // Geçici bir URL oluştur (blob URL) - bu önizleme için
    const tempUrl = URL.createObjectURL(file);
    
    // Dosyayı geçici depoda sakla
    temporaryImages.set(tempUrl, file);
    
    // İlerleme simülasyonunu durdur
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    // Yükleme tamamlandı
    if (onProgress) {
      onProgress({ progress: 100 });
    }
    
    console.log(`Geçici URL oluşturuldu: ${tempUrl}`);
    
    // Geçici URL'yi döndür - Save zamanı BunnyCDN'e yüklenecek
    return tempUrl;
  } catch (error) {
    console.error('Resim işleme hatası:', error);
    throw new Error(`Resim işlenirken bir hata oluştu: ${error.message}`);
  }
}

// Geçici resimleri gerçek CDN URL'lerine dönüştürme
export const uploadTemporaryImages = async (
  content: any,
  onProgress?: (current: number, total: number) => void
): Promise<any> => {
  // İçerikte resim yoksa doğrudan içeriği döndür
  if (!content || !content.content) return content;
  
  console.log("uploadTemporaryImages başlatılıyor...");
  
  // İçeriği kopyala
  const newContent = JSON.parse(JSON.stringify(content));
  
  // Tüm resimleri bul
  const imageNodes: {node: any, path: (string | number)[]}[] = [];
  
  // İçerikteki tüm resim düğümlerini bul
  const findImageNodes = (node: any, path: (string | number)[] = []) => {
    if (node.type === 'image' && node.attrs?.src) {
      imageNodes.push({node, path});
    }
    
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any, index: number) => {
        findImageNodes(child, [...path, 'content', index]);
      });
    }
  };
  
  findImageNodes(newContent);
  
  console.log(`Toplam ${imageNodes.length} resim düğümü bulundu`);
  
  // Geçici resimleri yükle
  let uploadedCount = 0;
  const totalImages = imageNodes.length;
  
  for (const {node, path} of imageNodes) {
    const src = node.attrs.src;
    
    // Eğer bu bir geçici resimse (blob: ile başlıyorsa)
    if (src.startsWith('blob:')) {
      console.log(`Geçici resim bulundu: ${src}`);
      
      try {
        // Geçici depodan dosyayı al
        const file = temporaryImages.get(src);
        
        if (!file) {
          console.error(`Dosya geçici depoda bulunamadı: ${src}`);
          // Blob URL'den almayı dene
          const response = await fetch(src);
          if (!response.ok) {
            throw new Error(`Blob URL'den dosya alınamadı: ${response.status}`);
          }
          const blob = await response.blob();
          const fileExtension = blob.type.split('/').pop() || 'jpg';
          const tempFile = new File([blob], `image_${Date.now()}.${fileExtension}`, { type: blob.type || 'image/jpeg' });
          
          // Dosyayı yükle
          const cdnUrl = await uploadFileToBunnyCDN(tempFile);
          
          // Node'u direkt güncelle (referans ile)
          node.attrs.src = cdnUrl;
          console.log(`URL güncellendi: ${src} -> ${cdnUrl}`);
          
          // Geçici URL'yi serbest bırak
          URL.revokeObjectURL(src);
        } else {
          console.log(`Dosya geçici depoda bulundu: ${file.name}, boyut: ${file.size}`);
          
          // Dosyayı BunnyCDN'e yükle
          const cdnUrl = await uploadFileToBunnyCDN(file);
          
          // Node'u direkt güncelle (referans ile)
          node.attrs.src = cdnUrl;
          console.log(`URL güncellendi: ${src} -> ${cdnUrl}`);
          
          // Geçici URL'yi serbest bırak ve depodan sil
          URL.revokeObjectURL(src);
          temporaryImages.delete(src);
        }
      } catch (error) {
        console.error(`Resim yükleme hatası:`, error);
        throw error; // Hatayı yukarı fırlat ki kullanıcı görsün
      }
    }
    
    uploadedCount++;
    if (onProgress) {
      onProgress(uploadedCount, totalImages);
    }
  }
  
  console.log("uploadTemporaryImages tamamlandı.");
  return newContent;
}

// Yardımcı fonksiyon: Dosyayı BunnyCDN'e yükle
async function uploadFileToBunnyCDN(file: File, uploadType?: string): Promise<string> {
  // Makale başlığını al
  const title = window._currentEditorTitle || '';
  const { slugify } = await import('../utils/slugify');
  let slug = title ? slugify(title) : '';
  
  // Eğer slug bulunamadıysa tarih bazlı bir slug oluştur
  if (!slug) {
    const date = new Date();
    slug = `post-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${date.getTime().toString().slice(-6)}`;
  }
  
  // FormData oluştur
  const formData = new FormData();
  formData.append("file", file);
  formData.append("slug", slug);
  formData.append("uploadType", uploadType || "post-image");

  // Eğer uploadType 'post-audio' ise, custom path oluştur
  if (uploadType === "post-audio") {
    // Backend tərəfdə bu `path` parametri istifadə olunacaq
    // Məsələn: posts/[slug]/audio-fayl.mp3
    formData.append("path", `posts/${slug}`);
  }
  
  // API'ye istek gönder
  console.log(`API'ye resim yükleme isteği gönderiliyor: /api/bunny-upload`);
  const uploadResponse = await fetch("/api/bunny-upload", {
    method: "POST",
    body: formData,
  });
  
  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json();
    console.error("Resim yükleme hata yanıtı:", errorData);
    throw new Error(errorData.message || "Resim yükleme başarısız oldu");
  }
  
  const data = await uploadResponse.json();
  console.log("Resim yükleme başarılı, CDN URL:", data.imageUrl);
  
  return data.imageUrl;
}

/**
 * Handles audio upload with progress tracking and abort capability
 */
export const handleAudioUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  // Validate file
  if (!file) {
    throw new Error("No file provided");
  }

  if (file.size > MAX_AUDIO_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_AUDIO_SIZE / (1024 * 1024)}MB)`
    );
  }

  try {
    // Dosya formatını al
    const fileExtension = file.name.split('.').pop() || 'mp3';
    
    // Dosya için benzersiz bir ID oluştur
    const timestamp = Date.now();
    const tempId = `temp-audio-${timestamp}-${fileExtension}`;
    
    console.log(`Geçici audio oluşturuluyor: ${tempId}, boyut: ${file.size} bytes`);
    
    // İlerleme simülasyonu
    let progressInterval: NodeJS.Timeout | null = null;
    if (onProgress) {
      let progress = 0;
      progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
          onProgress({ progress });
        } else {
          clearInterval(progressInterval!);
          progressInterval = null;
        }
      }, 100);
    }
    
    const tempUrl = URL.createObjectURL(file);
    temporaryAudio.set(tempUrl, file);
    
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    if (onProgress) {
      onProgress({ progress: 100 });
    }
    
    console.log(`Geçici Audio URL oluşturuldu: ${tempUrl}`);
    return tempUrl;
  } catch (error) {
    console.error('Audio işleme hatası:', error);
    throw new Error(`Audio işlenirken bir hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Geçici audioları gerçek CDN URL'lerine dönüştürme
export const uploadTemporaryAudio = async (
  content: any,
  onProgress?: (current: number, total: number) => void
): Promise<any> => {
  if (!content || !content.content) return content;
  
  console.log("uploadTemporaryAudio başlatılıyor...");
  
  // İçeriği kopyala
  const newContent = JSON.parse(JSON.stringify(content)); // Shallow copy might not be enough if we mutate deeply
  
  const audioNodes: {node: any, path: (string | number)[]}[] = [];
  
  const findAudioNodes = (node: any, path: (string | number)[] = []) => {
    if (node.type === 'audio' && node.attrs?.src) {
      audioNodes.push({node, path});
    }
    
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any, index: number) => {
        findAudioNodes(child, [...path, 'content', index]);
      });
    }
  };
  
  findAudioNodes(newContent);
  console.log(`Toplam ${audioNodes.length} audio düğümü bulundu`);
  
  let uploadedCount = 0;
  const totalAudio = audioNodes.length;
  
  for (const {node, path} of audioNodes) {
    const src = node.attrs.src;
    
    if (src.startsWith('blob:')) {
      console.log(`Geçici audio bulundu: ${src}`);
      
      try {
        const file = temporaryAudio.get(src);
        
        if (!file) {
          console.error(`Dosya geçici audio deposunda bulunamadı: ${src}`);
          // Belki depodan silinib, amma blob hələ də işləyir? 
          // Risklidir, amma fetch edib yenidən yükləməyə cəhd edə bilərik
          // Hələlik sadəcə xəbərdarlıq edək
        } else {
          console.log(`Audio faylı yüklənir: ${file.name}`);
          
          // Audio üçün uploadFileToBunnyCDN funksiyasını istifadə edirik
          // Amma uploadType fərqli ola bilər
          const cdnUrl = await uploadFileToBunnyCDN(file, "post-audio");
          
          node.attrs.src = cdnUrl;
          console.log(`Audio URL güncellendi: ${src} -> ${cdnUrl}`);
          
          URL.revokeObjectURL(src);
          temporaryAudio.delete(src);
        }
      } catch (error) {
        console.error(`Audio yükleme hatası:`, error);
        throw error;
      }
    }
    
    uploadedCount++;
    if (onProgress) {
      onProgress(uploadedCount, totalAudio);
    }
  }
  
  return newContent;
};

type ProtocolOptions = {
  /**
   * The protocol scheme to be registered.
   * @default '''
   * @example 'ftp'
   * @example 'git'
   */
  scheme: string

  /**
   * If enabled, it allows optional slashes after the protocol.
   * @default false
   * @example true
   */
  optionalSlashes?: boolean
}

type ProtocolConfig = Array<ProtocolOptions | string>

const ATTR_WHITESPACE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g

export function isAllowedUri(
  uri: string | undefined,
  protocols?: ProtocolConfig
) {
  const allowedProtocols: string[] = [
    "http",
    "https",
    "ftp",
    "ftps",
    "mailto",
    "tel",
    "callto",
    "sms",
    "cid",
    "xmpp",
  ]

  if (protocols) {
    protocols.forEach((protocol) => {
      const nextProtocol =
        typeof protocol === "string" ? protocol : protocol.scheme

      if (nextProtocol) {
        allowedProtocols.push(nextProtocol)
      }
    })
  }

  return (
    !uri ||
    uri.replace(ATTR_WHITESPACE, "").match(
      new RegExp(
        // eslint-disable-next-line no-useless-escape
        `^(?:(?:${allowedProtocols.join("|")}):|[^a-z]|[a-z0-9+.\-]+(?:[^a-z+.\-:]|$))`,
        "i"
      )
    )
  )
}

export function sanitizeUrl(
  inputUrl: string,
  baseUrl: string,
  protocols?: ProtocolConfig
): string {
  try {
    const url = new URL(inputUrl, baseUrl)

    if (isAllowedUri(url.href, protocols)) {
      return url.href
    }
  } catch {
    // If URL creation fails, it's considered invalid
  }
  return "#"
}
