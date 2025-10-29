import { useState, useEffect } from "react";
import ProfileEditModal from "./ProfileEditModal";
import AvatarUpload from "./AvatarUpload";
import { supabase } from "../../db/supabase";

interface User {
  id: string;
  fullname: string;
  username: string;
  avatar: string;
  email: string;
}

interface ProfileHeaderProps {
  user: User;
  isOwner?: boolean;
}

export default function ProfileHeader({ user, isOwner = true }: ProfileHeaderProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Supabase'den kullanıcı bilgilerini al
  useEffect(() => {
    setIsHydrated(true);
    
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, fullname, username, avatar, email")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Kullanıcı bilgileri alınamadı:", error);
          return;
        }

        if (data) {
          setCurrentUser(data);
        }
      } catch (err) {
        console.error("Kullanıcı bilgileri alınırken hata oluştu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user.id]);

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  return (
    <div className="mb-12">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative group flex-shrink-0">
          <div className="overflow-hidden !size-32 squircle cursor-pointer ring-4 ring-base-100" suppressHydrationWarning>
            <img
              src={currentUser.avatar}
              alt={currentUser.fullname}
              className="w-full h-full object-cover"
              suppressHydrationWarning
            />

            {isOwner && (
              <button
                onClick={() => setIsAvatarModalOpen(true)}
                className="cursor-pointer absolute backdrop-blur-sm inset-0 flex items-center justify-center bg-black/30 brightness-110 opacity-0 group-hover:opacity-100 transition-all duration-200"
                aria-label="Avatar dəyişdir"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-8 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 w-full">
          <div className="text-center sm:text-left" suppressHydrationWarning>
            <h1 className="text-2xl font-display font-semibold text-base-800 mb-1">
              {currentUser.fullname}
            </h1>
            <p className="text-base-500/80 text-sm">@{currentUser.username}</p>
          </div>
          {isOwner && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-2.5 py-2.5 rounded-xl hover:bg-base-200 bg-base-100/50 cursor-pointer text-sm font-medium
                  transition-all duration-200 focus:ring-offset-2 focus:ring-rose-500 text-base-900 
                  inline-flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <ProfileEditModal
          user={currentUser}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUserUpdate}
        />
      )}

      {/* Avatar Upload Modal */}
      {isAvatarModalOpen && (
        <AvatarUpload
          user={currentUser}
          onClose={() => setIsAvatarModalOpen(false)}
          onUpdate={handleUserUpdate}
        />
      )}
    </div>
  );
}
