import { useState } from "react";
import PostCard from "./PostCard";

interface Post {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  created_at: string;
  categories?: string[];
  approved?: boolean;
}

interface ProfileTabsProps {
  posts: Post[];
  userId: string;
  isOwner?: boolean;
  currentUserEmail?: string;
}

export default function ProfileTabs({
  posts,
  userId,
  isOwner = false,
  currentUserEmail,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("posts");
  // userId artık string tipinde

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-base-200 mb-6 sm:mb-10">
        <div className="flex space-x-4 sm:space-x-8">
          <button
            onClick={() => setActiveTab("posts")}
            className={`py-3 sm:py-4 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
              activeTab === "posts"
                ? "border-rose-500 text-rose-600"
                : "border-transparent text-base-500 hover:text-base-700 hover:border-base-300"
            }`}
          >
            Məqalələr
          </button>
          {/* <button
            onClick={() => setActiveTab("drafts")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "drafts"
                ? "border-rose-500 text-rose-500"
                : "border-transparent text-base-500 hover:text-base-700"
            }`}
          >
            Qaralamalar
          </button> 
          <button
            onClick={() => setActiveTab("saved")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "saved"
                ? "border-rose-500 text-rose-500"
                : "border-transparent text-base-500 hover:text-base-700"
            }`}
          >
            Saxlanılanlar
          </button> */}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "posts" && (
          <div>
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-8 sm:gap-y-12 md:gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} isOwner={isOwner} />
                ))}
              </div>
            ) : isOwner ? (
              <div className="bg-white rounded-2xl border border-base-200 p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-8 text-base-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-base-900 mb-2">
                    Hələ heç bir məqalə yazmamısınız
                  </h3>
                  <p className="text-base-600 mb-6">
                    İlk məqalənizi yazmaq üçün "Yeni məqalə yaz" düyməsinə
                    klikləyin
                  </p>
                  <a
                    href="/studio"
                    className="py-3 px-6 border focus:ring-2 text-sm font-medium rounded-xl 
                    border-transparent bg-rose-500 hover:bg-rose-600 text-white 
                    transition-all duration-200 focus:ring-offset-2 focus:ring-rose-500 inline-flex 
                    items-center justify-center gap-2 shadow-sm"
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
                    Yeni məqalə yaz
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-base-200 p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-8 text-base-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-base-900 mb-2">
                    Heç bir məqalə yoxdur
                  </h3>
                  <p className="text-base-600">
                    Bu istifadəçi hələ heç bir məqalə yazmamışdır
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* {activeTab === "drafts" && (
          <div className="bg-white rounded-2xl border border-base-200 p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-8 text-base-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 0 0 2.25 2.25h.75m0-3.75h3.75m-3.75 3.75h3.75M9 21h3.75m-3.75 0h3.75m0-3.75h3.75M9 18h3.75"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-base-900 mb-2">
                Hələ heç bir qaralama yoxdur
              </h3>
              <p className="text-base-600">
                Məqalə yazarkən qaralama olaraq saxlaya bilərsiniz
              </p>
            </div>
          </div>
        )} */}

        {/* {activeTab === "saved" && (
          <div className="bg-white rounded-2xl border border-base-200 p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-8 text-base-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-base-900 mb-2">
                Hələ heç bir məqalə saxlamamısınız
              </h3>
              <p className="text-base-600">
                Bəyəndiyiniz məqalələri saxlaya bilərsiniz
              </p>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
