import type { Metadata } from "next";
import "./globals.css";
import { VoiceWidget } from "@/components/voice/VoiceWidget";
import { ChatWidget } from "@/components/chat/ChatWidget";

export const metadata: Metadata = {
  title: "Vocalize AI — Your Website, Now With a Voice",
  description:
    "Transform your website into an interactive voice experience. Vocalize AI is the first AI Voice Copilot that engages visitors with natural conversation, handles bookings, answers questions, and navigates — all through voice.",
  keywords: [
    "voice AI",
    "AI assistant",
    "website voice",
    "conversational AI",
    "voice chatbot",
    "AI copilot",
    "web automation",
    "voice booking",
  ],
  openGraph: {
    title: "Vocalize AI — Your Website, Now With a Voice",
    description:
      "The first AI Voice Copilot for websites. Engage visitors with natural voice conversation.",
    type: "website",
    siteName: "Vocalize AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vocalize AI — Your Website, Now With a Voice",
    description:
      "The first AI Voice Copilot for websites. Engage visitors with natural voice conversation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col overflow-x-hidden antialiased">
        {children}
        <VoiceWidget />
        <ChatWidget />
      </body>
    </html>
  );
}

