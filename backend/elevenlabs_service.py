"""
ElevenLabs Conversational AI Service
Handles: Agent CRUD operations, signed URL generation.
Uses raw HTTP (httpx) — consistent with existing codebase pattern.
"""
from typing import Any, Optional

import httpx  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]


class ElevenLabsService:
    """ElevenLabs Conversational AI agent management."""

    BASE_URL = "https://api.elevenlabs.io/v1/convai"

    def _headers(self) -> dict[str, str]:
        """Return authentication and content-type headers."""
        return {
            "xi-api-key": settings.ELEVENLABS_API_KEY or "",
            "Content-Type": "application/json",
        }

    async def create_agent(
        self,
        name: str,
        conversation_config: dict[str, Any],
        platform_settings: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Create a new ElevenLabs agent.

        Returns full agent response including agent_id.
        """
        payload: dict[str, Any] = {
            "name": name,
            "conversation_config": conversation_config,
        }
        if platform_settings:
            payload["platform_settings"] = platform_settings

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/agents/create",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def get_agent(self, agent_id: str) -> dict[str, Any]:
        """Retrieve full agent configuration from ElevenLabs."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/agents/{agent_id}",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def update_agent(
        self,
        agent_id: str,
        conversation_config: Optional[dict[str, Any]] = None,
        platform_settings: Optional[dict[str, Any]] = None,
        name: Optional[str] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> dict[str, Any]:
        """Patch an existing agent's configuration.

        Only non-None parameters are included in the payload.
        """
        payload: dict[str, Any] = {}
        if conversation_config is not None:
            payload["conversation_config"] = conversation_config
        if platform_settings is not None:
            payload["platform_settings"] = platform_settings
        if name is not None:
            payload["name"] = name
        if tools is not None:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.patch(
                f"{self.BASE_URL}/agents/{agent_id}",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an ElevenLabs agent. Returns True on success."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.BASE_URL}/agents/{agent_id}",
                headers=self._headers(),
            )
            return response.status_code == 200

    # -----------------------------------------------------------------
    # Knowledge Base Document Methods
    # -----------------------------------------------------------------

    async def create_kb_document_text(
        self, text: str, name: str
    ) -> dict[str, Any]:
        """Create a knowledge base document from text.

        Returns {"id": "doc_xxx", "name": "..."}.
        Uses 60s timeout for large documents.
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/knowledge-base/text",
                json={"text": text, "name": name},
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def delete_kb_document(self, doc_id: str) -> bool:
        """Delete a knowledge base document.

        Returns True on success (200), False otherwise.
        Uses force=True to remove from all agents.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.BASE_URL}/knowledge-base/{doc_id}",
                params={"force": True},
                headers=self._headers(),
            )
            return response.status_code == 200

    async def get_kb_document(self, doc_id: str) -> dict[str, Any]:
        """Get knowledge base document metadata."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/knowledge-base/{doc_id}",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    # -----------------------------------------------------------------
    # Signed URL
    # -----------------------------------------------------------------

    async def get_signed_url(self, agent_id: str) -> str:
        """Get a signed WebRTC URL for establishing a conversation session."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
                params={"agent_id": agent_id},
                headers=self._headers(),
            )
            response.raise_for_status()
            data = response.json()
            return data.get("signed_url", "")


# Singleton
elevenlabs_service = ElevenLabsService()
