"use client";

import { useEffect, useState, useCallback } from "react";

interface Order {
    id: string;
    order_number: string;
    customer_email: string | null;
    customer_name: string | null;
    status: string;
    financial_status: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    total_price: number | null;
    currency: string;
    line_items: Array<{ title: string; quantity: number; price: string }>;
    order_date: string | null;
    synced_at: string | null;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchOrders = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (statusFilter) params.set("status", statusFilter);
            const qs = params.toString();
            const res = await fetch(`/api/orders${qs ? `?${qs}` : ""}`);
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-500/10 text-yellow-400",
            processing: "bg-blue-500/10 text-blue-400",
            shipped: "bg-purple-500/10 text-purple-400",
            delivered: "bg-green-500/10 text-green-400",
            cancelled: "bg-red-500/10 text-red-400",
            refunded: "bg-slate-500/10 text-slate-400",
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-slate-500/10 text-slate-400"}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDate = (date: string | null) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Orders</h1>
                <p className="text-sm text-slate-400 mt-1">
                    {orders.length} order{orders.length !== 1 ? "s" : ""} synced from your store
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                        search
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by email, order number, or name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                </select>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-4xl text-slate-600">receipt_long</span>
                    <p className="text-slate-400 mt-2">No orders yet.</p>
                    <p className="text-slate-500 text-sm mt-1">
                        Orders will appear here after you connect a store and sync.
                    </p>
                </div>
            ) : (
                <div className="bg-surface-dark border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Order</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tracking</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-white">{order.order_number}</span>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {order.line_items.length} item{order.line_items.length !== 1 ? "s" : ""}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm text-white">{order.customer_name || "—"}</p>
                                        <p className="text-xs text-slate-500">{order.customer_email || ""}</p>
                                    </td>
                                    <td className="px-4 py-3">{statusBadge(order.status)}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-white">
                                            {order.total_price != null
                                                ? `$${order.total_price.toFixed(2)}`
                                                : "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-slate-400">{formatDate(order.order_date)}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {order.tracking_url ? (
                                            <a
                                                href={order.tracking_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary text-sm hover:underline"
                                            >
                                                {order.tracking_number || "Track"}
                                            </a>
                                        ) : order.tracking_number ? (
                                            <span className="text-sm text-slate-400">{order.tracking_number}</span>
                                        ) : (
                                            <span className="text-sm text-slate-600">—</span>
                                        )}
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
