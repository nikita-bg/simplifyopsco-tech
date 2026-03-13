"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import {
    Mic,
    MicOff,
    PhoneOff,
    Loader2,
    X,
    MessageSquare,
    Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";

export function FloatingVoiceWidget() {
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Hide widget on auth pages
    const isAuthPage = pathname?.startsWith("/auth");

    const conversation = useConversation({
        onConnect: () => {
            console.log("Connected to SimplifyOps AI");
            setElapsedSeconds(0);
            timerRef.current = setInterval(() => {
                setElapsedSeconds((s) => s + 1);
            }, 1000);
        },
        onDisconnect: () => {
            console.log("Disconnected");
            setTranscript(null);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setElapsedSeconds(0);
        },
        onMessage: (message) => {
            console.log("AI Message:", message);
            if (message && typeof message === "object" && "message" in message) {
                setTranscript(String((message as { message: string }).message));
            }
        },
        onError: (error) => console.error("ElevenLabs Error:", error),
    });

    const { status, isSpeaking } = conversation;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const navigateToPricing = useCallback(async () => {
        router.push("/pricing");
        return "Navigated to pricing page successfully";
    }, [router]);

    const scrollToFeatures = useCallback(async () => {
        setTimeout(() => {
            const el = document.getElementById("features");
            if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);
        return "Scrolled to features successfully";
    }, []);

    const handleStart = async () => {
        try {
            if (status === "connected") {
                await conversation.endSession();
                return;
            }
            await navigator.mediaDevices.getUserMedia({ audio: true });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await conversation.startSession({
                agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_6401kec12s0ff6hbwjmgdw2s0kt0",
                connectionType: "webrtc",
                clientTools: {
                    navigateToPricing,
                    scrollToFeatures,
                },
            } as any);
        } catch (err) {
            console.error("Failed to start:", err);
            alert("Failed to connect. Please allow microphone access.");
        }
    };

    const handleClose = async () => {
        if (status === "connected") await conversation.endSession();
        setIsOpen(false);
        setTranscript(null);
    };

    const handleMute = () => {
        setIsMuted(!isMuted);
    };

    const isConnected = status === "connected";

    if (isAuthPage) return null;

    return (
        <>
            {/* FAB */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    >
                        <Mic className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Widget Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
                        style={{
                            background: "oklch(9% 0.02 270)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white">LIVE SESSION</p>
                                    <p className="text-[10px] text-gray-500">
                                        {isConnected ? formatTime(elapsedSeconds) : "Ready"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-gray-500 hover:text-white cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-6 flex flex-col items-center">
                            {/* Avatar / Visualization */}
                            <div className="relative mb-5">
                                <AnimatePresence>
                                    {isSpeaking && (
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1.4, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                                            className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl"
                                        />
                                    )}
                                </AnimatePresence>
                                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${isConnected
                                        ? isSpeaking
                                            ? "bg-blue-600"
                                            : "bg-blue-600/60"
                                        : "bg-white/5"
                                    }`}>
                                    <Bot className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            {/* Status Label */}
                            <p className="text-xs text-gray-400 mb-2">
                                {isConnected
                                    ? isMuted
                                        ? "Muted"
                                        : isSpeaking
                                            ? "Assistant is speaking..."
                                            : "Listening..."
                                    : "Click to start a conversation"}
                            </p>

                            {/* Transcript */}
                            {transcript && (
                                <div className="w-full bg-white/5 rounded-xl p-3 mb-4 border border-white/5">
                                    <p className="text-sm text-gray-300 italic text-center">
                                        &ldquo;{transcript}&rdquo;
                                    </p>
                                </div>
                            )}

                            {/* Audio Waveform */}
                            {isConnected && (
                                <div className="flex items-center gap-0.5 mb-5">
                                    {Array.from({ length: 20 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                height: isMuted
                                                    ? 4
                                                    : isSpeaking
                                                        ? [4, Math.random() * 20 + 4, 4]
                                                        : [4, Math.random() * 6 + 2, 4],
                                            }}
                                            transition={{
                                                duration: 0.4 + Math.random() * 0.3,
                                                repeat: Infinity,
                                                repeatType: "reverse",
                                            }}
                                            className="w-1 rounded-full bg-blue-500/60"
                                            style={{ minHeight: 4 }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!isConnected ? (
                                <button
                                    onClick={handleStart}
                                    disabled={status === "connecting"}
                                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {status === "connecting" ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                                    ) : (
                                        <><Mic className="w-4 h-4" /> Start Conversation</>
                                    )}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        onClick={handleMute}
                                        className={`flex-1 py-3 rounded-xl border border-white/10 text-white text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${isMuted ? "bg-red-500/20 border-red-500/30" : "bg-white/5 hover:bg-white/10"}`}
                                    >
                                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById("features");
                                            if (el) el.scrollIntoView({ behavior: "smooth" });
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleStart}
                                        className="flex-[2] py-3 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <PhoneOff className="w-4 h-4" /> End Call
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-white/5 text-center">
                            <p className="text-[10px] text-gray-600">
                                Powered by SimplifyOps
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
