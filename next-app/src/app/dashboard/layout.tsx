import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = {
    title: "Dashboard — Vocalize AI",
    description:
        "Manage your voice AI assistant, view analytics, and configure settings.",
};

const navItems = [
    { label: "Overview", href: "/dashboard", icon: "dashboard" },
    { label: "Conversations", href: "/dashboard/conversations", icon: "forum" },
    {
        label: "Knowledge Base",
        href: "/dashboard/knowledge",
        icon: "menu_book",
    },
    { label: "Products", href: "/dashboard/products", icon: "inventory_2" },
    { label: "Orders", href: "/dashboard/orders", icon: "receipt_long" },
    {
        label: "Bookings",
        href: "/dashboard/bookings",
        icon: "calendar_month",
    },
    { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const displayName =
        user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
    const displayEmail = user?.email || "";

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark">
            {/* Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 bg-surface-dark">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-3 px-6 h-16 border-b border-white/10"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <span className="material-symbols-outlined text-2xl">
                            graphic_eq
                        </span>
                    </div>
                    <span className="text-lg font-bold text-white">Vocalize AI</span>
                </Link>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">
                                {item.icon}
                            </span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* User section with logout */}
                <div className="px-3 py-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {displayName}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                        </div>
                    </div>
                    <form action={signOut} className="mt-2">
                        <button
                            type="submit"
                            id="dashboard-logout-btn"
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">logout</span>
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Top bar */}
                <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 border-b border-white/10 bg-background-dark/80 backdrop-blur-lg">
                    <div className="flex items-center gap-4">
                        <button
                            id="dashboard-mobile-menu-btn"
                            className="lg:hidden text-slate-400 hover:text-white"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h2 className="text-lg font-semibold text-white">Dashboard</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400 hidden sm:block">
                            {displayEmail}
                        </span>
                        <button
                            id="dashboard-notifications-btn"
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
