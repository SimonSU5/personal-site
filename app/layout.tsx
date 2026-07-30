import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { Poppins, Inter, Space_Grotesk } from "next/font/google";

// 字体配置 - vCard 使用 Poppins
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

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
    <html lang="zh-CN" data-scroll-behavior="smooth" className={`${poppins.variable} ${inter.variable} ${spaceGrotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* 配色防闪：在首屏绘制前同步读 localStorage 设 data-theme。
            theme-id 白名单需与 lib/themes.ts 的 THEMES 保持同步。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var ok=['gold-dark','champagne-light','steel-blue','copper','teal','cobalt','mist-purple','moss','wine'];var t=localStorage.getItem('theme');if(!t||ok.indexOf(t)<0){t='gold-dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='gold-dark';}})();`,
          }}
        />
        {/* ionicons */}
        <script
          type="module"
          src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"
        ></script>
        <script
          noModule
          src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"
        ></script>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
