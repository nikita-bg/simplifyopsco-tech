import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login — Vocalize AI",
    description: "Sign in to your Vocalize AI dashboard.",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-primary/15 blur-[120px] rounded-full pointer-events-none opacity-40" />
            <div className="relative z-10 w-full max-w-md px-4">{children}</div>
        </div>
    );
}
