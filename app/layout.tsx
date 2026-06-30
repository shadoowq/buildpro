import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildPro - منصة التسعير",
  description: "منصة تسعير مواد البناء",
  other: { 'color-scheme': 'light' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" style={{ colorScheme: 'light' }}>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}