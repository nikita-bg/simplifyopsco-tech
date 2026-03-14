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
      return { label: "Synced", color: "bg-success/20 text-success" };
    case "syncing":
      return { label: "Syncing", color: "bg-warning/20 text-warning animate-pulse" };
    case "error":
      return { label: "Error", color: "bg-error/20 text-error" };
    default:
      return { label: "Not synced", color: "bg-white/10 text-muted" };
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
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-heading mb-1">Knowledge Base</h1>
        <p className="text-sm text-muted">
          Manage your AI agent&apos;s product knowledge
        </p>
      </div>

      {/* ---- Sync Status Card ---- */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xs text-faint uppercase tracking-widest">
            Sync Status
          </h2>
          <button
            onClick={handleSync}
            disabled={syncing || !storeId}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>

        {loadingStatus ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-canvas rounded-xl p-3 border border-edge animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div className="bg-canvas rounded-xl p-3 border border-edge">
              <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Status</p>
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-muted" />
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </div>

            {/* Products */}
            <div className="bg-canvas rounded-xl p-3 border border-edge">
              <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Products</p>
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-muted" />
                <p className="text-sm font-mono text-primary">
                  {formatNumber(kbStatus?.kb_product_count ?? 0)}
                </p>
              </div>
            </div>

            {/* Last Synced */}
            <div className="bg-canvas rounded-xl p-3 border border-edge">
              <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Last Synced</p>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted" />
                <p className="text-sm font-mono text-primary">
                  {relativeTime(kbStatus?.kb_last_synced ?? null)}
                </p>
              </div>
            </div>

            {/* Character Usage */}
            <div className="bg-canvas rounded-xl p-3 border border-edge">
              <p className="text-[10px] text-faint uppercase tracking-wider mb-1">Character Usage</p>
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-muted" />
                <p className="text-sm font-mono text-primary">
                  {formatNumber(kbStatus?.kb_char_count ?? 0)} / {formatNumber(kbStatus?.char_limit ?? 300000)}
                </p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5">
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
        <div className="flex items-start gap-3 mt-4 rounded-2xl bg-warning/10 border border-warning/20 p-4">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            Your knowledge base is approaching the 300,000 character limit. Consider
            removing products with long descriptions or reducing product count.
          </p>
        </div>
      )}

      {/* ---- Manual Products Card ---- */}
      <div className="glass-card p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xs text-faint uppercase tracking-widest">
            Products
          </h2>
          <button
            onClick={openAddForm}
            disabled={!storeId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>

        {/* ---- Inline Form ---- */}
        {showForm && (
          <div className="mb-5 rounded-xl bg-canvas border border-edge p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-heading">
                {editingProductId !== null ? "Edit Product" : "Add Product"}
              </h3>
              <button
                onClick={resetForm}
                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-faint uppercase tracking-wider mb-1 block">
                  Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Product title"
                  className="w-full bg-canvas rounded-xl p-3 border border-edge text-sm text-body focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] text-faint uppercase tracking-wider mb-1 block">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Product description (optional)"
                  rows={3}
                  className="w-full bg-canvas rounded-xl p-3 border border-edge text-sm text-body focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-faint uppercase tracking-wider mb-1 block">
                  Price <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-canvas rounded-xl p-3 border border-edge text-sm text-body focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-faint uppercase tracking-wider mb-1 block">
                  Product URL
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-canvas rounded-xl p-3 border border-edge text-sm text-body focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={saving || !formTitle || !formPrice}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? "Saving..." : editingProductId !== null ? "Update Product" : "Save Product"}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-muted text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ---- Products List ---- */}
        {loadingProducts ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-canvas rounded-xl p-3 border border-edge animate-pulse h-14" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-10 h-10 text-faint mx-auto mb-3" />
            <p className="text-sm text-muted">No products yet</p>
            <p className="text-xs text-faint mt-1">
              Add products manually or sync from Shopify
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const isManual = product.source === "manual" || (product.id < 0);
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 bg-canvas rounded-xl p-3 border border-edge"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-heading font-medium truncate">
                      {product.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-primary">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                          isManual
                            ? "bg-primary/10 text-primary"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {isManual ? "Manual" : "Shopify"}
                      </span>
                    </div>
                  </div>

                  {isManual ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditForm(product)}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"
                        title="Edit product"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="w-8 h-8 rounded-lg hover:bg-error/10 flex items-center justify-center cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-error/70" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-faint uppercase tracking-wider shrink-0">
                      Synced
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
