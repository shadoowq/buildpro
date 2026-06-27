"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/app/components/AdminNavbar";

export default function AdminPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [stats, setStats] = useState({
    totalUsers: 0,
    contractors: 0,
    suppliers: 0,
    totalRequests: 0,
    totalQuotes: 0,
  });

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser.userType !== "admin") {
      router.push("/login");
      return;
    }

    const savedLang = localStorage.getItem("adminLanguage") as "ar" | "en" | null;
    if (savedLang) setLanguage(savedLang);

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const quotes = JSON.parse(localStorage.getItem("quotes") || "[]");

    setStats({
      totalUsers: users.length,
      contractors: users.filter((u: any) => u.userType === "contractor").length,
      suppliers: users.filter((u: any) => u.userType === "supplier").length,
      totalRequests: requests.length,
      totalQuotes: quotes.length,
    });

    const handleLangChange = () => {
      const newLang = localStorage.getItem("adminLanguage") as "ar" | "en" | null;
      if (newLang) setLanguage(newLang);
    };

    window.addEventListener("adminLangChanged", handleLangChange);
    return () => window.removeEventListener("adminLangChanged", handleLangChange);
  }, []);

  const t = {
    ar: {
      dashboard: "لوحة التحكم",
      welcome: "مرحباً بك في لوحة تحكم BuildPro",
      totalUsers: "اجمالي المستخدمين",
      contractors: "المقاولين",
      suppliers: "الموردين",
      totalRequests: "اجمالي الطلبات",
      totalQuotes: "اجمالي العروض",
      manageUsers: "ادارة المستخدمين",
      viewDeleteUsers: "عرض وحذف المستخدمين",
      manageRequests: "ادارة الطلبات",
      viewRequests: "عرض كل طلبات التسعير",
      manageQuotes: "ادارة العروض",
      viewQuotes: "عرض كل عروض الاسعار",
    },
    en: {
      dashboard: "Dashboard",
      welcome: "Welcome to BuildPro Admin Panel",
      totalUsers: "Total Users",
      contractors: "Contractors",
      suppliers: "Suppliers",
      totalRequests: "Total Requests",
      totalQuotes: "Total Quotes",
      manageUsers: "Manage Users",
      viewDeleteUsers: "View and delete users",
      manageRequests: "Manage Requests",
      viewRequests: "View all pricing requests",
      manageQuotes: "Manage Quotes",
      viewQuotes: "View all price quotes",
    },
  };

  const text = t[language];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onLanguageChange={(lang) => setLanguage(lang)} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{text.dashboard}</h1>
        <p className="text-gray-500 mb-8">{text.welcome}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">{text.totalUsers}</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">{text.contractors}</p>
            <p className="text-3xl font-bold text-blue-600">{stats.contractors}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">{text.suppliers}</p>
            <p className="text-3xl font-bold text-green-600">{stats.suppliers}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">{text.totalRequests}</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRequests}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">{text.totalQuotes}</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalQuotes}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/admin/users" className="bg-white rounded-2xl border border-gray-100 p-6 block hover:border-blue-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-gray-900 mb-1">{text.manageUsers}</h3>
            <p className="text-sm text-gray-500">{text.viewDeleteUsers}</p>
          </a>
          <a href="/admin/requests" className="bg-white rounded-2xl border border-gray-100 p-6 block hover:border-blue-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-gray-900 mb-1">{text.manageRequests}</h3>
            <p className="text-sm text-gray-500">{text.viewRequests}</p>
          </a>
          <a href="/admin/quotes" className="bg-white rounded-2xl border border-gray-100 p-6 block hover:border-blue-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-gray-900 mb-1">{text.manageQuotes}</h3>
            <p className="text-sm text-gray-500">{text.viewQuotes}</p>
          </a>
        </div>
      </div>
    </div>
  );
}