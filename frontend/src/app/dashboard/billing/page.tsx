"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, CreditCard, Calendar, ExternalLink, Zap,
  Check, AlertTriangle, Clock,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

interface SubscriptionInfo {
  tier: string;
  status: string;
  minutes_used: number;
  minutes_limit: number;
  current_period_end?: string | null;
  payment_method_last4?: string | null;
  trial_ends_at?: string | null;
  is_trial_expired: boolean;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    minutes: 100,
    features: ["100 minutes/month", "1 AI voice agent", "Basic analytics", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: 79,
    minutes: 400,
    features: ["400 minutes/month", "Custom voice & personality", "Full analytics + transcripts", "Priority support"],
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: 199,
    minutes: 2000,
    features: ["2,000 minutes/month", "All Growth features", "Dedicated account manager", "Custom integrations"],
  },
];

export default function BillingPage() {
  const { storeId } = useStore();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const planCardsRef = useRef<HTMLDivElement>(null);

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

  const handleUpgrade = async (plan: string) => {
    if (!storeId) return;
    setUpgradeLoading(plan);
    try {
      const res = await apiFetch("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ store_id: storeId, plan }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setUpgradeLoading(null);
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

  const scrollToPlans = () => {
    planCardsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const minutesUsed = subscription?.minutes_used ?? 0;
  const minutesLimit = subscription?.minutes_limit ?? 30;
  const usagePercent = Math.min(100, (minutesUsed / minutesLimit) * 100);
  const usageRatio = minutesUsed / minutesLimit;

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const isTrial = subscription?.tier === "trial";
  const isPaid = subscription && subscription.tier !== "trial";

  const getUsageBarColor = () => {
    if (usagePercent > 80) return "bg-error";
    if (usagePercent > 50) return "bg-warning";
    return "bg-primary";
  };

  const getPlanButtonLabel = (planId: string) => {
    if (isTrial) return "Start Plan";
    if (!subscription) return "Start Plan";
    const currentIndex = PLANS.findIndex((p) => p.id === subscription.tier);
    const targetIndex = PLANS.findIndex((p) => p.id === planId);
    if (targetIndex > currentIndex) return "Upgrade";
    if (targetIndex < currentIndex) return "Downgrade";
    return "Current Plan";
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-heading mb-1">Billing & Subscription</h1>
        <p className="text-sm text-muted">Manage your plan, usage, and billing information</p>
      </div>

      {/* Trial Banner */}
      {isTrial && !subscription.is_trial_expired && (
        <div className="bg-gradient-to-r from-primary/20 to-blue-400/20 rounded-2xl border border-primary/30 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-heading">Free Trial</h3>
                <p className="text-sm text-muted">
                  {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"} remaining
                </p>
              </div>
            </div>
            <button
              onClick={scrollToPlans}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover rounded-xl font-semibold text-sm transition-all text-white cursor-pointer"
            >
              Choose a Plan
            </button>
          </div>
        </div>
      )}

      {isTrial && subscription.is_trial_expired && (
        <div className="bg-gradient-to-r from-error/15 to-red-500/15 rounded-2xl border border-error/30 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-heading">Trial Expired</h3>
                <p className="text-sm text-muted">
                  Your free trial has expired. Choose a plan to keep your AI agent active.
                </p>
              </div>
            </div>
            <button
              onClick={scrollToPlans}
              className="px-5 py-2.5 bg-error hover:bg-error/80 rounded-xl font-semibold text-sm transition-all text-white cursor-pointer"
            >
              Choose a Plan
            </button>
          </div>
        </div>
      )}

      {/* Usage Meter Card */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-base font-semibold text-heading mb-4">Usage This Period</h2>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-2xl font-bold text-heading">
            {minutesUsed} <span className="text-base font-normal text-muted">of {minutesLimit} minutes</span>
          </p>
          <span className="text-sm font-medium text-muted">{Math.round(usagePercent)}%</span>
        </div>
        <div className="w-full bg-canvas rounded-full h-3 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all ${getUsageBarColor()}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        {usageRatio > 1 && (
          <div className="flex items-center gap-2 text-error text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>You&apos;ve exceeded your plan limit. Your agent may be disabled at 110%.</span>
          </div>
        )}
        {usageRatio > 0.8 && usageRatio <= 1 && (
          <div className="flex items-center gap-2 text-warning text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>You&apos;re approaching your limit. Upgrade for more minutes.</span>
          </div>
        )}
      </div>

      {/* Plan Cards Grid */}
      <div ref={planCardsRef} className="mb-6">
        <h2 className="text-base font-semibold text-heading mb-4">Plans</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = subscription?.tier === plan.id;
            const buttonLabel = getPlanButtonLabel(plan.id);

            return (
              <div
                key={plan.id}
                className={`relative glass-card p-6 flex flex-col ${
                  plan.popular
                    ? "!border-primary shadow-lg shadow-primary/10"
                    : ""
                } ${isCurrentPlan ? "opacity-80" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-primary rounded-full text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 bg-success/20 text-success rounded-full text-xs font-semibold">
                      Current Plan
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-bold text-heading mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-heading">${plan.price}</span>
                  <span className="text-sm text-faint">/month</span>
                </div>
                <p className="text-sm text-muted mb-4">{plan.minutes.toLocaleString()} minutes/month</p>

                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-faint cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgradeLoading === plan.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-primary hover:bg-primary-hover text-white"
                        : "bg-white/5 hover:bg-white/10 text-heading border border-edge"
                    } disabled:opacity-50`}
                  >
                    {upgradeLoading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        {buttonLabel}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Details Card (paid plans only) */}
      {isPaid && (
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-heading mb-4">Billing Details</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-canvas rounded-xl p-4 border border-edge">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-muted">Payment Method</span>
              </div>
              <p className="text-lg font-bold text-heading">
                {subscription.payment_method_last4
                  ? `**** ${subscription.payment_method_last4}`
                  : "No card on file"}
              </p>
            </div>
            <div className="bg-canvas rounded-xl p-4 border border-edge">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-success" />
                <span className="text-sm text-muted">Next Renewal</span>
              </div>
              <p className="text-lg font-bold text-heading">
                {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : "N/A"}
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
      )}
    </div>
  );
}
