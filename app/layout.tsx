import { appPath } from "@/lib/paths";
import localFont from "next/font/local";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineRegistration } from "./install";
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});
export const metadata: Metadata = {
  manifest: appPath("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    title: "솔로 레벨업",
    statusBarStyle: "default",
  },
  icons: { icon: appPath("/icon.svg"), apple: appPath("/icon-192.png") },
  title: "SOLO LEVELUP — 나의 성장 기록",
  description:
    "오늘의 작은 기록이 내일의 나를 바꿉니다. 나만의 성장 항목과 레벨업 대시보드.",
};
export const viewport: Viewport = {
  themeColor: "#f8f9fc",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={pretendard.variable}>
        <OfflineRegistration />
        {children}
      </body>
    </html>
  );
}
