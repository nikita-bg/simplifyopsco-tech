"use client";

import { useState } from "react";
import { useConversation } from "@elevenlabs/react";

export function DemoAgent() {
    const [panelOpen, setPanelOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const conversation = useConversation();

    const agentId = process.env.NEXT_PUBLIC_DEMO_AGENT_ID;

    // Don't render if no agent ID is configured
    if (!agentId) return null;

    const isConnected = conversation.status === "connected";
    const isConnecting = conversation.status === "connecting";
    const isDisconnected = conversation.status === "disconnected";

    const statusLabel =
        conversation.status === "connected"
            ? "Connected"
            : conversation.status === "connecting"
              ? "Connecting..."
              : conversation.status === "disconnecting"
                ? "Disconnecting..."
                : "Ready";

    const statusColor = isConnected
        ? "bg-green-500"
        : isConnecting
          ? "bg-yellow-500 animate-pulse"
          : "bg-muted";

    async function handleMicPress() {
        if (isDisconnected) {
            await conversation.startSession({
                agentId: agentId!,
                connectionType: "webrtc",
            });
        }
    }

    async function handleEndCall() {
        await conversation.endSession();
        setPanelOpen(false);
    }

    function handleToggleMute() {
        setIsMuted(!isMuted);
    }

    return (
        <>
            {/* Floating button */}
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
                {!panelOpen && (
                    <span className="hidden sm:inline-block text-sm font-medium text-heading bg-canvas/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-edge shadow-lg">
                        Try it now
                    </span>
                )}
                <button
                    onClick={() => setPanelOpen(!panelOpen)}
                    className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-indigo-400 text-white shadow-lg hover:shadow-[0_0_30px_-5px_oklch(52%_0.22_260/0.5)] transition-all hover:scale-105 cursor-pointer flex items-center justify-center"
                    aria-label="Open voice demo"
                >
                    {/* Pulsing ring */}
                    {!panelOpen && (
                        <span className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {panelOpen ? (
                            <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </>
                        ) : (
                            <>
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {/* Voice panel */}
            {panelOpen && (
                <div className="fixed z-50 bottom-24 right-6 sm:w-80 max-sm:inset-x-4 max-sm:bottom-24 glass-card p-5 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-heading">Talk to our AI Assistant</h3>
                        <button
                            onClick={() => {
                                if (isConnected) {
                                    conversation.endSession();
                                }
                                setPanelOpen(false);
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-muted hover:text-heading"
                            aria-label="Close panel"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 mb-5">
                        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                        <span className="text-xs text-muted">{statusLabel}</span>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center gap-4">
                        {isConnected ? (
                            <>
                                {/* Audio visualizer bars */}
                                <div className="flex items-center justify-center gap-1 h-16">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 rounded-full transition-all duration-150 ${
                                                conversation.isSpeaking
                                                    ? "bg-primary animate-bounce"
                                                    : "bg-white/20 h-4"
                                            }`}
                                            style={
                                                conversation.isSpeaking
                                                    ? {
                                                          height: `${20 + Math.random() * 30}px`,
                                                          animationDelay: `${i * 100}ms`,
                                                      }
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleToggleMute}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                                            isMuted ? "bg-white/10 text-muted" : "bg-white/10 text-heading"
                                        }`}
                                        aria-label={isMuted ? "Unmute" : "Mute"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            {isMuted ? (
                                                <>
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .73-.11 1.43-.32 2.09" />
                                                    <line x1="12" y1="19" x2="12" y2="22" />
                                                </>
                                            ) : (
                                                <>
                                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                    <line x1="12" y1="19" x2="12" y2="22" />
                                                </>
                                            )}
                                        </svg>
                                    </button>
                                    <button
                                        onClick={handleEndCall}
                                        className="w-12 h-12 rounded-full bg-error hover:bg-error/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                                        aria-label="End call"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                                            <line x1="23" y1="1" x2="1" y2="23" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Idle / connecting state */}
                                <button
                                    onClick={handleMicPress}
                                    disabled={isConnecting}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                        isConnecting
                                            ? "bg-primary/50 animate-pulse"
                                            : "bg-primary hover:bg-primary-hover hover:scale-105"
                                    } text-white shadow-lg shadow-primary/25`}
                                    aria-label="Start voice session"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="22" />
                                    </svg>
                                </button>
                                <p className="text-xs text-muted">
                                    {isConnecting ? "Connecting..." : isDisconnected ? "Tap to start" : "Please wait..."}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
