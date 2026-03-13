"use client";

import { createSupabaseBrowser } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Fetch wrapper that adds Supabase auth token to requests to the backend API.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const supabase = createSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}
