/**
 * Stripe Products & Pricing Configuration
 *
 * Defines subscription tiers, pricing, and feature limits
 */

export const STRIPE_PRODUCTS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null, // No Stripe price for free tier
    features: [
      '25 conversations/month',
      '1 voice agent',
      'Basic customization',
      'Email support',
    ],
    limits: {
      conversations: 25,
      agents: 1,
      knowledgeBaseDocs: 5,
      rateLimit: 50, // req/min
    },
  },
  starter: {
    name: 'Starter',
    price: 49,
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    features: [
      '500 conversations/month',
      '2 voice agents',
      'Full customization',
      'Priority email support',
      'Working hours configuration',
    ],
    limits: {
      conversations: 500,
      agents: 2,
      knowledgeBaseDocs: 25,
      rateLimit: 100,
    },
  },
  pro: {
    name: 'Pro',
    price: 199,
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro',
    popular: true,
    features: [
      '2,500 conversations/month',
      '5 voice agents',
      'Advanced customization',
      'Priority chat support',
      'Custom branding',
      'Analytics dashboard',
    ],
    limits: {
      conversations: 2500,
      agents: 5,
      knowledgeBaseDocs: 100,
      rateLimit: 500,
    },
  },
  business: {
    name: 'Business',
    price: 699,
    priceId: process.env.STRIPE_PRICE_BUSINESS || 'price_business',
    features: [
      '10,000 conversations/month',
      'Unlimited voice agents',
      'White-label widget',
      '24/7 priority support',
      'Custom integrations',
      'Dedicated account manager',
    ],
    limits: {
      conversations: 10000,
      agents: -1, // Unlimited
      knowledgeBaseDocs: 500,
      rateLimit: 1000,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    priceId: null,
    features: [
      'Unlimited conversations',
      'Unlimited voice agents',
      'Custom SLA',
      'On-premise deployment option',
      'Enterprise SSO',
      'Volume discounts',
    ],
    limits: {
      conversations: -1, // Unlimited
      agents: -1,
      knowledgeBaseDocs: -1,
      rateLimit: 5000,
    },
  },
} as const;

export type PlanTier = keyof typeof STRIPE_PRODUCTS;

/**
 * Overage pricing per conversation beyond plan limit
 */
export const OVERAGE_PRICE_PER_CONVERSATION = 0.5; // $0.50 per conversation

/**
 * Hard limit multiplier (stop accepting conversations at this point)
 */
export const HARD_LIMIT_MULTIPLIER = 2; // 2x plan limit

/**
 * Get plan details by tier
 */
export function getPlanDetails(tier: PlanTier) {
  return STRIPE_PRODUCTS[tier];
}

/**
 * Check if tier is a paid plan
 */
export function isPaidPlan(tier: PlanTier): boolean {
  return tier !== 'free';
}

/**
 * Check if tier allows feature
 */
export function hasPlanFeature(tier: PlanTier, feature: string): boolean {
  const plan = STRIPE_PRODUCTS[tier];
  return plan.features.some((f) => f.toLowerCase().includes(feature.toLowerCase()));
}

/**
 * Calculate overage charge
 */
export function calculateOverage(conversationCount: number, planLimit: number): number {
  if (conversationCount <= planLimit) return 0;
  const overage = conversationCount - planLimit;
  return overage * OVERAGE_PRICE_PER_CONVERSATION;
}

/**
 * Check if business has hit hard limit
 */
export function hasHitHardLimit(conversationCount: number, planLimit: number): boolean {
  const hardLimit = planLimit * HARD_LIMIT_MULTIPLIER;
  return conversationCount >= hardLimit;
}
