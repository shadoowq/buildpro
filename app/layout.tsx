import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppProviders from "./components/AppProviders";

export const metadata: Metadata = {
  title: "BuildPro - منصة التسعير",
  description: "منصة تسعير مواد البناء",
  other: { 'color-scheme': 'light' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#22262C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" style={{ colorScheme: 'light' }}>
      <body style={{ margin: 0, padding: 0 }}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}