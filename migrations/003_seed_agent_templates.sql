-- Seed Agent Templates
-- Seeds 3 default agent templates: Online Store, Service Business, Lead Gen
-- Run with direct connection URL (not pooled)
-- Depends on: 002_agent_infrastructure.sql (agent_templates table must exist)

-- ==========================================
-- Online Store Template
-- ==========================================
INSERT INTO agent_templates (id, name, type, description, conversation_config, platform_settings, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Online Store Assistant',
    'online_store',
    'Friendly shopping assistant that helps customers find products, answers pricing and availability questions, and guides them toward making a purchase.',
    '{
        "agent": {
            "first_message": "Hi! I''m your store''s shopping assistant. What can I help you find today?",
            "language": "en",
            "prompt": {
                "prompt": "You are a friendly and knowledgeable shopping assistant for an online store. Help customers find products, answer questions about availability and pricing, and guide them toward making a purchase. Stay focused on the store''s products. Do not discuss competitors. Be concise and helpful.",
                "llm": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": -1
            }
        },
        "tts": {
            "voice_id": "cjVigY5qzO86Huf0OWal",
            "model_id": "eleven_flash_v2_5",
            "stability": 0.5,
            "similarity_boost": 0.8
        },
        "conversation": {
            "max_duration_seconds": 600
        }
    }'::jsonb,
    '{
        "guardrails": {
            "version": "1",
            "prompt_injection": {"isEnabled": true},
            "custom": {
                "config": {
                    "configs": [
                        {
                            "is_enabled": true,
                            "name": "Stay on topic",
                            "prompt": "Block requests unrelated to shopping, product inquiries, or customer service. Do not provide medical, legal, or financial advice.",
                            "model": "gemini-2.5-flash-lite"
                        }
                    ]
                }
            }
        }
    }'::jsonb,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (type, is_default) DO NOTHING;

-- ==========================================
-- Service Business Template
-- ==========================================
INSERT INTO agent_templates (id, name, type, description, conversation_config, platform_settings, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Service Business Advisor',
    'service_business',
    'Professional service advisor that explains services, answers FAQs, helps schedule consultations, and captures lead information.',
    '{
        "agent": {
            "first_message": "Hello! I''m here to help you learn about our services. How can I assist you?",
            "language": "en",
            "prompt": {
                "prompt": "You are a professional service advisor. Explain the business''s services clearly and thoroughly, answer frequently asked questions, help schedule consultations, and capture lead information when appropriate. Be professional, knowledgeable, and helpful.",
                "llm": "gpt-4o-mini",
                "temperature": 0.6,
                "max_tokens": -1
            }
        },
        "tts": {
            "voice_id": "cjVigY5qzO86Huf0OWal",
            "model_id": "eleven_flash_v2_5",
            "stability": 0.5,
            "similarity_boost": 0.8
        },
        "conversation": {
            "max_duration_seconds": 900
        }
    }'::jsonb,
    '{
        "guardrails": {
            "version": "1",
            "prompt_injection": {"isEnabled": true},
            "custom": {
                "config": {
                    "configs": [
                        {
                            "is_enabled": true,
                            "name": "Stay on topic",
                            "prompt": "Block requests unrelated to the business services. Do not provide medical, legal, or financial advice unless the business specifically offers those services.",
                            "model": "gemini-2.5-flash-lite"
                        }
                    ]
                }
            }
        }
    }'::jsonb,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (type, is_default) DO NOTHING;

-- ==========================================
-- Lead Gen Template
-- ==========================================
INSERT INTO agent_templates (id, name, type, description, conversation_config, platform_settings, is_default, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Lead Generation Agent',
    'lead_gen',
    'Consultative sales agent that qualifies leads, captures contact information, recommends solutions, and books demos.',
    '{
        "agent": {
            "first_message": "Hi there! I''d love to help you find the right solution. What are you looking for?",
            "language": "en",
            "prompt": {
                "prompt": "You are a consultative sales agent. Your goal is to qualify leads by understanding their needs, capture their contact information, recommend the right solution, and help book demos or consultations. Be friendly, ask good questions, and guide the conversation toward a next step.",
                "llm": "gpt-4o-mini",
                "temperature": 0.8,
                "max_tokens": -1
            }
        },
        "tts": {
            "voice_id": "cjVigY5qzO86Huf0OWal",
            "model_id": "eleven_flash_v2_5",
            "stability": 0.5,
            "similarity_boost": 0.8
        },
        "conversation": {
            "max_duration_seconds": 900
        }
    }'::jsonb,
    '{
        "guardrails": {
            "version": "1",
            "prompt_injection": {"isEnabled": true},
            "custom": {
                "config": {
                    "configs": [
                        {
                            "is_enabled": true,
                            "name": "Stay focused on lead qualification",
                            "prompt": "Stay focused on qualifying the lead and gathering contact information. Do not provide detailed technical support or troubleshooting. Redirect off-topic conversations back to understanding the prospect''s needs.",
                            "model": "gemini-2.5-flash-lite"
                        }
                    ]
                }
            }
        }
    }'::jsonb,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (type, is_default) DO NOTHING;

-- Record this migration
INSERT INTO applied_migrations (filename) VALUES ('003_seed_agent_templates.sql')
ON CONFLICT (filename) DO NOTHING;
