"""
LightRAG Knowledge Graph сервиз за съхранение и анализ на call данни
(Graceful fallback — работи дори без инсталиран LightRAG или без API ключ)
"""
import os
from typing import List, Dict, Any, Optional
from config import settings  # type: ignore[import-not-found]


class LightRAGService:
    """Сервиз за работа с LightRAG knowledge graph"""

    def __init__(self) -> None:
        """Инициализира LightRAG instance"""
        os.makedirs(settings.LIGHTRAG_WORKING_DIR, exist_ok=True)
        self.rag: Any = None

        if not settings.OPENAI_API_KEY:
            print("[WARNING] OPENAI_API_KEY not configured — LightRAG DISABLED")
            return

        try:
            from lightrag import LightRAG  # type: ignore[import-not-found]
            self.rag = LightRAG(
                working_dir=settings.LIGHTRAG_WORKING_DIR,
                llm_model_name=settings.LIGHTRAG_MODEL_NAME
            )
            print(f"[OK] LightRAG initialized (dir: {settings.LIGHTRAG_WORKING_DIR})")
        except Exception as e:
            print(f"[WARNING] LightRAG init failed: {e}")
            print("          App will work WITHOUT LightRAG analytics.")

    async def insert_call_data(self, call_data: Dict[str, Any]) -> bool:
        if self.rag is None:
            return False
        try:
            content = self._format_content(call_data)
            await self.rag.ainsert(content)
            return True
        except Exception as e:
            print(f"[ERROR] LightRAG insert: {e}")
            return False

    async def query_analytics(self, client_id: str, query: str, mode: str = "hybrid") -> str:
        if self.rag is None:
            return "LightRAG not initialized."
        try:
            from lightrag import QueryParam  # type: ignore[import-not-found]
            filtered_query = f"[Client: {client_id}] {query}"
            result: str = await self.rag.aquery(filtered_query, param=QueryParam(mode=mode))
            return result
        except Exception as e:
            print(f"[ERROR] LightRAG query: {e}")
            return ""

    async def get_common_questions(self, client_id: str, limit: int = 10) -> List[str]:
        try:
            query = f"What are the most common questions for client {client_id}? List top {limit}."
            result = await self.query_analytics(client_id, query, mode="global")
            questions = result.split("\n")
            return list(q.strip() for q in questions if q.strip())[:limit]  # type: ignore[index]
        except Exception:
            return []

    async def get_lead_qualification_stats(self, client_id: str) -> Dict[str, Any]:
        try:
            query = f"Analyze lead qualification rates for client {client_id}."
            result = await self.query_analytics(client_id, query, mode="global")
            return {"client_id": client_id, "analysis": result}
        except Exception as e:
            return {"error": str(e)}

    def _format_content(self, call_data: Dict[str, Any]) -> str:
        parts = [
            f"[Client: {call_data.get('client_id', 'unknown')}]",
            f"Call ID: {call_data.get('call_id')}",
            f"Timestamp: {call_data.get('timestamp')}",
            "", "=== Call Transcript ===",
            call_data.get('content', ''),
            "", "=== Metadata ===",
        ]
        tags = call_data.get('tags', [])
        if tags:
            parts.append(f"Tags: {', '.join(tags)}")
        analytics = call_data.get('analytics', {})
        if analytics:
            parts.append("\n=== Analytics ===")
            for key, value in analytics.items():
                parts.append(f"{key}: {value}")
        return "\n".join(parts)


# Singleton instance
rag_service = LightRAGService()
