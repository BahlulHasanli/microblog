import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { isSaveBtn } from "@/store/buttonStore";
import { userAvatar } from "@/store/userStore";
import { useStore } from "@nanostores/react";
import { supabase } from "@/db/supabase";
import { navigate } from "astro:transitions/client";

interface ProfileDropdownProps {
  userImage: string;
  userName: string;
  isStudioRoutePath: boolean;
}

export default function ProfileDropdown({
  userImage,
  userName,
  isStudioRoutePath,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    avatar: userImage,
    fullname: userName,
  });

  const isSaveBtnState = useStore(isSaveBtn);
  const currentAvatar = useStore(userAvatar);

  // Supabase'den kullanıcı bilgilerini al
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Önce auth kullanıcısını al
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        // Kullanıcı bilgilerini users tablosundan al
        const { data, error } = await supabase
          .from("users")
          .select("id, fullname, username, avatar, email")
          .eq("email", authData.user.email)
          .single();

        if (error) {
          console.error("Kullanıcı bilgileri alınamadı:", error);
          return;
        }

        if (data) {
          setUserData({
            avatar: data.avatar || userImage,
            fullname: data.fullname || userName,
          });
        }
      } catch (err) {
        console.error("Kullanıcı bilgileri alınırken hata oluştu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Listen for avatar updates from userStore
  useEffect(() => {
    if (currentAvatar) {
      setUserData((prevData) => ({
        ...prevData,
        avatar: currentAvatar,
      }));
    }
  }, [currentAvatar]);

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

  // useEffect(() => {
  //   setLoading(false);
  // }, []);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Çıkış işlemi
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        navigate("/");
      } else {
        alert("Çıxış zamanı xəta baş verdi");
      }
    } catch (error) {
      alert("Şəbəkə xətası baş verdi");
    }
  };

  if (loading) {
    return (
      <div className="flex gap-2 items-center">
        <div className="w-[130px] h-[30px] mx-auto bg-zinc-500/10 backdrop-blur-xl animate-pulse rounded-lg"></div>
        <div className="mx-auto bg-zinc-500/10 backdrop-blur-xl animate-pulse rounded-2xl w-[40px] h-[40px]"></div>
      </div>
    );
  }

  return (
    <>
      {isStudioRoutePath && isSaveBtnState.isView && (
        <button
          onClick={isSaveBtnState.handleSave}
          disabled={
            isSaveBtnState.isSaving ||
            !isSaveBtnState.editorContent ||
            !isSaveBtnState.title
          }
          className={`cursor-pointer py-1.5 px-2.5 border focus:ring-2 h-7.5 text-sm rounded-full 
            border-transparent bg-emerald-600 hover:bg-white text-white 
            duration-200 focus:ring-offset-2 focus:ring-white hover:text-emerald-500 inline-flex 
            items-center justify-center ring-1 ring-transparent ${isSaveBtnState.saveStatus} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-emerald-500 disabled:text-white`}
        >
          {isSaveBtnState.saveStatus === "saving"
            ? "Yadda saxlanılır..."
            : isSaveBtnState.saveStatus === "success"
            ? "Yadda saxlanıldı!"
            : isSaveBtnState.saveStatus === "error"
            ? "Xəta!"
            : "Yadda saxla"}
        </button>
      )}

      {!isStudioRoutePath && (
        <a
          href="/studio"
          className="flex gap-1 items-center text-[15px] text-base-700 hover:text-base-900 transition-all cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-[23px] group-hover:stroke-base-900 transition-all"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
          Yaz
        </a>
      )}

      <div className="relative z-50" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="overflow-hidden !size-11 squircle ml-4 cursor-pointer"
        >
          <img
            src={currentAvatar || userData.avatar || userImage}
            alt={userData.fullname || userName}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Resim yüklenemezse placeholder göster
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/150";
            }}
          />
        </div>

        {isOpen && (
          <div
            onClick={handleMenuClick}
            className="absolute bg-white/40 overflow-hidden backdrop-blur-xl right-0 mt-2 w-48 rounded-lg shadow-lg py-1  animate-fadeIn"
          >
            <a
              href="#"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/profile");
              }}
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
