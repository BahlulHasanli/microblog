import { useState, useRef } from "react";
import { supabase } from "../../db/supabase";

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

export default function AvatarUpload({ user, onClose, onUpdate }: AvatarUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
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
      // Bunny CDN formatına uygun dosya adı oluştur
      const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;
      
      // Dosyayı FormData olarak hazırla
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", fileName);
      formData.append("filePath", fileName);
      
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
      onUpdate({...user, ...data});
      
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fadeIn">
        {/* Kapat butonu */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-base-500 hover:text-base-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl font-bold text-base-900 mb-6">Profil şəkli yüklə</h2>
        
        {success ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              Profil şəkliniz uğurla yeniləndi!
            </div>
            <div className="mx-auto size-32 squircle overflow-hidden mb-4">
              <img src={user.avatar} alt={user.fullname} className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <div className="flex flex-col items-center">
                <div className="mx-auto size-32 squircle overflow-hidden mb-4 bg-base-100">
                  {preview ? (
                    <img src={preview} alt="Önizleme" className="w-full h-full object-cover" />
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
                <p className="text-xs text-base-500 mt-2">PNG, JPG və ya GIF. Maksimum 2MB.</p>
              </div>
            </div>
            
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
                disabled={loading || !preview}
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
