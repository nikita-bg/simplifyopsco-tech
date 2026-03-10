import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { backendUrl: BACKEND_URL };
};

export default function SettingsPage() {
  const { backendUrl } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Settings & Configuration">
      <s-section heading="Widget Configuration">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Configure the voice widget appearance and behavior from your
              theme editor: Online Store → Customize → Add block → AI
              Voice Assistant.
            </s-paragraph>
            <s-paragraph>Available settings in the theme editor:</s-paragraph>
            <s-unordered-list>
              <s-list-item>
                🎨 Widget color (accent color for button and UI)
              </s-list-item>
              <s-list-item>
                📍 Button position (bottom-right or bottom-left)
              </s-list-item>
              <s-list-item>🔗 API URL (your backend endpoint)</s-list-item>
            </s-unordered-list>
          </s-stack>
        </s-box>
      </s-section>

      <s-section heading="Backend Connection">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Backend URL: {backendUrl}
            </s-paragraph>
            <s-paragraph>
              API Docs:{" "}
              <s-link href={`${backendUrl}/docs`} target="_blank">
                {backendUrl}/docs
              </s-link>
            </s-paragraph>
            <s-paragraph>
              Health:{" "}
              <s-link href={backendUrl} target="_blank">
                {backendUrl}/
              </s-link>
            </s-paragraph>
          </s-stack>
        </s-box>
      </s-section>

      <s-section heading="Voice AI">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              The voice assistant uses ElevenLabs Conversational AI for
              natural voice interactions. Configure your ElevenLabs agent to
              understand product queries and provide recommendations.
            </s-paragraph>
            <s-paragraph>
              <s-link
                href="https://elevenlabs.io/conversational-ai"
                target="_blank"
              >
                ElevenLabs Conversational AI Dashboard →
              </s-link>
            </s-paragraph>
          </s-stack>
        </s-box>
      </s-section>

      <s-section slot="aside" heading="Architecture">
        <s-paragraph>
          Frontend: Shopify Remix App (admin) + Vanilla JS Widget
          (storefront)
        </s-paragraph>
        <s-paragraph>
          Backend: Python FastAPI with async PostgreSQL
        </s-paragraph>
        <s-paragraph>
          Database: Neon PostgreSQL with pgvector
        </s-paragraph>
        <s-paragraph>Voice: ElevenLabs Conversational AI</s-paragraph>
        <s-paragraph>AI: OpenAI GPT-4o-mini (analysis)</s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
