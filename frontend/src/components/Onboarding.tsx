"use client";

import React, { useState } from "react";
import { Store, Globe, Layers, ShoppingBag, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";
import { OnboardingProgress } from "@/components/OnboardingProgress";

interface OnboardingProps {
  userId: string;
}

type OnboardingView = "form" | "progress" | "shopify";
type StoreType = "online_store" | "service_business" | "lead_gen";

export function Onboarding({ userId }: OnboardingProps) {
  const { refetch } = useStore();
  const [view, setView] = useState<OnboardingView>("form");
  const [storeName, setStoreName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [storeType, setStoreType] = useState<StoreType>("online_store");
  const [shopDomain, setShopDomain] = useState("");
  const [createdStoreId, setCreatedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleShopifyConnect = async () => {
    if (!shopDomain) return;
    setLoading(true);
    setError("");
    try {
      const domain = shopDomain.includes(".myshopify.com")
        ? shopDomain
        : `${shopDomain}.myshopify.com`;
      const res = await apiFetch(
        `/shopify/auth?shop=${encodeURIComponent(domain)}&user_id=${encodeURIComponent(userId)}`
      );
      const data = await res.json();
      if (data.install_url) {
        window.location.href = data.install_url;
      } else {
        setError("Failed to start Shopify connection");
      }
    } catch {
      setError("Failed to connect to Shopify. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWebsiteCreate = async () => {
    if (!storeName || !siteUrl) return;
    setLoading(true);
    setError("");
    try {
      const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
      const res = await apiFetch("/api/stores/create", {
        method: "POST",
        body: JSON.stringify({
          store_name: storeName,
          site_url: url,
          store_type: storeType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedStoreId(data.store_id);
        setView("progress");
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to create store");
      }
    } catch {
      setError("Failed to create store. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <div className="max-w-lg w-full">
        {view === "form" && (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-heading mb-3">Welcome to SimplifyOps</h1>
              <p className="text-muted text-lg">
                Set up your AI voice assistant in minutes
              </p>
            </div>

            <div className="rounded-2xl bg-panel border border-white/5 p-8">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
                    Store Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                    <input
                      type="text"
                      placeholder="My Awesome Store"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full bg-white/[0.04] border border-edge rounded-xl pl-10 pr-4 py-3 text-sm text-heading placeholder-faint outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                    <input
                      type="text"
                      placeholder="https://mywebsite.com"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      className="w-full bg-white/[0.04] border border-edge rounded-xl pl-10 pr-4 py-3 text-sm text-heading placeholder-faint outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
                    Store Type
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                    <select
                      value={storeType}
                      onChange={(e) => setStoreType(e.target.value as StoreType)}
                      className="w-full bg-white/[0.04] border border-edge rounded-xl pl-10 pr-4 py-3 text-sm text-heading outline-none focus:border-primary/50 appearance-none cursor-pointer"
                    >
                      <option value="online_store">Online Store</option>
                      <option value="service_business">Service Business</option>
                      <option value="lead_gen">Lead Generation</option>
                    </select>
                  </div>
                </div>

                {error && <p className="text-sm text-error">{error}</p>}

                <button
                  onClick={handleWebsiteCreate}
                  disabled={loading || !storeName || !siteUrl}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {loading ? "Creating..." : "Get Started"}
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-panel text-faint">or</span>
                </div>
              </div>

              <button
                onClick={() => { setError(""); setView("shopify"); }}
                className="w-full py-3 rounded-xl border border-white/10 hover:border-primary/50 text-muted hover:text-heading font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Connect Shopify Instead
              </button>
            </div>
          </>
        )}

        {view === "shopify" && (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-heading mb-3">Connect Shopify</h1>
              <p className="text-muted text-lg">
                Import your products automatically
              </p>
            </div>

            <div className="rounded-2xl bg-panel border border-white/5 p-8">
              <button
                onClick={() => { setError(""); setView("form"); }}
                className="text-sm text-muted hover:text-heading mb-6 cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
                    Shopify Store Domain
                  </label>
                  <div className="relative">
                    <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                    <input
                      type="text"
                      placeholder="my-store.myshopify.com"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      className="w-full bg-white/[0.04] border border-edge rounded-xl pl-10 pr-4 py-3 text-sm text-heading placeholder-faint outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-error">{error}</p>}
                <button
                  onClick={handleShopifyConnect}
                  disabled={loading || !shopDomain}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                  {loading ? "Connecting..." : "Connect Shopify Store"}
                </button>
              </div>
            </div>
          </>
        )}

        {view === "progress" && createdStoreId && (
          <OnboardingProgress storeId={createdStoreId} />
        )}
      </div>
    </div>
  );
}
