"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

type VoiceState = "idle" | "connecting" | "listening" | "speaking";

interface Message {
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
}

export function VoiceWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputVolume, setInputVolume] = useState(0);
    const [outputVolume, setOutputVolume] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionStartRef = useRef<Date | null>(null);
    const messagesRef = useRef<Message[]>([]);

    // ── Web Automation Client Tools (Phase 6) ────────────────────────────
    // These are invoked by the ElevenLabs agent during a conversation
    const clientTools = {
        scrollToSection: async ({ sectionId }: { sectionId: string }) => {
            const el = document.getElementById(sectionId) ||
                document.querySelector(`[data-section="${sectionId}"]`) ||
                document.querySelector(`section[id*="${sectionId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                // Flash highlight
                el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-transparent");
                setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-transparent"), 2000);
                return `Scrolled to section: ${sectionId}`;
            }
            // Fallback: search by text content of headings
            const headings = document.querySelectorAll("h1,h2,h3");
            for (const h of headings) {
                if (h.textContent?.toLowerCase().includes(sectionId.toLowerCase())) {
                    h.scrollIntoView({ behavior: "smooth", block: "start" });
                    return `Scrolled to heading: ${h.textContent}`;
                }
            }
            return `Section "${sectionId}" not found`;
        },
        navigateTo: async ({ path }: { path: string }) => {
            // Only allow internal navigation
            if (path.startsWith("/") || path.startsWith(window.location.origin)) {
                window.location.href = path;
                return `Navigating to ${path}`;
            }
            return "External navigation blocked for security";
        },
        highlightElement: async ({ selector }: { selector: string }) => {
            const el = document.querySelector(selector);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                (el as HTMLElement).style.outline = "2px solid var(--color-primary)";
                (el as HTMLElement).style.outlineOffset = "4px";
                setTimeout(() => {
                    (el as HTMLElement).style.outline = "";
                    (el as HTMLElement).style.outlineOffset = "";
                }, 3000);
                return `Highlighted element: ${selector}`;
            }
            return `Element "${selector}" not found`;
        },
        openContactForm: async () => {
            // Try to find and click a contact/schedule button or scroll to contact section
            const contactBtn = document.querySelector("[data-action='contact'], #contact, [href='#contact']");
            if (contactBtn) {
                (contactBtn as HTMLElement).click();
                return "Opening contact form";
            }
            const contactSection = document.getElementById("contact") ||
                document.querySelector("section[id*='contact']");
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: "smooth" });
                return "Scrolled to contact section";
            }
            return "Contact section not found";
        },
        scheduleBooking: async ({
            name, email, phone, date, time, type,
        }: {
            name: string; email: string; phone?: string;
            date: string; time: string; type?: string;
        }) => {
            try {
                const res = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name, email, phone, date, time,
                        type: type || "demo",
                        source: "voice",
                    }),
                });
                if (res.ok) {
                    return `Booking confirmed for ${name} on ${date} at ${time}. A confirmation will be sent to ${email}.`;
                }
                return "Sorry, I couldn't create the booking right now. Please try again.";
            } catch {
                return "Booking service temporarily unavailable.";
            }
        },
    };

    const conversation = useConversation({
        clientTools,
        onConnect: () => {
            setVoiceState("listening");
            sessionStartRef.current = new Date();
            // Send page context to the agent
            setTimeout(() => {
                const pageTitle = document.title;
                const pageUrl = window.location.pathname;
                conversation.sendContextualUpdate(
                    `User is currently on page: "${pageTitle}" (${pageUrl}). Adapt your responses to this context.`
                );
            }, 500);
        },
        onDisconnect: () => {
            // Log conversation to Supabase
            if (messagesRef.current.length > 0 && sessionStartRef.current) {
                const duration = Math.round(
                    (Date.now() - sessionStartRef.current.getTime()) / 1000
                );
                fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: messagesRef.current,
                        duration,
                    }),
                }).catch((err) =>
                    console.error("[Voice] Failed to log conversation:", err)
                );
            }
            setVoiceState("idle");
            sessionStartRef.current = null;
            messagesRef.current = [];
            if (volumeIntervalRef.current) {
                clearInterval(volumeIntervalRef.current);
                volumeIntervalRef.current = null;
            }
            setInputVolume(0);
            setOutputVolume(0);
        },
        onMessage: (message) => {
            const msg: Message = {
                role: message.source === "user" ? "user" : "assistant",
                text: message.message,
                timestamp: new Date(),
            };
            setMessages((prev) => {
                const updated = [...prev, msg];
                messagesRef.current = updated;
                return updated;
            });
        },
        onModeChange: (mode) => {
            if (mode.mode === "speaking") {
                setVoiceState("speaking");
            } else {
                setVoiceState("listening");
            }
        },
        onError: (error) => {
            console.error("[Voice] Error:", error);
            setVoiceState("idle");
        },
    });

    // Poll volume levels
    useEffect(() => {
        if (voiceState !== "idle" && voiceState !== "connecting") {
            volumeIntervalRef.current = setInterval(() => {
                setInputVolume(conversation.getInputVolume());
                setOutputVolume(conversation.getOutputVolume());
            }, 100);
        }
        return () => {
            if (volumeIntervalRef.current) {
                clearInterval(volumeIntervalRef.current);
                volumeIntervalRef.current = null;
            }
        };
    }, [voiceState, conversation]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const startConversation = useCallback(async () => {
        setVoiceState("connecting");
        try {
            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Get signed URL from our server
            const tokenRes = await fetch("/api/voice/token");
            const tokenData = await tokenRes.json();

            if (tokenData.signedUrl) {
                await conversation.startSession({
                    signedUrl: tokenData.signedUrl,
                });
            } else {
                // Fallback to direct agent ID
                await conversation.startSession({
                    agentId:
                        process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
                        "agent_3001kjq9439weer88n05d423jsdr",
                    connectionType: "webrtc",
                });
            }
        } catch (error) {
            console.error("[Voice] Failed to start:", error);
            setVoiceState("idle");
        }
    }, [conversation]);

    const stopConversation = useCallback(async () => {
        await conversation.endSession();
        setVoiceState("idle");
    }, [conversation]);

    const toggleWidget = useCallback(() => {
        if (!isOpen) {
            setIsOpen(true);
        } else {
            if (voiceState !== "idle") {
                stopConversation();
            }
            setIsOpen(false);
        }
    }, [isOpen, voiceState, stopConversation]);

    // Determine visual volume for animation
    const activeVolume =
        voiceState === "speaking" ? outputVolume : inputVolume;

    // Status text
    const statusText = {
        idle: "Click to start",
        connecting: "Connecting...",
        listening: "Listening...",
        speaking: "Speaking...",
    }[voiceState];

    // Status color
    const statusColor = {
        idle: "text-slate-500",
        connecting: "text-yellow-400",
        listening: "text-green-400",
        speaking: "text-primary",
    }[voiceState];

    return (
        <>
            {/* FAB Button */}
            <button
                id="voice-fab"
                onClick={toggleWidget}
                className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isOpen
                    ? "bg-red-500 hover:bg-red-600 rotate-45"
                    : "bg-primary hover:bg-primary-dark glow-box"
                    }`}
                aria-label={isOpen ? "Close voice assistant" : "Open voice assistant"}
            >
                <span className="material-symbols-outlined text-white text-2xl">
                    {isOpen ? "close" : "graphic_eq"}
                </span>
            </button>

            {/* Voice Widget Panel */}
            <div
                className={`fixed bottom-24 right-6 z-50 w-[380px] max-h-[560px] rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen
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
                                        graphic_eq
                                    </span>
                                </div>
                                <div
                                    className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#181b21] ${voiceState === "idle"
                                        ? "bg-slate-500"
                                        : voiceState === "connecting"
                                            ? "bg-yellow-400 animate-pulse"
                                            : "bg-green-400"
                                        }`}
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    AI Voice Answers
                                </p>
                                <p className={`text-xs ${statusColor}`}>{statusText}</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleWidget}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">
                                close
                            </span>
                        </button>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="px-5 py-6 flex items-center justify-center">
                        <div className="relative">
                            {/* Pulsing glow background */}
                            <div
                                className="absolute inset-0 rounded-full bg-primary/20 blur-xl transition-all duration-200"
                                style={{
                                    transform: `scale(${1 + activeVolume * 1.5})`,
                                    opacity: voiceState === "idle" ? 0 : 0.6,
                                }}
                            />

                            {/* Orb */}
                            <div
                                className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${voiceState === "idle"
                                    ? "bg-slate-800 border border-white/10"
                                    : voiceState === "connecting"
                                        ? "bg-slate-800 border border-yellow-500/30 animate-pulse"
                                        : "bg-gradient-to-br from-primary/80 to-purple-600/80 border border-primary/30"
                                    }`}
                            >
                                {/* Waveform bars */}
                                {voiceState !== "idle" && voiceState !== "connecting" ? (
                                    <div className="flex items-center gap-1 h-12">
                                        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                                            const delay = i * 0.08;
                                            const height = Math.max(
                                                8,
                                                activeVolume *
                                                60 *
                                                (0.5 + 0.5 * Math.sin(Date.now() / 200 + i))
                                            );
                                            return (
                                                <div
                                                    key={i}
                                                    className="w-1.5 rounded-full bg-white/80 transition-all duration-100"
                                                    style={{
                                                        height: `${Math.min(48, height)}px`,
                                                        animationDelay: `${delay}s`,
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                ) : voiceState === "connecting" ? (
                                    <span className="material-symbols-outlined text-yellow-400 text-3xl animate-spin">
                                        progress_activity
                                    </span>
                                ) : (
                                    <span className="material-symbols-outlined text-slate-500 text-3xl">
                                        mic
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Messages / Transcript */}
                    <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-3 min-h-0">
                        {messages.length === 0 && voiceState === "idle" && (
                            <div className="text-center text-slate-500 text-sm py-8">
                                <span className="material-symbols-outlined text-3xl mb-2 block opacity-40">
                                    record_voice_over
                                </span>
                                Start a conversation to get help with anything on this site.
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
                                        ? "bg-primary text-white rounded-br-md"
                                        : "bg-white/5 text-slate-200 border border-white/5 rounded-bl-md"
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Action Button */}
                    <div className="px-5 py-4 border-t border-white/10">
                        {voiceState === "idle" ? (
                            <button
                                id="voice-start-btn"
                                onClick={startConversation}
                                className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                            >
                                <span className="material-symbols-outlined text-xl">mic</span>
                                Start Conversation
                            </button>
                        ) : (
                            <button
                                id="voice-stop-btn"
                                onClick={stopConversation}
                                className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                            >
                                <span className="material-symbols-outlined text-xl">
                                    stop_circle
                                </span>
                                End Conversation
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
