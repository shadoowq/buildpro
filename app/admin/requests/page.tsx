"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/app/components/AdminNavbar";

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (currentUser.userType !== "admin") {
      router.push("/login");
      return;
    }
    const savedLang = localStorage.getItem("adminLanguage") as "ar" | "en" | null;
    if (savedLang) setLanguage(savedLang);
    const storedRequests = JSON.parse(localStorage.getItem("requests") || "[]");
    setRequests(storedRequests);
  }, []);

  const handleDelete = (requestId: string) => {
    if (confirm(language === "ar" ? "هل انت متأكد من حذف هذا الطلب؟" : "Are you sure you want to delete this request?")) {
      const updatedRequests = requests.filter((r) => r.id !== requestId);
      localStorage.setItem("requests", JSON.stringify(updatedRequests));
      setRequests(updatedRequests);
    }
  };

  const t = {
    ar: {
      title: "ادارة الطلبات",
      contractorName: "اسم المقاول",
      materialType: "نوع المادة",
      quantity: "الكمية",
      city: "المدينة",
      date: "التاريخ",
      action: "الاجراء",
      noRequests: "لا توجد طلبات",
      delete: "حذف",
    },
    en: {
      title: "Manage Requests",
      contractorName: "Contractor Name",
      materialType: "Material Type",
      quantity: "Quantity",
      city: "City",
      date: "Date",
      action: "Action",
      noRequests: "No requests found",
      delete: "Delete",
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
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.contractorName}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.materialType}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.quantity}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.city}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.date}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{text.action}</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {text.noRequests}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{request.contractorName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.materialType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.quantity} {request.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => handleDelete(request.id)} className="text-red-600 hover:text-red-700 font-medium">
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