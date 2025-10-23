import { useState, useEffect } from "react";
import AvatarManager from "../../utils/avatarGenerator";

interface AvatarSelectorProps {
  currentAvatar: string;
  onAvatarSelect: (avatarUrl: string) => void;
}

export default function AvatarSelector({
  currentAvatar,
  onAvatarSelect,
}: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<Array<{ id: number; url: string }>>(
    []
  );
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar);

  useEffect(() => {
    const avatarManager = new AvatarManager();
    setAvatars(avatarManager.getAllAvatars());
  }, []);

  const handleAvatarSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    onAvatarSelect(avatarUrl);
  };

  return (
    <div className="avatar-selector">
      <h3 className="text-base font-medium text-base-700 mb-3">
        Profil şəkli seçin
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            onClick={() => handleAvatarSelect(avatar.url)}
            className={`cursor-pointer rounded-lg p-1 border-2 ${
              selectedAvatar === avatar.url
                ? "border-rose-500 bg-rose-50 "
                : "border-transparent hover:bg-base-50"
            }`}
          >
            <img
              src={avatar.url}
              alt={`Avatar ${avatar.id}`}
              className="!w-[110px] !h-[110px] squircle aspect-square object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
