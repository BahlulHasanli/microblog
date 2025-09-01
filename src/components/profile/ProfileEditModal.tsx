import { useState } from "react";
import { supabase } from "../../db/supabase";

interface User {
  id: string;
  fullname: string;
  username: string;
  avatar: string;
  email: string;
}

interface ProfileEditModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}

export default function ProfileEditModal({ user, onClose, onUpdate }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    fullname: user.fullname || "",
    username: user.username || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Kullanıcı adının benzersiz olup olmadığını kontrol et
      if (formData.username !== user.username) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("username")
          .eq("username", formData.username)
          .single();
        
        if (existingUser) {
          setError("Bu istifadəçi adı artıq istifadə olunur");
          setLoading(false);
          return;
        }
      }
      
      // Kullanıcı bilgilerini güncelle
      const { data, error } = await supabase
        .from("users")
        .update({
          fullname: formData.fullname,
          username: formData.username,
        })
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
      setError(err.message || "Bir xəta baş verdi");
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
        
        <h2 className="text-xl font-bold text-base-900 mb-6">Profili Düzənlə</h2>
        
        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            Profiliniz uğurla yeniləndi!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="fullname" className="block text-sm font-medium text-base-700 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-base-700 mb-1">
                İstifadəçi adı
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-base-500">
                  @
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-8 pr-3 py-2 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
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
                disabled={loading}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Yenilənir..." : "Yadda saxla"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
