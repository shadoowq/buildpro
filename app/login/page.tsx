"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");

    // Admin check
    if (email === "admin@buildpro.sa" && password === "Admin@2025") {
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: "admin-001",
          name: "Admin",
          email: "admin@buildpro.sa",
          userType: "admin",
        })
      );
      router.push("/admin");
      return;
    }

    // Normal users
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(
      (u: any) => u.email === email && u.password === password
    );

    if (!user) {
      setError("البريد الإلكتروني أو كلمة المرور غلط");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(user));

    if (user.userType === "contractor") {
      router.push("/dashboard");
    } else if (user.userType === "supplier") {
      router.push("/supplier-requests");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">BuildPro</h1>
          <p className="text-gray-500 mt-1">سجّل دخولك للمتابعة</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 transition-colors"
          >
            دخول
          </button>

          <p className="text-center text-sm text-gray-500">
            مش عندك حساب؟{" "}
            <a href="/signup" className="text-blue-600 font-medium hover:underline">
              سجّل هنا
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}