import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const shopResponse = await admin.graphql(
    `#graphql
      query {
        shop {
          name
          myshopifyDomain
          plan { displayName }
          productCount: productsCount { count }
        }
      }`
  );
  const shopData = await shopResponse.json();
  const shop = shopData.data?.shop;

  let stats = null;
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/dashboard/${session.shop}/stats`
    );
    if (res.ok) {
      stats = await res.json();
    }
  } catch (_e) {
    // Backend might not be running
  }

  return {
    shop: {
      name: shop?.name || "Your Store",
      domain: shop?.myshopifyDomain || session.shop,
      plan: shop?.plan?.displayName || "Unknown",
      productCount: shop?.productCount?.count || 0,
    },
    stats,
    backendUrl: BACKEND_URL,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "sync_products") {
    try {
      await fetch(`${BACKEND_URL}/api/stores/${session.shop}/sync`, {
        method: "POST",
      });
      return { success: true, message: "Product sync started!" };
    } catch (_e) {
      return {
        success: false,
        message: "Failed to start sync. Is the backend running?",
      };
    }
  }

  return null;
};

export default function Index() {
  const { shop, stats, backendUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSyncing =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  const syncProducts = () =>
    fetcher.submit({ action: "sync_products" }, { method: "POST" });

  return (
    <s-page heading="AI Voice Shopping Assistant">
      <s-button slot="primary-action" onClick={syncProducts}>
        {isSyncing ? "Syncing..." : "Sync Products"}
      </s-button>

      {/* Stats Overview */}
      <s-section heading="Dashboard">
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <s-stack direction="inline" gap="base">
            <s-box padding="base">
              <s-heading>
                {shop.productCount.toLocaleString()}
              </s-heading>
              <s-text tone="neutral">Products in Store</s-text>
            </s-box>
            <s-box padding="base">
              <s-heading>
                {stats?.total_conversations || 0}
              </s-heading>
              <s-text tone="neutral">Voice Conversations</s-text>
            </s-box>
            <s-box padding="base">
              <s-heading>
                {stats?.total_products_recommended || 0}
              </s-heading>
              <s-text tone="neutral">Products Recommended</s-text>
            </s-box>
            <s-box padding="base">
              <s-heading>
                {stats?.add_to_cart_rate?.toFixed(1) || "0.0"}%
              </s-heading>
              <s-text tone="neutral">Add-to-Cart Rate</s-text>
            </s-box>
          </s-stack>
        </s-box>
      </s-section>

      {/* Setup Guide */}
      <s-section heading="Setup Guide">
        <s-stack direction="block" gap="base">
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>1. Sync Your Products</s-heading>
            <s-paragraph>
              Click &quot;Sync Products&quot; to import your catalog into the AI
              assistant. This enables smart product recommendations.
            </s-paragraph>
            <s-button onClick={syncProducts}>
              {isSyncing ? "Syncing..." : "Sync Products Now"}
            </s-button>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>2. Enable Voice Widget</s-heading>
            <s-paragraph>
              Go to Online Store → Customize, then add the
              &quot;AI Voice Assistant&quot; block to your theme. The widget will
              appear as a floating microphone button on your storefront.
            </s-paragraph>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>3. Configure Settings</s-heading>
            <s-paragraph>
              Customize the widget color, position, and welcome message
              from the theme editor settings panel.
            </s-paragraph>
          </s-box>
        </s-stack>
      </s-section>

      {/* Recent Conversations */}
      {stats?.recent_conversations?.length > 0 && (
        <s-section heading="Recent Voice Conversations">
          <s-stack direction="block" gap="base">
            {stats.recent_conversations.map(
              (conv: any, index: number) => (
                <s-box
                  key={index}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack direction="inline" gap="base">
                    <s-text>
                      🎙️ {conv.time_ago} • {conv.duration}
                    </s-text>
                    <s-badge
                      tone={
                        conv.sentiment === "Very Positive" ||
                        conv.sentiment === "Positive"
                          ? "success"
                          : conv.sentiment === "Negative"
                            ? "critical"
                            : "info"
                      }
                    >
                      {conv.sentiment}
                    </s-badge>
                    {conv.products_count > 0 && (
                      <s-text tone="neutral">
                        {conv.products_count} products discussed
                      </s-text>
                    )}
                    {conv.cart_actions_count > 0 && (
                      <s-badge tone="success">
                        {conv.cart_actions_count} added to cart
                      </s-badge>
                    )}
                  </s-stack>
                </s-box>
              )
            )}
          </s-stack>
        </s-section>
      )}

      {/* Sidebar */}
      <s-section slot="aside" heading="Store Info">
        <s-paragraph>
          <s-text>Store: </s-text>
          <s-text>{shop.name}</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Domain: </s-text>
          <s-text>{shop.domain}</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Plan: </s-text>
          <s-text>{shop.plan}</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Products: </s-text>
          <s-text>{shop.productCount}</s-text>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="How It Works">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Your customers see a floating 🎙️ button. When they tap it, they
            can speak naturally about what they&apos;re looking for.
          </s-paragraph>
          <s-paragraph>
            The AI analyzes their request, finds matching products, and
            recommends complementary items — all through voice conversation.
          </s-paragraph>
          <s-paragraph>
            Customers can add recommended products to cart directly from
            the voice assistant panel.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Resources">
        <s-unordered-list>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/online-store/theme-app-extensions"
              target="_blank"
            >
              Theme App Extensions Guide
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link href={`${backendUrl}/docs`} target="_blank">
              Backend API Docs
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
