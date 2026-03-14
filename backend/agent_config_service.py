"""
Agent Configuration Service
Curated voices, personality presets, supported languages, and embed code generation.
"""
from typing import List

from backend.models import VoiceOption, PersonalityPreset, LanguageOption  # type: ignore[import]


# ===========================================================================
# Curated Voices (popular ElevenLabs voices)
# ===========================================================================

CURATED_VOICES: List[dict] = [
    {
        "id": "21m00Tcm4TlvDq8ikWAM",
        "name": "Rachel",
        "gender": "female",
        "accent": "American",
        "description": "Calm and warm, great for customer support",
    },
    {
        "id": "AZnzlk1XvdvUeBnXmlld",
        "name": "Domi",
        "gender": "female",
        "accent": "American",
        "description": "Strong and confident, ideal for sales",
    },
    {
        "id": "EXAVITQu4vr4xnSDxMaL",
        "name": "Bella",
        "gender": "female",
        "accent": "American",
        "description": "Soft and friendly, perfect for greetings",
    },
    {
        "id": "ErXwobaYiN019PkySvjV",
        "name": "Antoni",
        "gender": "male",
        "accent": "American",
        "description": "Well-rounded and clear, versatile for any use",
    },
    {
        "id": "MF3mGyEYCl7XYWbV9V6O",
        "name": "Elli",
        "gender": "female",
        "accent": "American",
        "description": "Young and energetic, great for upbeat brands",
    },
    {
        "id": "TxGEqnHWrfWFTfGW9XjX",
        "name": "Josh",
        "gender": "male",
        "accent": "American",
        "description": "Deep and authoritative, suits premium brands",
    },
    {
        "id": "VR6AewLTigWG4xSOukaG",
        "name": "Arnold",
        "gender": "male",
        "accent": "American",
        "description": "Crisp and professional, good for business",
    },
    {
        "id": "pNInz6obpgDQGcFmaJgB",
        "name": "Adam",
        "gender": "male",
        "accent": "American",
        "description": "Deep and clear, perfect for narration and guidance",
    },
    {
        "id": "yoZ06aMxZJJ28mfd3POQ",
        "name": "Sam",
        "gender": "male",
        "accent": "American",
        "description": "Raspy and engaging, great for casual brands",
    },
    {
        "id": "jBpfuIE2acCO8z3wKNLl",
        "name": "Gigi",
        "gender": "female",
        "accent": "British",
        "description": "Elegant British accent, ideal for luxury brands",
    },
]


# ===========================================================================
# Personality Presets
# ===========================================================================

PERSONALITY_PRESETS: List[dict] = [
    {
        "id": "friendly",
        "name": "Friendly",
        "description": "Warm and helpful tone that puts customers at ease.",
        "system_prompt": (
            "You are a warm, friendly, and helpful shopping assistant for {store_name}. "
            "Greet customers with enthusiasm, use a conversational tone, and make them feel welcome. "
            "Be patient, empathetic, and always ready to help. Suggest products naturally and "
            "encourage browsing without being pushy. Use casual language and positive energy."
        ),
    },
    {
        "id": "professional",
        "name": "Professional",
        "description": "Formal and polished business communication style.",
        "system_prompt": (
            "You are a professional and polished shopping assistant for {store_name}. "
            "Maintain a formal, courteous tone throughout the conversation. Provide precise, "
            "well-structured information about products. Focus on value propositions and quality. "
            "Use proper business language and ensure every interaction reflects the brand's credibility."
        ),
    },
    {
        "id": "energetic",
        "name": "Energetic",
        "description": "Upbeat and enthusiastic style for vibrant brands.",
        "system_prompt": (
            "You are an upbeat and enthusiastic shopping assistant for {store_name}! "
            "Bring high energy and excitement to every conversation. Highlight what makes products "
            "amazing and share genuine enthusiasm for the brand. Use dynamic language, exclamation "
            "points, and make shopping feel like a fun adventure. Keep the momentum going!"
        ),
    },
    {
        "id": "calm",
        "name": "Calm",
        "description": "Soothing and patient tone for a relaxed shopping experience.",
        "system_prompt": (
            "You are a calm, soothing, and patient shopping assistant for {store_name}. "
            "Speak in a relaxed, measured way that puts customers at ease. Take your time explaining "
            "products and never rush the customer. Create a peaceful, stress-free shopping experience. "
            "Use gentle language and reassuring phrases."
        ),
    },
    {
        "id": "expert",
        "name": "Expert",
        "description": "Knowledgeable and authoritative product specialist.",
        "system_prompt": (
            "You are a knowledgeable and authoritative product expert for {store_name}. "
            "Demonstrate deep expertise about the products and industry. Provide detailed comparisons, "
            "technical specifications, and informed recommendations. Back up suggestions with facts "
            "and help customers make confident, well-informed purchasing decisions."
        ),
    },
    {
        "id": "concise",
        "name": "Concise",
        "description": "Brief and efficient responses that respect the customer's time.",
        "system_prompt": (
            "You are a brief and efficient shopping assistant for {store_name}. "
            "Keep responses short and to the point. Provide essential information quickly without "
            "unnecessary filler. Respect the customer's time by being direct about product details, "
            "pricing, and availability. Get to the answer fast."
        ),
    },
]


# ===========================================================================
# Supported Languages
# ===========================================================================

SUPPORTED_LANGUAGES: List[dict] = [
    {"code": "en", "name": "English"},
    {"code": "es", "name": "Spanish"},
    {"code": "fr", "name": "French"},
    {"code": "de", "name": "German"},
    {"code": "it", "name": "Italian"},
    {"code": "pt", "name": "Portuguese"},
    {"code": "nl", "name": "Dutch"},
    {"code": "pl", "name": "Polish"},
    {"code": "sv", "name": "Swedish"},
    {"code": "da", "name": "Danish"},
    {"code": "no", "name": "Norwegian"},
    {"code": "fi", "name": "Finnish"},
    {"code": "ro", "name": "Romanian"},
    {"code": "hu", "name": "Hungarian"},
    {"code": "cs", "name": "Czech"},
    {"code": "el", "name": "Greek"},
    {"code": "bg", "name": "Bulgarian"},
    {"code": "tr", "name": "Turkish"},
    {"code": "ar", "name": "Arabic"},
    {"code": "hi", "name": "Hindi"},
    {"code": "ja", "name": "Japanese"},
    {"code": "ko", "name": "Korean"},
    {"code": "zh", "name": "Chinese"},
    {"code": "th", "name": "Thai"},
    {"code": "vi", "name": "Vietnamese"},
    {"code": "id", "name": "Indonesian"},
    {"code": "ms", "name": "Malay"},
    {"code": "uk", "name": "Ukrainian"},
]


# ===========================================================================
# Public API
# ===========================================================================


def get_curated_voices() -> List[VoiceOption]:
    """Return curated list of ElevenLabs voices with preview URLs."""
    return [
        VoiceOption(
            id=v["id"],
            name=v["name"],
            preview_url=f"https://api.elevenlabs.io/v1/voices/{v['id']}/preview",
            gender=v["gender"],
            accent=v["accent"],
            description=v["description"],
        )
        for v in CURATED_VOICES
    ]


def get_personality_presets() -> List[PersonalityPreset]:
    """Return personality preset options."""
    return [
        PersonalityPreset(
            id=p["id"],
            name=p["name"],
            description=p["description"],
            system_prompt=p["system_prompt"],
        )
        for p in PERSONALITY_PRESETS
    ]


def get_supported_languages() -> List[LanguageOption]:
    """Return supported languages for voice agent."""
    return [
        LanguageOption(code=l["code"], name=l["name"])
        for l in SUPPORTED_LANGUAGES
    ]


def generate_embed_code(store_id: str, api_url: str) -> str:
    """Generate embeddable HTML script tag for a store's voice widget.

    Args:
        store_id: The store's UUID
        api_url: Base URL of the API (e.g., https://api.simplifyopsco.tech)

    Returns:
        HTML script tag string ready for copy-paste
    """
    # Strip trailing slash from api_url
    api_url = api_url.rstrip("/")

    return (
        f'<script src="{api_url}/widget-embed.js" '
        f'data-store-id="{store_id}" '
        f'defer></script>'
    )
