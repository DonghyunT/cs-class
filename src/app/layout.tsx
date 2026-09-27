import type { Metadata } from "next";
import localFont from "next/font/local";
import { DemoProvider } from "@/components/demo-provider";
import "./globals.css";
import "./experience.css";
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});
export const metadata: Metadata = {
  title: "CS Class · 즐거운 정보 교실",
  description: "생각하고, 시도하고, 발견하는 즐거운 정보 교실",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={pretendard.variable}
      data-scroll-behavior="smooth"
    >
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
