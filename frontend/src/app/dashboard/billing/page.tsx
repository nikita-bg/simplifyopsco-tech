"use client";

import { useState, useEffect } from "react";
import { Loader2, CreditCard, Calendar, TrendingUp, ExternalLink } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SubscriptionInfo {
    tier: string;
    status: string;
    current_period_end?: string;
}

export default function BillingPage() {
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            // For now, mock data - will be replaced with real API call
            setSubscription({
                tier: "trial",
                status: "active",
            });
        } catch (error) {
            console.error("Failed to fetch subscription:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCustomerPortal = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/stripe/portal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    store_id: "pending",
                    return_url: window.location.href,
                }),
            });
            const data = await res.json();
            if (data.portal_url) {
                window.location.href = data.portal_url;
            } else {
                alert("Stripe Customer Portal is not configured. Please upgrade your plan first.");
            }
        } catch (error) {
            console.error("Failed to open portal:", error);
            alert("Failed to open billing portal. Please try again.");
        } finally {
            setPortalLoading(false);
        }
    };

    const getPlanName = (tier: string) => {
        switch (tier) {
            case "starter": return "Starter";
            case "pro": return "Pro";
            case "enterprise": return "Enterprise";
            default: return "Free Trial";
        }
    };

    const getPlanPrice = (tier: string) => {
        switch (tier) {
            case "starter": return "$49/month";
            case "pro": return "$149/month";
            case "enterprise": return "Custom";
            default: return "$0";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a14]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a14] text-white p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
                    <p className="text-gray-400">Manage your subscription and billing information</p>
                </div>

                {/* Current Plan */}
                <div className="bg-[#0d0d1a] rounded-xl border border-white/5 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-1">Current Plan</h2>
                            <p className="text-gray-400">
                                {subscription ? getPlanName(subscription.tier) : "Free Trial"}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">
                                {subscription ? getPlanPrice(subscription.tier) : "$0"}
                            </p>
                            <span className="text-sm text-gray-500">
                                {subscription?.status === "active" ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div>

                    {subscription?.current_period_end && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                            <Calendar className="w-4 h-4" />
                            <span>
                                Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-gray-400">Sessions Used</span>
                            </div>
                            <p className="text-xl font-bold">127 / 500</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-gray-400">Billing Cycle</span>
                            </div>
                            <p className="text-xl font-bold">Monthly</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-gray-400">Payment Method</span>
                            </div>
                            <p className="text-xl font-bold">•••• 4242</p>
                        </div>
                    </div>

                    <button
                        onClick={openCustomerPortal}
                        disabled={portalLoading}
                        className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {portalLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4" />
                                Manage Subscription
                                <ExternalLink className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>

                {/* Upgrade Options */}
                {subscription?.tier === "trial" && (
                    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30 p-6">
                        <h3 className="text-xl font-semibold mb-2">Unlock More with Pro</h3>
                        <p className="text-gray-300 mb-4">
                            Get access to 5,000 sessions/month, ultra-low latency, advanced analytics, and priority support.
                        </p>
                        <a
                            href="/pricing"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all"
                        >
                            View Plans
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                )}

                {/* Invoice History */}
                <div className="bg-[#0d0d1a] rounded-xl border border-white/5 p-6 mt-6">
                    <h2 className="text-xl font-semibold mb-4">Invoice History</h2>
                    <div className="text-center py-8 text-gray-500">
                        <p>No invoices yet</p>
                        <p className="text-sm mt-2">Your invoice history will appear here</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
