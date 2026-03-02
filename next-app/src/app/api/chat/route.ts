/**
 * Chat Proxy API
 *
 * Proxies chat messages to the n8n RAG webhook (Leo agent).
 * Keeps the webhook URL server-side for security.
 */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;

        if (!webhookUrl) {
            return NextResponse.json(
                { error: "Chat service not configured" },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { sessionId, message } = body;

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // Forward to n8n RAG webhook
        const n8nRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId: sessionId || crypto.randomUUID().slice(0, 10),
                message,
                username: "website_visitor",
                name: "Website Visitor",
            }),
        });

        if (!n8nRes.ok) {
            console.error("[Chat] n8n error:", n8nRes.status, await n8nRes.text());
            return NextResponse.json(
                { error: "Failed to get response" },
                { status: 502 }
            );
        }

        const data = await n8nRes.json();

        // n8n returns the AI response in .output
        const reply = data.output || data.text || data.message || "";

        return NextResponse.json({ reply, sessionId });
    } catch (error) {
        console.error("[Chat] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
