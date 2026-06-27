"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  onLanguageChange?: (lang: "ar" | "en") => void;
}

export default function AdminNavbar({ onLanguageChange }: Props) {
  const router = useRouter();
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const savedLang = localStorage.getItem("adminLanguage") as "ar" | "en" | null;
    if (savedLang) setLanguage(savedLang);
  }, []);

  const handleLanguageChange = () => {
    const newLang = language === "ar" ? "en" : "ar";
    setLanguage(newLang);
    localStorage.setItem("adminLanguage", newLang);
    if (onLanguageChange) onLanguageChange(newLang);
  };

  const t = {
    ar: {
      home: "الرئيسية",
      dashboard: "لوحة التحكم",
      users: "المستخدمين",
      requests: "الطلبات",
      quotes: "العروض",
      logout: "خروج",
    },
    en: {
      home: "Home",
      dashboard: "Dashboard",
      users: "Users",
      requests: "Requests",
      quotes: "Quotes",
      logout: "Logout",
    },
  };

  const text = t[language];

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    router.push("/login");
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold text-gray-900">BuildPro</span>
        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
          Admin
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm text-gray-600 font-medium hover:text-blue-600">
          {text.home}
        </Link>
        <Link href="/admin" className="text-sm text-gray-600 font-medium hover:text-blue-600">
          {text.dashboard}
        </Link>
        <Link href="/admin/users" className="text-sm text-gray-600 font-medium hover:text-blue-600">
          {text.users}
        </Link>
        <Link href="/admin/requests" className="text-sm text-gray-600 font-medium hover:text-blue-600">
          {text.requests}
        </Link>
        <Link href="/admin/quotes" className="text-sm text-gray-600 font-medium hover:text-blue-600">
          {text.quotes}
        </Link>
        <button
          onClick={handleLanguageChange}
          className="text-sm text-gray-600 font-medium border border-gray-300 rounded px-3 py-1 hover:border-blue-400"
        >
          {language === "ar" ? "EN" : "AR"}
        </button>
        <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 font-medium">
          {text.logout}
        </button>
      </div>
    </div>
  );
}