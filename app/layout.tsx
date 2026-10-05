import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeetCode Review Deck",
  description: "用间隔复习掌握 Blind 75 与 NeetCode 150。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
