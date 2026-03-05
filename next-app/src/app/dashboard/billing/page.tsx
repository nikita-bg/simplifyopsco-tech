'use client'

/**
 * Billing Dashboard Page
 *
 * Shows current plan, usage metrics, upgrade options, and billing portal access
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { STRIPE_PRODUCTS, type PlanTier } from '@/lib/stripe/products'

interface BillingData {
  plan: {
    tier: PlanTier
    name: string
    price: number
    features: string[]
  }
  usage: {
    conversations: {
      current: number
      limit: number
      hardLimit: number
      percentage: number
      overage: number
      overageCost: number
      hardLimitReached: boolean
    }
  }
  billing: {
    periodStart: string
    status: string
    isActive: boolean
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
  }
}

export default function BillingPage() {
  const router = useRouter()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const res = await fetch('/api/billing/usage')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: PlanTier) => {
    setCheckoutLoading(tier)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        const { error } = await res.json()
        alert(error || 'Failed to create checkout session')
        setCheckoutLoading(null)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout')
      setCheckoutLoading(null)
    }
  }

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        const { error } = await res.json()
        alert(error || 'Failed to open billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to open billing portal')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading billing information...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Failed to load billing data</div>
      </div>
    )
  }

  const { plan, usage, billing } = data
  const { conversations } = usage

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="text-gray-600 mt-2">Manage your subscription and monitor usage</p>
      </div>

      {/* Usage Alert */}
      {conversations.hardLimitReached && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Usage limit exceeded</h3>
              <p className="text-sm text-red-700 mt-1">
                You've reached {conversations.current} of {conversations.hardLimit} conversations (2x plan limit). Please upgrade to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {conversations.overage > 0 && !conversations.hardLimitReached && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Overage charges</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You've used {conversations.overage} conversations beyond your plan limit.
                Overage charges: ${conversations.overageCost.toFixed(2)} ($0.50/conversation)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{plan.name} Plan</h2>
            <p className="text-gray-600 mt-1">
              {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
            </p>
          </div>
          {billing.stripeCustomerId && (
            <button
              onClick={handleManageBilling}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Manage Billing
            </button>
          )}
        </div>

        {/* Usage Meter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Conversations this month</span>
            <span className="text-sm text-gray-600">
              {conversations.current} / {conversations.limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${
                conversations.hardLimitReached
                  ? 'bg-red-600'
                  : conversations.overage > 0
                  ? 'bg-yellow-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(conversations.percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Hard limit: {conversations.hardLimit} conversations (2x plan limit)
          </p>
        </div>

        {/* Plan Features */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Plan includes:</h3>
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-600">
                <svg
                  className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade Plans */}
      {plan.tier !== 'enterprise' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(STRIPE_PRODUCTS)
              .filter(([tier]) => tier !== 'free' && tier !== 'enterprise')
              .map(([tier, product]) => {
                const isCurrentPlan = tier === plan.tier
                const isPro = tier === 'pro'

                return (
                  <div
                    key={tier}
                    className={`border-2 rounded-lg p-6 ${
                      isPro
                        ? 'border-blue-500 bg-blue-50'
                        : isCurrentPlan
                        ? 'border-gray-400 bg-gray-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {isPro && (
                      <div className="inline-block bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{tier}</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      ${product.price}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {product.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start">
                          <svg
                            className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleUpgrade(tier as PlanTier)}
                      disabled={isCurrentPlan || checkoutLoading !== null}
                      className={`w-full mt-6 px-4 py-2 rounded-lg font-medium ${
                        isCurrentPlan
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : isPro
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      } disabled:opacity-50`}
                    >
                      {checkoutLoading === tier
                        ? 'Loading...'
                        : isCurrentPlan
                        ? 'Current Plan'
                        : 'Upgrade'}
                    </button>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Enterprise CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Need a custom solution?</h2>
        <p className="text-blue-100 mb-4">
          Enterprise plans include unlimited conversations, dedicated support, custom integrations, and SLA guarantees.
        </p>
        <a
          href="mailto:sales@simplifyops.co"
          className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100"
        >
          Contact Sales
        </a>
      </div>
    </div>
  )
}
