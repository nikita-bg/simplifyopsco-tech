"use client";

import { useState, useEffect } from "react";
import { Loader2, CreditCard, Calendar, TrendingUp, ExternalLink, Zap } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

interface SubscriptionInfo {
    tier: string;
    status: string;
    current_period_end?: string | null;
    sessions_used: number;
    sessions_limit: number;
    payment_method_last4?: string | null;
}

export default function BillingPage() {
    const { storeId } = useStore();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        if (!storeId) {
            setLoading(false);
            return;
        }
        fetchSubscription();
    }, [storeId]);

    const fetchSubscription = async () => {
        if (!storeId) return;
        try {
            const res = await apiFetch(`/api/stores/${storeId}/subscription`);
            if (res.ok) {
                const data = await res.json();
                setSubscription(data);
            }
        } catch (error) {
            console.error("Failed to fetch subscription:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCustomerPortal = async () => {
        if (!storeId) return;
        setPortalLoading(true);
        try {
            const res = await apiFetch("/api/stripe/portal", {
                method: "POST",
                body: JSON.stringify({
                    store_id: storeId,
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
            case "growth": return "Growth";
            case "scale": return "Scale";
            default: return "Free Trial";
        }
    };

    const getPlanPrice = (tier: string) => {
        switch (tier) {
            case "starter": return "$39";
            case "growth": return "$99";
            case "scale": return "$299";
            default: return "$0";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const usagePercent = subscription
        ? Math.min(100, ((subscription.sessions_used ?? 0) / (subscription.sessions_limit || 30)) * 100)
        : 0;

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-heading mb-1">Billing & Subscription</h1>
                <p className="text-sm text-muted">Manage your subscription and billing information</p>
            </div>

            {/* Current Plan */}
            <div className="bg-raised rounded-2xl border border-edge p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-heading mb-1">Current Plan</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-muted">{subscription ? getPlanName(subscription.tier) : "Free Trial"}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                subscription?.status === "active" ? "bg-success/10 text-success" :
                                subscription?.status === "trialing" ? "bg-warning/10 text-warning" :
                                "bg-white/5 text-faint"
                            }`}>
                                {subscription?.status === "active" ? "Active" : subscription?.status === "trialing" ? "Trial" : "Inactive"}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-heading">
                            {subscription ? getPlanPrice(subscription.tier) : "$0"}
                        </p>
                        <span className="text-xs text-faint">/month</span>
                    </div>
                </div>

                {subscription?.current_period_end && (
                    <div className="flex items-center gap-2 text-sm text-muted mb-6">
                        <Calendar className="w-4 h-4" />
                        <span>
                            Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                    </div>
                )}

                {/* Usage meter */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-faint uppercase tracking-wider font-medium">Minutes Used</span>
                        <span className="text-sm font-semibold text-heading">
                            {subscription?.sessions_used ?? 0} / {subscription?.sessions_limit ?? 30}
                        </span>
                    </div>
                    <div className="w-full bg-canvas rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-error" : usagePercent > 50 ? "bg-warning" : "bg-primary"}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-canvas rounded-xl p-4 border border-edge">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-success" />
                            <span className="text-sm text-muted">Billing Cycle</span>
                        </div>
                        <p className="text-lg font-bold text-heading">Monthly</p>
                    </div>
                    <div className="bg-canvas rounded-xl p-4 border border-edge">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-muted">Payment Method</span>
                        </div>
                        <p className="text-lg font-bold text-heading">
                            {subscription?.payment_method_last4
                                ? `**** ${subscription.payment_method_last4}`
                                : "No card on file"}
                        </p>
                    </div>
                </div>

                <button
                    onClick={openCustomerPortal}
                    disabled={portalLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-white"
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
            {(!subscription || subscription.tier === "trial") && (
                <div className="bg-gradient-to-br from-primary/15 to-purple-500/15 rounded-2xl border border-primary/20 p-6 mb-6">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-heading mb-1">Unlock More with Growth</h3>
                            <p className="text-muted text-sm">
                                Get access to 300 minutes/month, custom brand voice, full analytics with transcripts, and priority support.
                            </p>
                        </div>
                    </div>
                    <a
                        href="/pricing"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl font-semibold transition-all text-white"
                    >
                        View Plans
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            )}

            {/* Invoice History */}
            <div className="bg-raised rounded-2xl border border-edge p-6">
                <h2 className="text-base font-semibold text-heading mb-4">Invoice History</h2>
                <div className="text-center py-10">
                    <CreditCard className="w-8 h-8 text-faint mx-auto mb-2 opacity-40" />
                    <p className="text-muted text-sm">No invoices yet</p>
                    <p className="text-faint text-xs mt-1">Your invoice history will appear here</p>
                </div>
            </div>
        </div>
    );
}
