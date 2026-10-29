import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "톡클 | 함께 만드는 수업",
    template: "%s | 톡클",
  },
  description: "참여코드 하나로 채팅·교안·투표·산출물 공유를 한 화면에서. 설치·가입 없는 양방향 강의 플랫폼, 톡클.",
  applicationName: "톡클",
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
