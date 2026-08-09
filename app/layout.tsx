import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "산길날씨 — 지금 이 산에 가도 될까?",
    template: "%s | 산길날씨",
  },
  description:
    "산 이름 하나로 오늘 날씨·탐방로 개방 여부·등산 컨디션을 3초 안에 확인하는 등산 날씨 앱.",
  applicationName: "SanGil",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "산길날씨",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "산길날씨 — 지금 이 산에 가도 될까?",
    description: "산 이름 하나로 오늘 날씨·탐방로 개방 여부·등산 컨디션을 3초 안에 확인하세요.",
    siteName: "산길날씨",
    locale: "ko_KR",
    type: "website",
  },
};

// 모바일 우선: 초기 스케일 고정, 안전영역 대응
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
