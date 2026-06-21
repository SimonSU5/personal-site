import type { Metadata } from "next";
import "./globals.css";
import { StyleProvider } from "@/lib/contexts/StyleContext";

export const metadata: Metadata = {
  title: "Simon 的作品集",
  description: "全栈开发者个人网站",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <StyleProvider>{children}</StyleProvider>
      </body>
    </html>
  );
}
