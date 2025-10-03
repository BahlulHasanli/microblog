import { useState, useEffect } from "react";
import PostsTab from "./PostsTab";
import UsersTab from "./UsersTab";

interface AdminPanelProps {
  user: any;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "users">("posts");
  const [stats, setStats] = useState({
    totalPosts: 0,
    pendingPosts: 0,
    totalUsers: 0,
    newUsers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Postları yüklə
      const postsResponse = await fetch("/api/admin/posts/list?status=all");
      const postsData = await postsResponse.json();

      // İstifadəçiləri yüklə
      const usersResponse = await fetch("/api/admin/users/list");
      const usersData = await usersResponse.json();

      if (postsData.success && usersData.success) {
        const pending = postsData.posts.filter(
          (p: any) => p.status === "pending"
        ).length;

        // Son 7 gündə qeydiyyatdan keçmiş istifadəçilər
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newUsers = usersData.users.filter(
          (u: any) => new Date(u.created_at) > sevenDaysAgo
        ).length;

        setStats({
          totalPosts: postsData.posts.length,
          pendingPosts: pending,
          totalUsers: usersData.users.length,
          newUsers: newUsers,
        });
      }
    } catch (error) {
      console.error("Stats yüklənərkən xəta:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-base-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-nouvelr-bold text-slate-900">
                  Admin Panel
                </h1>
                <p className="text-xs text-base-500">İdarəetmə paneli</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 bg-base-50 rounded-lg">
                <img
                  src={user?.avatar}
                  alt={user?.fullname}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">
                    {user?.fullname}
                  </span>
                  <span className="text-xs text-base-500">Admin</span>
                </div>
              </div>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-base-700 hover:text-slate-900 bg-white border border-base-200 rounded-lg hover:bg-base-50 transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Ana səhifə
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-base-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-600 mb-1">Ümumi Postlar</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.totalPosts}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-base-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-600 mb-1">Gözləyən Postlar</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.pendingPosts}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-base-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-600 mb-1">Yeni İstifadəçilər</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.newUsers}
                </p>
                <p className="text-xs text-base-500 mt-1">Son 7 gün</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-base-100 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-600 mb-1">
                  Ümumi İstifadəçilər
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-base-100 overflow-hidden">
          <div className="border-b border-base-100 bg-base-50/50">
            <nav className="flex px-6">
              <button
                onClick={() => setActiveTab("posts")}
                className={`cursor-pointer relative px-6 py-4 font-medium text-sm transition-all ${
                  activeTab === "posts"
                    ? "text-slate-900"
                    : "text-base-600 hover:text-slate-900"
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Postlar
                </span>
                {activeTab === "posts" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`cursor-pointer relative px-6 py-4 font-medium text-sm transition-all ${
                  activeTab === "users"
                    ? "text-slate-900"
                    : "text-base-600 hover:text-slate-900"
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  İstifadəçilər
                </span>
                {activeTab === "users" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div>{activeTab === "posts" ? <PostsTab /> : <UsersTab />}</div>
        </div>
      </div>
    </div>
  );
}
