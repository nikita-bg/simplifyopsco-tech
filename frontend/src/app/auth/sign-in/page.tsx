"use client";

import { AuthView } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";
import "@neondatabase/auth/ui/css";
import Link from "next/link";
import { Mic } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0a0a14]">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold text-white">Vocalize AI</span>
      </Link>

      <div className="w-full max-w-md">
        <AuthView
          authClient={authClient}
          view="sign-in"
          redirectTo="/dashboard"
        />
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="text-blue-400 hover:text-blue-300">
          Sign up
        </Link>
      </p>
    </div>
  );
}
