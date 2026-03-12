"use client";

import Link from "next/link";
import { CheckCircle2, Mic, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PricingPage() {
    const [storeId, setStoreId] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check if user is logged in and has a store
        fetch(`${API_URL}/api/me`, { credentials: "include" })
            .then((res) => {
                if (res.ok) return res.json();
                return null;
            })
            .then((data) => {
                if (data && data.stores && data.stores.length > 0) {
                    setStoreId(data.stores[0].id);
                    setIsLoggedIn(true);
                } else if (data && data.user_id) {
                    setIsLoggedIn(true);
                }
            })
            .catch(() => {});
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center py-24 px-6 bg-[#0a0a14] text-white">
            <div className="absolute top-6 left-6">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </div>

            <div className="flex items-center gap-2.5 mb-12">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">SimplifyOps</span>
            </div>

            <div className="text-center mb-6">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-lg text-gray-400 max-w-xl mx-auto">
                    Choose the plan that fits your business needs. No hidden fees.
                </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#256af4]/20 bg-[#256af4]/5 px-4 py-1.5 text-xs font-medium text-[#256af4] mb-12">
                <span className="flex h-2 w-2 rounded-full bg-[#256af4] animate-pulse" />
                14-Day Free Trial on all plans &mdash; 30 min included
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
                <PricingCard
                    title="Starter"
                    price="$39"
                    plan="starter"
                    storeId={storeId}
                    isLoggedIn={isLoggedIn}
                    desc="Perfect for small stores getting started with voice AI."
                    features={[
                        "100 minutes/month",
                        "500 products",
                        "Standard voice",
                        "Basic analytics",
                        "Email support",
                        "$0.45/min overage",
                    ]}
                    cta="Get Started"
                    highlighted={false}
                />
                <PricingCard
                    title="Growth"
                    price="$99"
                    plan="growth"
                    storeId={storeId}
                    isLoggedIn={isLoggedIn}
                    desc="For growing businesses needing more power."
                    features={[
                        "300 minutes/month",
                        "5,000 products",
                        "Custom brand voice",
                        "Full analytics + transcripts",
                        "Priority support",
                        "$0.35/min overage",
                    ]}
                    cta="Start Free Trial"
                    highlighted={true}
                />
                <PricingCard
                    title="Scale"
                    price="$299"
                    plan="scale"
                    storeId={storeId}
                    isLoggedIn={isLoggedIn}
                    desc="Full control and unlimited scale."
                    features={[
                        "1,000 minutes/month",
                        "Unlimited products",
                        "Multilingual voice",
                        "Full analytics + custom reports",
                        "Dedicated support",
                        "$0.25/min overage",
                    ]}
                    cta="Get Started"
                    highlighted={false}
                />
            </div>
        </div>
    );
}

function PricingCard({ title, price, plan, storeId, isLoggedIn, desc, features, cta, highlighted }: {
    title: string; price: string; plan: string; storeId: string | null; isLoggedIn: boolean; desc: string; features: string[]; cta: string; highlighted: boolean;
}) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        // If not logged in, redirect to sign-up with plan param
        if (!isLoggedIn) {
            window.location.href = `/auth/sign-up?plan=${plan}`;
            return;
        }

        // If logged in but no store, redirect to dashboard (will show onboarding)
        if (!storeId) {
            window.location.href = `/dashboard?plan=${plan}`;
            return;
        }

        // Logged in with a store - create Stripe checkout
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/stripe/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ store_id: storeId, plan }),
            });
            const data = await res.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                alert("Stripe is not configured yet. Please try again later.");
            }
        } catch {
            alert("Failed to start checkout. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-8 rounded-2xl flex flex-col transition-all ${highlighted
                ? "bg-[#0d0d1a] border-2 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.15)] scale-105"
                : "bg-[#0d0d1a] border border-white/5 hover:border-white/20"
            }`}>
            {highlighted && (
                <div className="text-xs font-bold text-blue-400 mb-4 uppercase tracking-wider">Most Popular</div>
            )}
            <h3 className="text-xl font-bold mb-1">{title}</h3>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-extrabold">{price}</span>
                <span className="text-gray-500 text-sm">/month</span>
            </div>
            <p className="text-gray-500 text-sm mb-8">{desc}</p>
            <div className="flex-1 flex flex-col gap-3 mb-8">
                {features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-gray-300">{f}</span>
                    </div>
                ))}
            </div>
            <button
                onClick={handleClick}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 ${highlighted
                    ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                    : "bg-white/5 hover:bg-white/10 border border-white/10"
                }`}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : cta}
            </button>
        </div>
    );
}
