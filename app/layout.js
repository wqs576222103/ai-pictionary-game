import "./globals.css";

export const metadata = {
  title: "AI 你画我猜",
  description: "在线画图，由 Gemini API 来猜你画的是什么。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
