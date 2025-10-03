import { useState, useEffect } from "react";

interface Post {
  id: string;
  slug: string;
  title: string;
  description: string;
  author_name: string;
  author_avatar: string;
  status: string;
  featured: boolean;
  created_at: string;
}

export default function PostsTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    loadPosts();
  }, [filter]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      console.log("Postlar yüklənir, filter:", filter);

      const response = await fetch(`/api/admin/posts/list?status=${filter}`);
      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        setPosts(data.posts);
        console.log("Postlar yükləndi:", data.posts.length);
      } else {
        console.error("API xətası:", data.message);
        alert(data.message || "Postlar yüklənərkən xəta baş verdi");
      }
    } catch (error) {
      console.error("Postlar yüklənərkən xəta:", error);
      alert("Postlar yüklənərkən xəta baş verdi");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (postId: string, approve: boolean = true) => {
    const message = approve 
      ? "Bu postu təsdiq etmək istədiyinizə əminsiniz?" 
      : "Bu postu yayımdan çıxarmaq istədiyinizə əminsiniz?";
    
    if (!confirm(message)) return;

    try {
      const response = await fetch("/api/admin/posts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, approve }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadPosts();
      } else {
        alert(data.message || "Xəta baş verdi");
      }
    } catch (error) {
      console.error("Təsdiq xətası:", error);
      alert("Xəta baş verdi");
    }
  };

  const handleDelete = async (postId: string, slug: string) => {
    if (!confirm("Bu postu silmək istədiyinizə əminsiniz?")) return;

    try {
      const response = await fetch("/api/admin/posts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, slug }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Post silindi");
        loadPosts();
      } else {
        alert(data.message || "Xəta baş verdi");
      }
    } catch (error) {
      console.error("Silmə xətası:", error);
      alert("Xəta baş verdi");
    }
  };

  const handleEdit = (slug: string) => {
    window.location.href = `/edit-post/${slug}`;
  };

  const handleFeatured = async (postId: string, featured: boolean) => {
    const message = featured 
      ? "Bu postu önə çıxarmaq istədiyinizə əminsiniz?" 
      : "Bu postu önə çıxarmadan çıxarmaq istədiyinizə əminsiniz?";
    
    if (!confirm(message)) return;

    try {
      const response = await fetch("/api/admin/posts/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, featured }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadPosts();
      } else {
        alert(data.message || "Xəta baş verdi");
      }
    } catch (error) {
      console.error("Featured toggle xətası:", error);
      alert("Xəta baş verdi");
    }
  };

  return (
    <div className="p-8">
      {/* Filter */}
      <div className="mb-8 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`cursor-pointer px-6 py-2 rounded-md font-medium text-sm transition-colors ${
            filter === "all"
              ? "bg-slate-900 text-white"
              : "bg-transparent text-base-600 hover:bg-base-100"
          }`}
        >
          Hamısı
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`cursor-pointer px-6 py-2 rounded-md font-medium text-sm transition-colors ${
            filter === "pending"
              ? "bg-slate-900 text-white"
              : "bg-transparent text-base-600 hover:bg-base-100"
          }`}
        >
          Gözləyən
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`cursor-pointer px-6 py-2 rounded-md font-medium text-sm transition-colors ${
            filter === "approved"
              ? "bg-slate-900 text-white"
              : "bg-transparent text-base-600 hover:bg-base-100"
          }`}
        >
          Təsdiqlənmiş
        </button>
      </div>

      {/* Posts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-base-600">Yüklənir...</p>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <svg
            className="w-16 h-16 text-base-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-base-500 font-medium">Post tapılmadı</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-base-200">
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Başlıq
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Müəllif
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Tarix
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Əməliyyatlar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {posts.map((post, index) => (
                <tr
                  key={post.id}
                  className="border-b border-base-100 hover:bg-base-50 transition-all duration-200"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900 mb-1">
                          {post.title}
                        </div>
                        <div className="text-xs text-base-500 line-clamp-1">
                          {post.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.author_avatar}
                        alt={post.author_name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-base-100"
                      />
                      <span className="text-sm text-base-700">
                        {post.author_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          post.status === "approved"
                            ? "bg-green-500"
                            : post.status === "pending"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <span
                        className={`text-xs font-medium ${
                          post.status === "approved"
                            ? "text-green-700"
                            : post.status === "pending"
                            ? "text-yellow-700"
                            : "text-red-700"
                        }`}
                      >
                        {post.status === "approved"
                          ? "Təsdiqləndi"
                          : post.status === "pending"
                          ? "Gözləyir"
                          : "Rədd edildi"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-xs text-base-500">
                    {new Date(post.created_at).toLocaleDateString("az-AZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.status === "pending" ? (
                        <button
                          onClick={() => handleApprove(post.id)}
                          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Təsdiq et
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApprove(post.id, false)}
                          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Yayımdan çıxard
                        </button>
                      )}
                      <button
                        onClick={() => handleFeatured(post.id, !post.featured)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          post.featured
                            ? "text-orange-700 bg-orange-50 hover:bg-orange-100"
                            : "text-purple-700 bg-purple-50 hover:bg-purple-100"
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill={post.featured ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                        {post.featured ? "Önə çıxarılıb" : "Önə çıxart"}
                      </button>
                      <button
                        onClick={() => handleEdit(post.slug)}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Düzəliş
                      </button>
                      <button
                        onClick={() => handleDelete(post.id, post.slug)}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
