"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/app/components/AdminNavbar";

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser.userType !== "admin") {
      router.push("/login");
      return;
    }
    const savedLang = localStorage.getItem("adminLanguage") as "ar" | "en" | null;
    if (savedLang) setLanguage(savedLang);
    const storedQuotes = JSON.parse(localStorage.getItem("quotes") || "[]");
    setQuotes(storedQuotes);
  }, []);

  const handleDelete = (quoteId: string) => {
    if (confirm(language === "ar" ? "هل انت متأكد من حذف هذا العرض؟" : "Are you sure you want to delete this quote?")) {
      const updatedQuotes = quotes.filter((q) => q.id !== quoteId);
      localStorage.setItem("quotes", JSON.stringify(updatedQuotes));
      setQuotes(updatedQuotes);
    }
  };

  const t = {
    ar: {
      title: "ادارة العروض",
      supplierName: "اسم المورد",
      request: "الطلب",
      price: "السعر",
      status: "الحالة",
      date: "التاريخ",
      action: "الاجراء",
      noQuotes: "لا توجد عروض",
      delete: "حذف",
      pending: "قيد الانتظار",
      accepted: "مقبول",
      rejected: "مرفوض",
      sar: "ريال",
    },
    en: {
      title: "Manage Quotes",
      supplierName: "Supplier Name",
      request: "Request",
      price: "Price",
      status: "Status",
      date: "Date",
      action: "Action",
      noQuotes: "No quotes found",
      delete: "Delete",
      pending: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      sar: "SAR",
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
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.supplierName}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.request}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.price}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.status}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.date}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.action}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {text.noQuotes}
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{quote.supplierName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{quote.requestId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{quote.price} {text.sar}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        quote.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : quote.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {quote.status === "pending" ? text.pending : quote.status === "accepted" ? text.accepted : text.rejected}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(quote.createdAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => handleDelete(quote.id)} className="text-red-600 hover:text-red-700 font-medium">
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