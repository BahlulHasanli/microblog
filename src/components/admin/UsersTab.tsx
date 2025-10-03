import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  fullname: string;
  username: string;
  avatar: string;
  is_admin: boolean;
  created_at: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users/list");
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("İstifadəçilər yüklənərkən xəta:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Bu istifadəçini silmək istədiyinizə əminsiniz?")) return;

    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("İstifadəçi silindi");
        loadUsers();
      } else {
        alert(data.message || "Xəta baş verdi");
      }
    } catch (error) {
      console.error("Silmə xətası:", error);
      alert("Xəta baş verdi");
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          fullname: editingUser.fullname,
          email: editingUser.email,
          username: editingUser.username,
          is_admin: editingUser.is_admin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("İstifadəçi yeniləndi");
        setEditingUser(null);
        loadUsers();
      } else {
        alert(data.message || "Xəta baş verdi");
      }
    } catch (error) {
      console.error("Yeniləmə xətası:", error);
      alert("Xəta baş verdi");
    }
  };

  return (
    <div className="p-8">
      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-base-600">Yüklənir...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <p className="text-base-500 font-medium">İstifadəçi tapılmadı</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-base-200">
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  İstifadəçi
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  İstifadəçi adı
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Admin
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Qeydiyyat tarixi
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                  Əməliyyatlar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-base-100 hover:bg-base-50 transition-all duration-200"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-base-100"
                        src={user.avatar}
                        alt={user.fullname}
                      />
                      <div className="text-sm font-medium text-slate-900">
                        {user.fullname}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-base-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-base-700">
                    <span className="font-medium">@{user.username}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {user.is_admin ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs font-medium text-green-700">
                            Admin
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-base-300"></div>
                          <span className="text-xs font-medium text-base-600">
                            İstifadəçi
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-xs text-base-500">
                    {new Date(user.created_at).toLocaleDateString("az-AZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
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
                        onClick={() => handleDelete(user.id)}
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

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-8 border border-base-200 w-full max-w-lg rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-nouvelr-bold text-slate-900">
                  İstifadəçini redaktə et
                </h3>
                <p className="text-sm text-base-500 mt-1">
                  Məlumatları dəyişdirin
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-100 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-base-600"
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
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-base-700 mb-2">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={editingUser.fullname}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, fullname: e.target.value })
                  }
                  className="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  className="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-700 mb-2">
                  İstifadəçi adı
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base-500">
                    @
                  </span>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        username: e.target.value,
                      })
                    }
                    className="block w-full border border-base-300 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="pt-4 pb-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editingUser.is_admin}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          is_admin: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-slate-900 border-base-300 rounded focus:ring-slate-900 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-900 group-hover:text-slate-700">
                      Admin hüququ
                    </span>
                    <p className="text-xs text-base-500">
                      Bu istifadəçiyə admin hüququ verin
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-base-200">
              <button
                onClick={handleUpdate}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Yadda saxla
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-transparent border border-base-300 text-base-700 px-4 py-2.5 rounded-lg font-medium hover:bg-base-100 transition-colors"
              >
                Ləğv et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
