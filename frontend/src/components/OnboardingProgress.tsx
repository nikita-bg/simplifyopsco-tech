"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

interface OnboardingProgressProps {
  storeId: string;
}

interface OnboardingStatus {
  store_id: string;
  step: string;
  completed_steps: string[];
  is_complete: boolean;
  is_failed: boolean;
  error: string | null;
  has_agent: boolean;
}

const STEPS = [
  { key: "creating_agent", label: "Creating your AI agent" },
  { key: "syncing_kb", label: "Setting up knowledge base" },
  { key: "sending_email", label: "Sending welcome email" },
  { key: "complete", label: "Ready to go!" },
] as const;

type StepState = "completed" | "in_progress" | "pending";

function getStepState(
  stepKey: string,
  status: OnboardingStatus
): StepState {
  const { step, completed_steps, is_complete } = status;

  if (is_complete) {
    return "completed";
  }

  if (completed_steps.includes(stepKey) && stepKey !== step) {
    return "completed";
  }

  if (stepKey === step) {
    return "in_progress";
  }

  return "pending";
}

export function OnboardingProgress({ storeId }: OnboardingProgressProps) {
  const { refetch } = useStore();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/stores/${storeId}/onboarding-status`);
        if (res.ok) {
          const data: OnboardingStatus = await res.json();
          setStatus(data);

          if (data.is_complete) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setTimeout(() => {
              refetch();
            }, 1500);
          }

          if (data.is_failed) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setFailed(true);
            setErrorMessage(data.error || "An unexpected error occurred");
          }
        }
      } catch {
        // Polling failure is non-fatal; will retry on next interval
      }
    };

    // Initial fetch immediately
    poll();

    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [storeId, refetch]);

  const handleRetry = () => {
    refetch();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-heading mb-3">
          {status?.is_complete
            ? "Your AI assistant is ready!"
            : "Setting up your store..."}
        </h1>
        <p className="text-muted text-lg">
          {status?.is_complete
            ? "Redirecting to your dashboard"
            : "This usually takes less than a minute"}
        </p>
      </div>

      <div className="max-w-lg w-full rounded-2xl bg-panel border border-edge shadow-sm p-8">
        {failed ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-error" />
            </div>
            <p className="text-sm text-error">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all cursor-pointer shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {STEPS.map((step, index) => {
              const state = status
                ? getStepState(step.key, status)
                : index === 0
                  ? "in_progress"
                  : "pending";

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 flex items-center justify-center">
                      {state === "completed" && (
                        <Check className="w-5 h-5 text-success" />
                      )}
                      {state === "in_progress" && (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      {state === "pending" && (
                        <Circle className="w-5 h-5 text-muted/30" />
                      )}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="w-px h-6 border-l border-edge my-1" />
                    )}
                  </div>
                  <span
                    className={`text-sm pt-0.5 font-medium ${
                      state === "completed"
                        ? "text-success"
                        : state === "in_progress"
                          ? "text-primary"
                          : "text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
