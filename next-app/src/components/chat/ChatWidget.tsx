"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ChatMessage {
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(() =>
        Math.random().toString(36).substring(2, 12)
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!text.trim() || loading) return;

            const userMsg: ChatMessage = {
                role: "user",
                text: text.trim(),
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);
            setInput("");
            setLoading(true);

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId, message: text.trim() }),
                });

                const data = await res.json();

                if (res.ok && data.reply) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text: data.reply,
                            timestamp: new Date(),
                        },
                    ]);
                } else {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text: "Sorry, I couldn't process that. Please try again.",
                            timestamp: new Date(),
                        },
                    ]);
                }
            } catch {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        text: "Connection error. Please check your internet and try again.",
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setLoading(false);
            }
        },
        [loading, sessionId]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <>
            {/* Chat FAB Button - left side, voice is right */}
            <button
                id="chat-fab"
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isOpen
                        ? "bg-red-500 hover:bg-red-600 rotate-90"
                        : "bg-gradient-to-br from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 glow-box"
                    }`}
                aria-label={isOpen ? "Close chat" : "Open chat"}
            >
                <span className="material-symbols-outlined text-white text-2xl">
                    {isOpen ? "close" : "chat"}
                </span>
            </button>

            {/* Chat Panel */}
            <div
                className={`fixed bottom-24 left-6 z-50 w-[380px] max-h-[560px] rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-left ${isOpen
                        ? "scale-100 opacity-100 translate-y-0"
                        : "scale-95 opacity-0 translate-y-4 pointer-events-none"
                    }`}
            >
                <div className="glass-panel border border-white/10 shadow-2xl flex flex-col h-[560px]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-xl">
                                        smart_toy
                                    </span>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#181b21] bg-green-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    Leo — AI Assistant
                                </p>
                                <p className="text-xs text-green-400">Online</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                        {messages.length === 0 && (
                            <div className="text-center py-8 space-y-3">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined text-primary text-3xl">
                                        waving_hand
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        Hi! I&apos;m Leo
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
                                        I&apos;m your AI assistant. Ask me anything about our AI
                                        voice agents, services, or pricing.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center pt-2">
                                    {[
                                        "What services do you offer?",
                                        "How does the AI agent work?",
                                        "Tell me about pricing",
                                    ].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => sendMessage(q)}
                                            className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-primary/20 hover:border-primary/30 hover:text-white transition-all"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                                            ? "bg-primary text-white rounded-br-md"
                                            : "bg-white/5 text-slate-200 border border-white/5 rounded-bl-md"
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={handleSubmit}
                        className="px-4 py-3 border-t border-white/10 flex items-center gap-2"
                    >
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            disabled={loading}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            <span className="material-symbols-outlined text-xl">send</span>
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
