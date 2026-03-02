"use client";

import { useCallback, useEffect, useState } from "react";

interface Booking {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    booking_date: string;
    duration_minutes: number;
    booking_type: string;
    notes: string | null;
    source: string;
    status: string;
    created_at: string;
}

function fmtDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusBadge(s: string) {
    const map: Record<string, string> = {
        confirmed: "bg-green-500/20 text-green-400",
        pending: "bg-yellow-500/20 text-yellow-400",
        cancelled: "bg-red-500/20 text-red-400",
        completed: "bg-blue-500/20 text-blue-400",
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${map[s] || map.pending}`}>
            {s}
        </span>
    );
}

function sourceBadge(s: string) {
    const map: Record<string, { icon: string; label: string }> = {
        voice: { icon: "graphic_eq", label: "Voice" },
        chat: { icon: "chat", label: "Chat" },
        website: { icon: "language", label: "Website" },
        manual: { icon: "edit", label: "Manual" },
    };
    const d = map[s] || map.website;
    return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <span className="material-symbols-outlined text-sm">{d.icon}</span>
            {d.label}
        </span>
    );
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        date: "",
        time: "10:00",
        duration: 30,
        type: "demo",
        notes: "",
    });

    const fetchBookings = useCallback(async () => {
        try {
            const res = await fetch("/api/bookings");
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
            }
        } catch (err) {
            console.error("Failed to load bookings:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, source: "manual" }),
            });
            if (res.ok) {
                setShowForm(false);
                setForm({ name: "", email: "", phone: "", date: "", time: "10:00", duration: 30, type: "demo", notes: "" });
                fetchBookings();
            }
        } catch (err) {
            console.error("Failed to create booking:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Cancel this booking?")) return;
        const res = await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
        if (res.ok) fetchBookings();
    };

    const upcoming = bookings.filter(
        (b) => b.status !== "cancelled" && new Date(b.booking_date) >= new Date()
    );
    const past = bookings.filter(
        (b) => b.status === "cancelled" || new Date(b.booking_date) < new Date()
    );

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Bookings</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Manage appointments scheduled through voice, chat, or manual entry.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">
                        {showForm ? "close" : "add"}
                    </span>
                    {showForm ? "Cancel" : "New Booking"}
                </button>
            </div>

            {/* New Booking Form */}
            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4"
                >
                    <h3 className="text-sm font-semibold text-white">Schedule New Booking</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Full Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                        <Input label="Email *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
                        <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5">Type</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="demo">Product Demo</option>
                                <option value="consultation">Consultation</option>
                                <option value="support">Support Call</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <Input label="Date *" value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" required />
                        <Input label="Time *" value={form.time} onChange={(v) => setForm({ ...form, time: v })} type="time" required />
                        <Input label="Duration (min)" value={String(form.duration)} onChange={(v) => setForm({ ...form, duration: Number(v) })} type="number" />
                        <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors"
                        >
                            {saving ? "Saving..." : "Create Booking"}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-2xl border border-white/10 bg-surface-dark p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : bookings.length === 0 && !showForm ? (
                <div className="rounded-2xl border border-white/10 bg-surface-dark p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">
                        calendar_month
                    </span>
                    <p className="text-white font-semibold">No bookings yet</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        When visitors book demos through voice or chat, appointments appear here.
                        You can also manually create bookings.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Upcoming */}
                    {upcoming.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                                Upcoming ({upcoming.length})
                            </h2>
                            <div className="space-y-2">
                                {upcoming.map((b) => (
                                    <BookingRow key={b.id} booking={b} onCancel={() => handleCancel(b.id)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past */}
                    {past.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                                Past & Cancelled ({past.length})
                            </h2>
                            <div className="space-y-2 opacity-60">
                                {past.map((b) => (
                                    <BookingRow key={b.id} booking={b} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel?: () => void }) {
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-surface-dark p-5 hover:border-white/20 transition-colors">
            {/* Date chip */}
            <div className="hidden sm:flex flex-col items-center justify-center h-14 w-14 rounded-xl bg-primary/10 text-primary shrink-0">
                <span className="text-lg font-bold leading-none">
                    {new Date(booking.booking_date).getDate()}
                </span>
                <span className="text-[10px] uppercase">
                    {new Date(booking.booking_date).toLocaleDateString("en", { month: "short" })}
                </span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{booking.customer_name}</span>
                    {statusBadge(booking.status)}
                    {sourceBadge(booking.source)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    {fmtDateTime(booking.booking_date)} · {booking.duration_minutes} min ·{" "}
                    {booking.booking_type} · {booking.customer_email}
                </p>
                {booking.notes && (
                    <p className="text-xs text-slate-600 mt-0.5 truncate">
                        📝 {booking.notes}
                    </p>
                )}
            </div>

            {onCancel && booking.status !== "cancelled" && (
                <button
                    onClick={onCancel}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors shrink-0"
                    title="Cancel booking"
                >
                    <span className="material-symbols-outlined text-lg">cancel</span>
                </button>
            )}
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
        </div>
    );
}
