"use client";

import Link from "next/link";
import { CheckCircle2, Mic, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PricingPage() {
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
                <span className="text-lg font-bold">Vocalize AI</span>
            </div>

            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-lg text-gray-400 max-w-xl mx-auto">
                    Choose the plan that fits your business needs. No hidden fees.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
                <PricingCard
                    title="Starter"
                    price="$49"
                    plan="starter"
                    desc="Perfect for side projects and small sites."
                    features={["500 voice sessions/mo", "Standard Voice AI", "Basic Analytics", "Email Support"]}
                    cta="Get Started"
                    highlighted={false}
                />
                <PricingCard
                    title="Pro"
                    price="$149"
                    plan="pro"
                    desc="For growing businesses needing power."
                    features={["5,000 voice sessions/mo", "Ultra-Low Latency", "Advanced Analytics", "Custom CRM Integrations", "Priority Support"]}
                    cta="Start Free Trial"
                    highlighted={true}
                />
                <PricingCard
                    title="Enterprise"
                    price="Custom"
                    plan="enterprise"
                    desc="Full control and unlimited scale."
                    features={["Unlimited sessions", "Dedicated Infrastructure", "Custom Voice Cloning", "SLA & On-prem Options", "24/7 Dedicated Support"]}
                    cta="Contact Sales"
                    highlighted={false}
                />
            </div>
        </div>
    );
}

function PricingCard({ title, price, plan, desc, features, cta, highlighted }: {
    title: string; price: string; plan: string; desc: string; features: string[]; cta: string; highlighted: boolean;
}) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (plan === "enterprise") {
            window.location.href = "mailto:sales@simplifyops.co?subject=Enterprise Plan Inquiry";
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/stripe/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ store_id: "pending", plan }),
            });
            const data = await res.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                // Stripe not configured — redirect to sign up
                window.location.href = "/auth/sign-up";
            }
        } catch {
            window.location.href = "/auth/sign-up";
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
                {price !== "Custom" && <span className="text-gray-500 text-sm">/month</span>}
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
