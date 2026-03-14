"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Database,
  Package,
  Clock,
  BarChart3,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KBStatus {
  store_id: string;
  kb_sync_status: "none" | "syncing" | "synced" | "error";
  kb_last_synced: string | null;
  kb_product_count: number;
  kb_char_count: number;
  kb_doc_id: string | null;
  char_limit: number;
  warning_threshold: number;
  is_warning: boolean;
}

interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  product_url?: string;
  source?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function charBarColor(count: number, limit: number): string {
  const pct = count / limit;
  if (pct >= 0.95) return "bg-error";
  if (pct >= 0.8) return "bg-warning";
  return "bg-success";
}

function statusBadge(status: KBStatus["kb_sync_status"]) {
  switch (status) {
    case "synced":
      return { label: "Synced", color: "bg-success/20 text-success border-success/30" };
    case "syncing":
      return { label: "Syncing", color: "bg-warning/20 text-warning border-warning/30 animate-pulse" };
    case "error":
      return { label: "Error", color: "bg-error/20 text-error border-error/30" };
    default:
      return { label: "Not synced", color: "bg-canvas text-muted border-edge" };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function KnowledgeBasePage() {
  const { storeId } = useStore();

  /* State */
  const [kbStatus, setKbStatus] = useState<KBStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /* Form state */
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---- Fetchers ---- */

  const fetchStatus = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await apiFetch(`/api/stores/${storeId}/kb/status`);
      if (res.ok) {
        const data: KBStatus = await res.json();
        setKbStatus(data);
        if (data.kb_sync_status !== "syncing") setSyncing(false);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingStatus(false);
    }
  }, [storeId]);

  const fetchProducts = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await apiFetch(`/api/stores/${storeId}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.products ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingProducts(false);
    }
  }, [storeId]);

  /* Fetch on mount */
  useEffect(() => {
    fetchStatus();
    fetchProducts();
  }, [fetchStatus, fetchProducts]);

  /* Poll while syncing */
  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [syncing, fetchStatus]);

  /* ---- Actions ---- */

  const handleSync = async () => {
    if (!storeId || syncing) return;
    setSyncing(true);
    setKbStatus((prev) => (prev ? { ...prev, kb_sync_status: "syncing" } : prev));
    try {
      await apiFetch(`/api/stores/${storeId}/kb/sync`, { method: "POST" });
    } catch {
      setSyncing(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProductId(null);
    setFormTitle("");
    setFormDescription("");
    setFormPrice("");
    setFormUrl("");
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (p: Product) => {
    setEditingProductId(p.id);
    setFormTitle(p.title);
    setFormDescription(p.description ?? "");
    setFormPrice(String(p.price));
    setFormUrl(p.product_url ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!storeId || !formTitle || !formPrice) return;
    setSaving(true);
    try {
      const body = JSON.stringify({
        store_id: storeId,
        title: formTitle,
        description: formDescription || undefined,
        price: parseFloat(formPrice),
        product_url: formUrl || undefined,
      });

      if (editingProductId !== null) {
        await apiFetch(`/api/stores/${storeId}/products/${editingProductId}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch(`/api/stores/${storeId}/products`, {
          method: "POST",
          body,
        });
      }
      resetForm();
      await Promise.all([fetchProducts(), fetchStatus()]);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!storeId) return;
    if (!window.confirm("Delete this product? This action cannot be undone.")) return;
    try {
      await apiFetch(`/api/stores/${storeId}/products/${productId}`, {
        method: "DELETE",
      });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      await fetchStatus();
    } catch {
      /* ignore */
    }
  };

  /* ---- Derived ---- */
  const badge = statusBadge(kbStatus?.kb_sync_status ?? "none");
  const charPct = kbStatus ? (kbStatus.kb_char_count / kbStatus.char_limit) * 100 : 0;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="max-w-[1200px]">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading mb-1">Knowledge Base</h1>
          <p className="text-sm text-muted">
            Manage your AI agent&apos;s product knowledge
          </p>
        </div>
        <div className="flex gap-2">
            <button
                onClick={handleSync}
                disabled={syncing || !storeId}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-panel border border-edge text-heading text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now"}
            </button>
            <button
                onClick={openAddForm}
                disabled={!storeId}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
                <Plus className="w-4 h-4" />
                Add Product
            </button>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-10">
        <div className="lg:col-span-1 space-y-6">
            {/* ---- Sync Status Card ---- */}
            <div className="bg-panel rounded-xl border border-edge p-5">
            <h2 className="font-semibold text-xs text-muted uppercase tracking-wider mb-4">
                Sync Status
            </h2>

            {loadingStatus ? (
                <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-canvas rounded-lg p-3 border border-edge animate-pulse h-16" />
                ))}
                </div>
            ) : (
                <div className="space-y-3">
                {/* Status */}
                <div className="bg-canvas rounded-lg p-3 border border-edge flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5">Status</p>
                        <div className="flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-muted" />
                            <span className="text-sm font-medium text-heading">Knowledge Base</span>
                        </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}>
                        {badge.label}
                    </span>
                </div>

                {/* Products */}
                <div className="bg-canvas rounded-lg p-3 border border-edge flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5">Products</p>
                        <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-muted" />
                            <span className="text-sm font-medium text-heading">Total Indexed</span>
                        </div>
                    </div>
                     <p className="text-sm font-semibold text-heading">
                        {formatNumber(kbStatus?.kb_product_count ?? 0)}
                    </p>
                </div>

                {/* Last Synced */}
                <div className="bg-canvas rounded-lg p-3 border border-edge flex items-center justify-between">
                   <div>
                        <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5">Last Synced</p>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted" />
                            <span className="text-sm font-medium text-heading">Time</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-heading">
                        {relativeTime(kbStatus?.kb_last_synced ?? null)}
                    </p>
                </div>

                {/* Character Usage */}
                <div className="bg-canvas rounded-lg p-4 border border-edge flex flex-col gap-2">
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-muted" />
                            <span className="text-sm font-medium text-heading">Character limit usage</span>
                        </div>
                        <p className="text-xs font-semibold text-heading">
                            {formatNumber(kbStatus?.kb_char_count ?? 0)} <span className="text-muted font-normal">/ {formatNumber(kbStatus?.char_limit ?? 300000)}</span>
                        </p>
                     </div>
                    <div className="w-full h-1.5 rounded-full bg-body overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${charBarColor(kbStatus?.kb_char_count ?? 0, kbStatus?.char_limit ?? 300000)}`}
                        style={{ width: `${Math.min(charPct, 100)}%` }}
                    />
                    </div>
                </div>
                </div>
            )}
            </div>

            {/* ---- Character Limit Warning ---- */}
            {kbStatus?.is_warning && (
            <div className="flex items-start gap-3 rounded-lg bg-warning/10 border border-warning/20 p-4 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-warning font-medium">
                Your knowledge base is approaching the 300,000 character limit. Consider
                removing products with long descriptions or reducing product count.
                </p>
            </div>
            )}
        </div>

        <div className="lg:col-span-2 space-y-6">
            {/* ---- Inline Add/Edit Form ---- */}
            {showForm && (
                 <div className="bg-panel rounded-xl border border-edge shadow-sm p-5 animation-fade-in relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-edge">
                        <h3 className="text-sm font-semibold text-heading">
                        {editingProductId !== null ? "Edit Product" : "Add Manual Product"}
                        </h3>
                        <button
                        onClick={resetForm}
                        className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors"
                        >
                        <X className="w-4 h-4 text-muted" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-muted mb-1.5 block">
                            Title <span className="text-error">*</span>
                        </label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="Product title"
                            className="w-full bg-canvas rounded-lg px-3 py-2.5 border border-edge text-sm text-heading focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                        />
                        </div>
                        <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-muted mb-1.5 block">
                            Description
                        </label>
                        <textarea
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Product description (optional)"
                            rows={3}
                            className="w-full bg-canvas rounded-lg px-3 py-2.5 border border-edge text-sm text-heading focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors resize-none placeholder-faint"
                        />
                        </div>
                        <div>
                        <label className="text-xs font-medium text-muted mb-1.5 block">
                            Price <span className="text-error">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formPrice}
                            onChange={(e) => setFormPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-canvas rounded-lg px-3 py-2.5 border border-edge text-sm text-heading focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                        />
                        </div>
                        <div>
                        <label className="text-xs font-medium text-muted mb-1.5 block">
                            Product URL
                        </label>
                        <input
                            type="text"
                            value={formUrl}
                            onChange={(e) => setFormUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-canvas rounded-lg px-3 py-2.5 border border-edge text-sm text-heading focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors placeholder-faint"
                        />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-edge">
                        <button
                        onClick={handleSave}
                        disabled={saving || !formTitle || !formPrice}
                        className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                        >
                        {saving ? "Saving..." : editingProductId !== null ? "Update Product" : "Save Product"}
                        </button>
                        <button
                        onClick={resetForm}
                        className="px-5 py-2.5 rounded-lg bg-transparent border text-muted border-transparent text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                        >
                        Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ---- Manual Products Card ---- */}
            <div className={`bg-panel rounded-xl border border-edge overflow-hidden flex flex-col ${showForm ? "opacity-50 pointer-events-none" : ""}`}>
                 <div className="p-5 border-b border-edge">
                     <h2 className="font-semibold text-xs text-muted uppercase tracking-wider">
                         Products List
                     </h2>
                     <p className="text-xs text-muted mt-1">Manage all products currently indexed by the AI agent.</p>
                 </div>

            {/* ---- Products List ---- */}
            {loadingProducts ? (
                 <div className="p-5 space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-canvas rounded-lg p-3 border border-edge animate-pulse h-16" />
                ))}
                </div>
            ) : products.length === 0 ? (
                 <div className="p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-canvas border border-edge flex items-center justify-center mb-3 shadow-sm">
                        <Package className="w-5 h-5 text-muted" />
                    </div>
                    <p className="text-sm font-medium text-heading mb-1">No products indexed</p>
                    <p className="text-xs text-muted max-w-sm mb-4">
                        Sync with Shopify or add manual products to build your AI agent&apos;s knowledge base.
                    </p>
                    <button
                        onClick={openAddForm}
                        disabled={!storeId}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-canvas border border-edge text-heading text-xs font-semibold hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Manually
                    </button>
                </div>
            ) : (
                <div className="divide-y divide-edge max-h-[600px] overflow-y-auto custom-scrollbar">
                {products.map((product) => {
                    const isManual = product.source === "manual" || (product.id < 0);
                    return (
                        <div
                            key={product.id}
                            className="flex items-center gap-4 bg-transparent p-4 hover:bg-white/5 transition-colors group"
                        >
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-heading font-medium truncate mb-0.5">
                                {product.title}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-medium text-muted">
                                ${Number(product.price).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-muted">·</span>
                                <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                    isManual
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-success/10 text-success border-success/20"
                                }`}
                                >
                                {isManual ? "Manual" : "Shopify"}
                                </span>
                            </div>
                        </div>

                        {isManual ? (
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                            onClick={() => openEditForm(product)}
                            className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                            title="Edit product"
                            >
                            <Pencil className="w-4 h-4 text-muted hover:text-heading" />
                            </button>
                            <button
                            onClick={() => handleDelete(product.id)}
                            className="w-8 h-8 rounded-md hover:bg-error/10 flex items-center justify-center cursor-pointer transition-colors"
                            title="Delete product"
                            >
                            <Trash2 className="w-4 h-4 text-error/70 hover:text-error" />
                            </button>
                        </div>
                        ) : (
                        <span className="text-[10px] text-faint font-medium uppercase tracking-wider shrink-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            View Only
                        </span>
                        )}
                    </div>
                    );
                })}
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
}
