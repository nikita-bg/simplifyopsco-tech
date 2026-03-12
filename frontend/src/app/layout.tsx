import type { Metadata } from "next";
import "./globals.css";
import { FloatingVoiceWidget } from "@/components/VoiceWidget";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "SimplifyOps - AI Voice Assistant for Your Website",
  description:
    "Transform your site into an interactive experience with AI-powered voice assistant. Engage visitors with natural conversation, not just clicks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0f1115] text-slate-100 min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-[#256af4] selection:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        <AuthProvider>
          {children}
          <FloatingVoiceWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
