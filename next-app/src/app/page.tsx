"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

function triggerVoiceWidget() {
  const fab = document.getElementById("voice-fab");
  if (fab) fab.click();
}

function triggerChatWidget() {
  const fab = document.getElementById("chat-fab");
  if (fab) fab.click();
}

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
          {/* Background Gradient */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-40" />

          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
              {/* Left - Copy */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  v2.0 is now live
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
                  Your Website,
                  <br />
                  <span className="gradient-text glow-text">
                    Now With a Voice.
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Transform your site into an interactive experience with the
                  world&apos;s first AI Voice Copilot. Engage visitors with
                  natural conversation, not just clicks.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button
                    id="hero-demo-btn"
                    onClick={triggerVoiceWidget}
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-white transition-all hover:bg-primary-dark hover:scale-105 glow-box"
                  >
                    <span className="material-symbols-outlined mr-2 text-xl">graphic_eq</span>
                    Try Live Demo
                  </button>
                  <button
                    id="hero-video-btn"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark px-8 text-base font-semibold text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined mr-2 text-xl">
                      play_circle
                    </span>
                    Watch Video
                  </button>
                </div>
              </div>

              {/* Right - Hero Visual */}
              <div className="flex-1 w-full max-w-[600px] lg:max-w-none">
                <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-surface-dark/50 shadow-2xl overflow-hidden aspect-[4/3] group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
                  <div className="absolute inset-4 rounded-xl border border-white/5 bg-[#0f1115] overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-full max-w-xs space-y-4 p-6 glass-panel rounded-xl border border-white/10 shadow-2xl transform transition-transform group-hover:scale-105 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                          <div className="h-2 w-24 rounded-full bg-white/20" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 w-full rounded-full bg-white/10" />
                          <div className="h-2 w-3/4 rounded-full bg-white/10" />
                          <div className="h-2 w-5/6 rounded-full bg-white/10" />
                        </div>
                        <div className="pt-4 flex justify-center gap-1">
                          <div className="w-1 bg-primary rounded-full waveform-bar h-4" />
                          <div className="w-1 bg-primary rounded-full waveform-bar h-6" />
                          <div className="w-1 bg-primary rounded-full waveform-bar h-8" />
                          <div className="w-1 bg-primary rounded-full waveform-bar h-5" />
                          <div className="w-1 bg-primary rounded-full waveform-bar h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Strip */}
        <section className="py-8 border-y border-white/5 bg-[#0b0d11]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "2M+", label: "Voice Interactions" },
                { value: "98%", label: "User Satisfaction" },
                { value: "40+", label: "Languages Supported" },
                { value: "<200ms", label: "Response Latency" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" data-section="features" className="py-24 bg-slate-50 dark:bg-[#0b0d11]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Intelligent Capabilities
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Powering the next generation of conversational web interfaces
                with state-of-the-art neural networks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
              {/* Feature 1: Web Automation */}
              <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark p-8 hover:border-primary/50 transition-colors duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                      <span className="material-symbols-outlined text-3xl">
                        smart_toy
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      Web Automation
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md">
                      Navigate and control complex web flows purely through
                      voice commands. Our AI understands DOM structures and
                      interacts like a human user.
                    </p>
                  </div>
                  <div className="mt-8 relative h-32 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-mono">
                      &gt; Executing voice command: &quot;Book a demo for next
                      Tuesday&quot;...
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2: Voice AI */}
              <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark p-8 hover:border-primary/50 transition-colors duration-300">
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-3xl">
                      graphic_eq
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Voice AI
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                    Natural language processing that understands context, intent,
                    and nuance in 40+ languages.
                  </p>
                  <div className="mt-auto flex justify-center gap-1 opacity-50">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    <div className="w-1.5 h-10 bg-primary rounded-full" />
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <div className="w-1.5 h-8 bg-primary rounded-full" />
                    <div className="w-1.5 h-5 bg-primary rounded-full" />
                  </div>
                </div>
              </div>

              {/* Feature 3: Real-time Analytics */}
              <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark p-8 hover:border-primary/50 transition-colors duration-300">
                <div className="relative z-10 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-3xl">
                      monitoring
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Real-time Analytics
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Monitor user interactions and voice engagement metrics
                    instantly with our live dashboard.
                  </p>
                  <div className="mt-auto pt-4">
                    <div className="flex items-end gap-1 h-16">
                      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-t h-[40%]" />
                      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-t h-[70%]" />
                      <div className="w-full bg-primary/20 rounded-t h-[50%]" />
                      <div className="w-full bg-primary rounded-t h-[85%]" />
                      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-t h-[60%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 4: Seamless Integration */}
              <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark p-8 hover:border-primary/50 transition-colors duration-300 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-3xl">
                      integration_instructions
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Seamless Integration
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Add Vocalize to your React, Vue, or vanilla JS site in
                    minutes. Just copy, paste, and customize your voice
                    agent&apos;s personality.
                  </p>
                </div>
                <div className="flex-1 w-full bg-[#1e1e1e] rounded-lg p-4 font-mono text-xs text-slate-300 border border-white/10 shadow-inner">
                  <p>
                    <span className="text-pink-500">import</span>{" "}
                    {"{ Vocalize }"}{" "}
                    <span className="text-pink-500">from</span>{" "}
                    <span className="text-yellow-300">
                      &apos;@vocalize/sdk&apos;
                    </span>
                    ;
                  </p>
                  <br />
                  <p>
                    <span className="text-blue-400">const</span> agent ={" "}
                    <span className="text-blue-400">new</span> Vocalize({"{"}
                  </p>
                  <p className="pl-4">
                    apiKey:{" "}
                    <span className="text-yellow-300">
                      &apos;v_12345...&apos;
                    </span>
                    ,
                  </p>
                  <p className="pl-4">
                    voice:{" "}
                    <span className="text-yellow-300">
                      &apos;Sarah_Neutral&apos;
                    </span>
                  </p>
                  <p>{"}"});
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" data-section="use-cases" className="py-24 bg-white dark:bg-background-dark">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Built for Every Industry
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                See how businesses across sectors are leveraging voice AI to transform customer engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: "storefront",
                  title: "E-Commerce",
                  desc: "Voice-powered product search, order tracking, and personalized recommendations that boost conversion rates by up to 35%.",
                  color: "from-blue-500/20 to-purple-500/20",
                },
                {
                  icon: "medical_services",
                  title: "Healthcare",
                  desc: "Appointment scheduling, symptom pre-screening, and patient FAQ handling — reducing front-desk call volume by 60%.",
                  color: "from-green-500/20 to-emerald-500/20",
                },
                {
                  icon: "real_estate_agent",
                  title: "Real Estate",
                  desc: "Virtual property tours, lead qualification, and instant scheduling. Agents close 2x more deals with voice-qualified leads.",
                  color: "from-orange-500/20 to-amber-500/20",
                },
                {
                  icon: "school",
                  title: "Education",
                  desc: "Course discovery, enrollment assistance, and 24/7 student support. Institutions see 45% fewer support tickets.",
                  color: "from-pink-500/20 to-rose-500/20",
                },
              ].map((uc) => (
                <div
                  key={uc.title}
                  className="group rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
                >
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${uc.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-2xl text-white">{uc.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{uc.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{uc.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <button
                onClick={triggerChatWidget}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chat</span>
                Ask Leo About Your Use Case
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" data-section="pricing" className="py-24 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Choose the plan that fits your business needs. No hidden fees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {/* Starter Plan */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Starter
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      $49
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      /mo
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Perfect for side projects and small sites.
                  </p>
                </div>
                <button
                  id="pricing-starter-btn"
                  className="w-full py-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Get Started
                </button>
                <PricingFeatures
                  features={[
                    "5k Voice Interactions",
                    "Basic Analytics",
                    "Email Support",
                  ]}
                />
              </div>

              {/* Pro Plan */}
              <div className="rounded-2xl border-2 border-primary bg-slate-50 dark:bg-[#13161c] p-8 flex flex-col gap-6 relative shadow-[0_0_40px_-10px_rgba(37,106,244,0.3)] transform md:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Pro
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      $149
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      /mo
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    For growing businesses needing power.
                  </p>
                </div>
                <button
                  id="pricing-pro-btn"
                  className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                >
                  Start Free Trial
                </button>
                <PricingFeatures
                  features={[
                    "50k Voice Interactions",
                    "Advanced Sentiment Analysis",
                    "Priority Support",
                    "Custom Voice Clone",
                  ]}
                  highlight
                />
              </div>

              {/* Enterprise Plan */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark p-8 flex flex-col gap-6 hover:shadow-xl transition-all duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Enterprise
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      Custom
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Full control and unlimited scale.
                  </p>
                </div>
                <button
                  id="pricing-enterprise-btn"
                  className="w-full py-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Contact Sales
                </button>
                <PricingFeatures
                  features={[
                    "Unlimited Interactions",
                    "On-premise Deployment",
                    "Dedicated Account Manager",
                    "Custom SLAs",
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-white dark:bg-[#0b0d11]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-surface-dark dark:to-[#1a1f29] border border-white/10 p-10 md:p-16 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                  Ready to give your site a voice?
                </h2>
                <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
                  Join thousands of innovative companies using Vocalize AI to
                  transform their user engagement metrics today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/signup"
                    id="cta-signup-btn"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg shadow-primary/25"
                  >
                    Get Started for Free
                  </Link>
                  <button
                    id="cta-demo-btn"
                    onClick={triggerVoiceWidget}
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm px-8 text-base font-semibold text-white transition-all hover:bg-white/20"
                  >
                    <span className="material-symbols-outlined mr-2 text-xl">graphic_eq</span>
                    Try Voice Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* ---- Helper Components ---- */

function PricingFeatures({
  features,
  highlight = false,
}: {
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <div
          key={feature}
          className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
        >
          <span
            className={`material-symbols-outlined text-lg ${highlight ? "text-primary" : "text-green-500"
              }`}
          >
            {highlight ? "check_circle" : "check"}
          </span>
          {feature}
        </div>
      ))}
    </div>
  );
}
