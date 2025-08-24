import { navigate } from "astro:transitions/client";
import { useState, useRef, useEffect } from "react";
import { isSaveBtn } from "@/store/buttonStore";
import { useStore } from "@nanostores/react";

interface ProfileDropdownProps {
  userImage: string;
  userName: string;
}

export default function ProfileDropdown({
  userImage,
  userName,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSaveBtnState = useStore(isSaveBtn);

  // Dropdown dışına tıklandığında kapanması için
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Menü içi tıklamalarda event propagation'ı durdurma
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Çıkış işlemi
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Başarılı çıkış sonrası ana sayfaya yönlendirme
        navigate("/");
      } else {
        alert("Çıxış zamanı xəta baş verdi");
      }
    } catch (error) {
      alert("Şəbəkə xətası baş verdi");
    }
  };

  return (
    <>
      {isSaveBtn.get().isView && (
        <button
          onClick={isSaveBtn.get().handleSave}
          disabled={
            isSaveBtn.get().isSaving ||
            !isSaveBtn.get().editorContent ||
            !isSaveBtn.get().title
          }
          className={`cursor-pointer py-1.5 px-2.5 border focus:ring-2 h-7.5 text-sm rounded-full 
            border-transparent bg-emerald-600 hover:bg-white text-white 
            duration-200 focus:ring-offset-2 focus:ring-white hover:text-emerald-500 inline-flex 
            items-center justify-center ring-1 ring-transparent ${
              isSaveBtn.get().saveStatus
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-emerald-500 disabled:text-white`}
        >
          {isSaveBtn.get().saveStatus === "saving"
            ? "Yadda saxlanılır..."
            : isSaveBtn.get().saveStatus === "success"
            ? "Yadda saxlanıldı!"
            : isSaveBtn.get().saveStatus === "error"
            ? "Xəta!"
            : "Yadda saxla"}
        </button>
      )}
      <div className="relative z-50" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="overflow-hidden !size-11 squircle ml-4 cursor-pointer"
        >
          <img src={userImage} alt={userName} />
        </div>

        {isOpen && (
          <div
            onClick={handleMenuClick}
            className="absolute bg-white/40 overflow-hidden backdrop-blur-xl right-0 mt-2 w-48 rounded-lg shadow-lg py-1  animate-fadeIn"
          >
            <a
              href="/settings"
              onClick={(e) => e.stopPropagation()}
              className="block px-4 py-2 text-[13px] text-zinc-700 hover:bg-white/40"
            >
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4 mr-2 stroke-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Hesabım
              </div>
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="w-full cursor-pointer text-left block px-4 py-2 text-[13px] text-zinc-700 hover:bg-white/40"
            >
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Çıxış
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
