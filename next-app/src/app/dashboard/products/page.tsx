"use client";

import { useEffect, useState, useCallback } from "react";

interface Product {
    id: string;
    title: string;
    description: string | null;
    price: number | null;
    compare_at_price: number | null;
    currency: string;
    images: string[];
    inventory_status: string;
    product_url: string | null;
    tags: string[];
    is_active: boolean;
    platform_product_id: string | null;
    synced_at: string | null;
    created_at: string;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    // Add form state
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [newTags, setNewTags] = useState("");

    const fetchProducts = useCallback(async () => {
        try {
            const params = search ? `?search=${encodeURIComponent(search)}` : "";
            const res = await fetch(`/api/products${params}`);
            const data = await res.json();
            setProducts(data.products || []);
        } catch (err) {
            console.error("Failed to fetch products:", err);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle,
                    description: newDescription || null,
                    price: newPrice || null,
                    productUrl: newUrl || null,
                    tags: newTags
                        ? newTags.split(",").map((t) => t.trim())
                        : [],
                }),
            });

            if (res.ok) {
                setFeedback({ type: "success", text: `"${newTitle}" added successfully.` });
                setNewTitle("");
                setNewDescription("");
                setNewPrice("");
                setNewUrl("");
                setNewTags("");
                setShowAddForm(false);
                fetchProducts();
            } else {
                const data = await res.json();
                setFeedback({ type: "error", text: data.error || "Failed to add product." });
            }
        } catch {
            setFeedback({ type: "error", text: "Network error." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"?`)) return;

        try {
            const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setFeedback({ type: "success", text: `"${title}" deleted.` });
                fetchProducts();
            }
        } catch {
            setFeedback({ type: "error", text: "Failed to delete product." });
        }
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            in_stock: "bg-green-500/10 text-green-400",
            limited: "bg-yellow-500/10 text-yellow-400",
            out_of_stock: "bg-red-500/10 text-red-400",
        };
        const labels: Record<string, string> = {
            in_stock: "In Stock",
            limited: "Limited",
            out_of_stock: "Out of Stock",
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-slate-500/10 text-slate-400"}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Products</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {products.length} product{products.length !== 1 ? "s" : ""} in catalog
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add Product
                </button>
            </div>

            {/* Feedback */}
            {feedback && (
                <div className={`px-4 py-3 rounded-lg text-sm ${
                    feedback.type === "success"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                    {feedback.text}
                </div>
            )}

            {/* Add Product Form */}
            {showAddForm && (
                <form
                    onSubmit={handleAdd}
                    className="bg-surface-dark border border-white/10 rounded-xl p-6 space-y-4"
                >
                    <h2 className="text-lg font-semibold text-white">Add Manual Product</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Title *</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Product name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Price</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="29.99"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Description</label>
                        <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            placeholder="Product description..."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Product URL</label>
                            <input
                                type="url"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
                            <input
                                type="text"
                                value={newTags}
                                onChange={(e) => setNewTags(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="shoes, running, sports"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={submitting || !newTitle}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {submitting ? "Adding..." : "Add Product"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Search */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                    search
                </span>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            {/* Products Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading products...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-4xl text-slate-600">inventory_2</span>
                    <p className="text-slate-400 mt-2">No products yet.</p>
                    <p className="text-slate-500 text-sm mt-1">
                        Connect a store in Settings → Integrations, or add products manually.
                    </p>
                </div>
            ) : (
                <div className="bg-surface-dark border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Price</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Source</th>
                                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {product.images[0] ? (
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.title}
                                                    className="w-10 h-10 rounded-lg object-cover bg-white/5"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-600 text-lg">image</span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-white">{product.title}</p>
                                                {product.tags.length > 0 && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {product.tags.slice(0, 3).join(", ")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-white">
                                            {product.price != null ? `$${product.price.toFixed(2)}` : "—"}
                                        </span>
                                        {product.compare_at_price && (
                                            <span className="text-xs text-slate-500 line-through ml-2">
                                                ${product.compare_at_price.toFixed(2)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{statusBadge(product.inventory_status)}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-slate-500">
                                            {product.platform_product_id ? "Synced" : "Manual"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(product.id, product.title)}
                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
