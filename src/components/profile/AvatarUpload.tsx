import { useState, useRef, useEffect } from "react";
import { supabase } from "../../db/supabase";
import AvatarSelector from "./AvatarSelector";
import { updateUserAvatar } from "@/store/userStore";
import { extractAvatarPathFromUrl, isDefaultAvatar } from "@/utils/avatarUtils";

interface User {
  id: string;
  fullname: string;
  username: string;
  avatar: string;
  email: string;
}

interface AvatarUploadProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}

export default function AvatarUpload({
  user,
  onClose,
  onUpdate,
}: AvatarUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "default">("default");
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya türünü kontrol et
    if (!file.type.startsWith("image/")) {
      setError("Lütfən şəkil faylı seçin");
      return;
    }

    // Dosya boyutunu kontrol et (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Şəkil faylı 2MB-dan böyük olmamalıdır");
      return;
    }

    // Önizleme oluştur
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Hata mesajını temizle
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If we're using the default avatar tab
    if (activeTab === "default") {
      if (!selectedDefaultAvatar) {
        setError("Lütfən avatar seçin");
        return;
      }
      await updateAvatarInSupabase(selectedDefaultAvatar);
      return;
    }

    // If we're using the upload tab
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Lütfən şəkil faylı seçin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Kullanıcı ID'sini kullanarak benzersiz bir dosya adı oluştur
      const fileExt = file.name.split(".").pop();
      // Benzersiz dosya adı oluştur (sadece dosya adı, path değil)
      const uniqueFileName = `${user.id}-${Date.now()}.${fileExt}`;
      // Bunny CDN için tam dosya yolu oluştur
      const filePath = `avatar/${uniqueFileName}`;

      // Dosyayı FormData olarak hazırla
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", uniqueFileName);
      formData.append("filePath", filePath);

      // Bunny CDN'e yükle
      const uploadResponse = await fetch("/api/bunny-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Avatar yükleme xətası");
      }

      const uploadResult = await uploadResponse.json();
      const avatarUrl = uploadResult.imageUrl;

      await updateAvatarInSupabase(avatarUrl);
    } catch (err: any) {
      setError(err.message || "Avatar yüklənərkən xəta baş verdi");
    } finally {
      setLoading(false);
    }
  };

  // Eski avatarı BunnyCDN'den sil
  const deleteOldAvatar = async (oldAvatarUrl: string) => {
    try {
      // Eğer avatar URL'si BunnyCDN'de değilse silme
      if (!oldAvatarUrl || !oldAvatarUrl.includes('b-cdn.net')) {
        console.log('Silinecek eski avatar yok');
        return true;
      }
      
      // Varsayılan avatarları (noavatar klasöründeki) silme
      if (isDefaultAvatar(oldAvatarUrl)) {
        console.log('Varsayılan avatar silinmeyecek:', oldAvatarUrl);
        return true;
      }

      // Avatar yolunu URL'den çıkar
      const avatarPath = extractAvatarPathFromUrl(oldAvatarUrl);
      if (!avatarPath) {
        console.log('Avatar yolu çıkarılamadı veya varsayılan avatar:', oldAvatarUrl);
        return true; // Varsayılan avatar veya geçersiz yol için başarılı dön
      }

      console.log('Eski avatar siliniyor:', avatarPath);
      
      // BunnyCDN silme API'sini çağır
      const deleteResponse = await fetch('/api/bunny-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: avatarPath,
        }),
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        console.error('Avatar silme hatası:', errorData);
        return false;
      }

      const deleteResult = await deleteResponse.json();
      console.log('Avatar silme sonucu:', deleteResult);
      return deleteResult.success;
    } catch (error) {
      console.error('Avatar silme işlemi sırasında hata:', error);
      return false;
    }
  };

  // Helper function to update avatar in Supabase
  const updateAvatarInSupabase = async (avatarUrl: string) => {
    setLoading(true);
    setError("");

    try {
      // Önce eski avatarı sil
      if (user.avatar) {
        await deleteOldAvatar(user.avatar);
      }
      
      // Kullanıcı bilgilerini güncelle
      const { data, error } = await supabase
        .from("users")
        .update({ avatar: avatarUrl })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Başarılı mesajını göster ve ana bileşeni güncelle
      setSuccess(true);
      onUpdate({ ...user, ...data });

      // Update avatar in global store to notify other components
      updateUserAvatar(avatarUrl);

      // 1.5 saniye sonra modalı kapat
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Avatar yüklənərkən xəta baş verdi");
    } finally {
      setLoading(false);
    }
  };

  // Handle default avatar selection
  const handleDefaultAvatarSelect = (avatarUrl: string) => {
    setSelectedDefaultAvatar(avatarUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fadeIn">
        {/* Kapat butonu */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-base-500 hover:text-base-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-base-900 mb-6">
          Profil şəkli yüklə
        </h2>

        {/* Tabs */}
        <div className="flex border-b border-base-200 mb-6">
          <button
            onClick={() => setActiveTab("default")}
            className={`px-4 py-2 font-medium ${
              activeTab === "default"
                ? "text-rose-500 border-b-2 border-rose-500"
                : "text-base-600"
            }`}
          >
            Hazır avatarlar
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 font-medium ${
              activeTab === "upload"
                ? "text-rose-500 border-b-2 border-rose-500"
                : "text-base-600"
            }`}
          >
            Şəkil yüklə
          </button>
        </div>

        {success ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              Profil şəkliniz uğurla yeniləndi!
            </div>
            <div className="mx-auto size-32 squircle overflow-hidden mb-4">
              <img
                src={user.avatar}
                alt={user.fullname}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {activeTab === "default" ? (
              <div className="mb-6">
                <AvatarSelector
                  currentAvatar={selectedDefaultAvatar || user.avatar}
                  onAvatarSelect={handleDefaultAvatarSelect}
                />
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex flex-col items-center">
                  <div className="mx-auto size-32 squircle overflow-hidden mb-4 bg-base-100">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Önizleme"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={user.avatar || "https://via.placeholder.com/150"}
                        alt={user.fullname}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <label className="cursor-pointer py-2 px-4 bg-base-100 hover:bg-base-200 text-base-700 rounded-lg transition-colors">
                    Şəkil seç
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-base-500 mt-2">
                    PNG, JPG və ya GIF. Maksimum 2MB.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-base-300 rounded-lg text-base-700 hover:bg-base-50"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  (activeTab === "upload" ? !preview : !selectedDefaultAvatar)
                }
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Yüklənir..." : "Yadda saxla"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
