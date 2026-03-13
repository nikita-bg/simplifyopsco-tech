"use client";

import React, { useState } from "react";
import { Globe, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

interface OnboardingProps {
  userId: string;
}

export function Onboarding({ userId }: OnboardingProps) {
  const { refetch } = useStore();
  const [mode, setMode] = useState<"choose" | "shopify" | "website">("choose");
  const [shopDomain, setShopDomain] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
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
    if (!siteUrl) return;
    setLoading(true);
    setError("");
    try {
      const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
      const res = await apiFetch("/api/stores/create", {
        method: "POST",
        body: JSON.stringify({ site_url: url }),
      });
      if (res.ok) {
        await refetch();
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a14] p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">Welcome to SimplifyOps</h1>
          <p className="text-gray-400 text-lg">
            Connect your store to get started with AI voice assistant
          </p>
        </div>

        {mode === "choose" && (
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode("shopify")}
              className="p-8 rounded-2xl bg-[#0d0d1a] border border-white/5 hover:border-[#256af4]/50 transition-all text-left group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Connect Shopify</h3>
              <p className="text-sm text-gray-400 mb-4">
                Install directly from your Shopify store for automatic product sync
              </p>
              <span className="text-sm text-[#256af4] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Connect <ArrowRight className="w-4 h-4" />
              </span>
            </button>

            <button
              onClick={() => setMode("website")}
              className="p-8 rounded-2xl bg-[#0d0d1a] border border-white/5 hover:border-[#256af4]/50 transition-all text-left group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Any Website</h3>
              <p className="text-sm text-gray-400 mb-4">
                Add the voice widget to any site with a simple embed code
              </p>
              <span className="text-sm text-[#256af4] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        )}

        {mode === "shopify" && (
          <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-8">
            <button onClick={() => setMode("choose")} className="text-sm text-gray-400 hover:text-white mb-6 cursor-pointer">
              &larr; Back
            </button>
            <h2 className="text-xl font-bold mb-4">Connect Your Shopify Store</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Shopify Store Domain
                </label>
                <input
                  type="text"
                  placeholder="my-store.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#256af4]/50"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                onClick={handleShopifyConnect}
                disabled={loading || !shopDomain}
                className="w-full py-3 rounded-xl bg-[#256af4] hover:bg-[#1a4bbd] text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                {loading ? "Connecting..." : "Connect Shopify Store"}
              </button>
            </div>
          </div>
        )}

        {mode === "website" && (
          <div className="rounded-2xl bg-[#0d0d1a] border border-white/5 p-8">
            <button onClick={() => setMode("choose")} className="text-sm text-gray-400 hover:text-white mb-6 cursor-pointer">
              &larr; Back
            </button>
            <h2 className="text-xl font-bold mb-4">Add Your Website</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="https://mywebsite.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#256af4]/50"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                onClick={handleWebsiteCreate}
                disabled={loading || !siteUrl}
                className="w-full py-3 rounded-xl bg-[#256af4] hover:bg-[#1a4bbd] text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {loading ? "Creating..." : "Create Store"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
