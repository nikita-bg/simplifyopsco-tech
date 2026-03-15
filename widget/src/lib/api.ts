import type { AgentConfig, PageContext, Session, VoiceToken } from './types';

const BACKEND_URL = 'https://widget-backend.simplifyopsco.tech';

export async function getAgentConfig(agentId: string): Promise<AgentConfig> {
  const res = await fetch(`${BACKEND_URL}/api/config/${agentId}`);
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json() as Promise<AgentConfig>;
}

export async function createSession(agentId: string): Promise<Session> {
  const res = await fetch(`${BACKEND_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId }),
  });
  if (!res.ok) throw new Error(`Session creation failed: ${res.status}`);
  const data = (await res.json()) as { token: string };
  return {
    token: data.token,
    agentId,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
}

export async function sendChat(
  token: string,
  message: string,
  pageContext?: PageContext
): Promise<Response> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, pageContext }),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
  return res;
}

export async function sendHybrid(
  token: string,
  message: string,
  pageContext?: PageContext
): Promise<Response> {
  const res = await fetch(`${BACKEND_URL}/api/chat/hybrid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, pageContext }),
  });
  if (!res.ok) throw new Error(`Hybrid request failed: ${res.status}`);
  return res;
}

export async function getVoiceToken(
  token: string,
  pageContext?: PageContext
): Promise<VoiceToken> {
  const res = await fetch(`${BACKEND_URL}/api/voice/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pageContext }),
  });
  if (!res.ok) throw new Error(`Voice token request failed: ${res.status}`);
  return res.json() as Promise<VoiceToken>;
}

export async function sendContext(
  token: string,
  pageContext: PageContext
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(pageContext),
  });
  if (!res.ok) throw new Error(`Context upload failed: ${res.status}`);
}
