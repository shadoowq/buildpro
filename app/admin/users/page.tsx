"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/app/components/AdminNavbar";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser.userType !== "admin") {
      router.push("/login");
      return;
    }
    const savedLang = localStorage.getItem("adminLanguage") as "ar" | "en" | null;
    if (savedLang) setLanguage(savedLang);
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    setUsers(storedUsers);
  }, []);

  const handleDelete = (userId: string) => {
    if (confirm(language === "ar" ? "هل انت متأكد من حذف هذا المستخدم؟" : "Are you sure you want to delete this user?")) {
      const updatedUsers = users.filter((u) => u.id !== userId);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
    }
  };

  const t = {
    ar: {
      title: "ادارة المستخدمين",
      name: "الاسم",
      email: "البريد الالكتروني",
      type: "النوع",
      action: "الاجراء",
      noUsers: "لا توجد مستخدمين",
      delete: "حذف",
      contractor: "مقاول",
      supplier: "مورد",
      other: "نوع آخر",
    },
    en: {
      title: "Manage Users",
      name: "Name",
      email: "Email",
      type: "Type",
      action: "Action",
      noUsers: "No users found",
      delete: "Delete",
      contractor: "Contractor",
      supplier: "Supplier",
      other: "Other",
    },
  };

  const text = t[language];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onLanguageChange={(lang) => setLanguage(lang)} />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{text.title}</h1>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.name}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.email}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.type}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.action}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    {text.noUsers}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.userType === "contractor"
                          ? "bg-blue-100 text-blue-700"
                          : user.userType === "supplier"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {user.userType === "contractor" ? text.contractor : user.userType === "supplier" ? text.supplier : text.other}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-700 font-medium">
                        {text.delete}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}