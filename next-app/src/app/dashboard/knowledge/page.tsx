"use client";

import { useEffect, useState, useCallback } from "react";

interface Document {
    id: string;
    title: string;
    source_type: string;
    content: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

export default function KnowledgeBasePage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [sourceType, setSourceType] = useState("text");
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await fetch("/api/knowledge");
            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (err) {
            console.error("Failed to fetch documents:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        try {
            const res = await fetch("/api/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, sourceType }),
            });

            const data = await res.json();

            if (res.ok) {
                setFeedback({
                    type: "success",
                    text: `"${title}" added${data.embedded ? " with embeddings" : " (embeddings pending)"}.`,
                });
                setTitle("");
                setContent("");
                setShowAddForm(false);
                fetchDocuments();
            } else {
                setFeedback({ type: "error", text: data.error || "Failed to add" });
            }
        } catch {
            setFeedback({ type: "error", text: "Network error" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (docId: string, docTitle: string) => {
        if (!confirm(`Delete "${docTitle}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/knowledge?id=${docId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.id !== docId));
                setFeedback({ type: "success", text: `"${docTitle}" deleted.` });
            }
        } catch {
            setFeedback({ type: "error", text: "Failed to delete" });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Manage documents your AI assistant uses to answer questions.
                    </p>
                </div>
                <button
                    id="kb-add-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                >
                    <span className="material-symbols-outlined text-xl">
                        {showAddForm ? "close" : "add"}
                    </span>
                    {showAddForm ? "Cancel" : "Add Document"}
                </button>
            </div>

            {/* Feedback */}
            {feedback && (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${feedback.type === "success"
                            ? "border-green-500/20 bg-green-500/10 text-green-400"
                            : "border-red-500/20 bg-red-500/10 text-red-400"
                        }`}
                >
                    {feedback.text}
                </div>
            )}

            {/* Add Document Form */}
            {showAddForm && (
                <form
                    onSubmit={handleAdd}
                    className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Document Title
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="e.g. Company FAQ, Product Info, Policies"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Source Type
                        </label>
                        <select
                            value={sourceType}
                            onChange={(e) => setSourceType(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        >
                            <option value="text">Plain Text</option>
                            <option value="faq">FAQ</option>
                            <option value="webpage">Webpage Content</option>
                            <option value="manual">Manual / Docs</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            rows={8}
                            placeholder="Paste document content here. The AI will use this to answer customer questions."
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {content.length.toLocaleString()} characters •{" "}
                            {content.split(/\s+/).filter(Boolean).length.toLocaleString()}{" "}
                            words
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <>
                                <span className="material-symbols-outlined text-xl animate-spin">
                                    progress_activity
                                </span>
                                Embedding & Saving...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">
                                    upload
                                </span>
                                Save & Generate Embeddings
                            </>
                        )}
                    </button>
                </form>
            )}

            {/* Documents List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <span className="material-symbols-outlined text-4xl text-slate-500 animate-spin">
                        progress_activity
                    </span>
                </div>
            ) : documents.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-surface-dark p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-600 mb-4 block">
                        menu_book
                    </span>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        No documents yet
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Add your first document to teach the AI assistant about your
                        business. It will use this knowledge to answer customer questions
                        accurately.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="group rounded-xl border border-white/10 bg-surface-dark p-5 hover:border-primary/30 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-primary text-xl">
                                            description
                                        </span>
                                        <h3 className="text-base font-semibold text-white truncate">
                                            {doc.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                            {doc.source_type}
                                        </span>
                                        <span>
                                            {new Date(doc.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                        {doc.metadata &&
                                            typeof doc.metadata === "object" &&
                                            "word_count" in doc.metadata && (
                                                <span>
                                                    {(
                                                        doc.metadata.word_count as number
                                                    ).toLocaleString()}{" "}
                                                    words
                                                </span>
                                            )}
                                    </div>
                                    <p className="text-sm text-slate-400 line-clamp-2">
                                        {doc.content}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(doc.id, doc.title)}
                                    className="ml-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        delete
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats */}
            {documents.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-surface-dark p-4 flex items-center gap-6 text-sm text-slate-400">
                    <span>
                        <strong className="text-white">{documents.length}</strong> documents
                    </span>
                    <span>
                        <strong className="text-white">
                            {documents
                                .reduce(
                                    (acc, d) =>
                                        acc +
                                        (d.metadata && typeof d.metadata === "object" && "word_count" in d.metadata
                                            ? (d.metadata.word_count as number)
                                            : 0),
                                    0
                                )
                                .toLocaleString()}
                        </strong>{" "}
                        total words
                    </span>
                </div>
            )}
        </div>
    );
}
