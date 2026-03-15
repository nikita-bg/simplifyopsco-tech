import { useState, useEffect } from 'react';
import { createSession } from '../lib/api';
import type { Session } from '../lib/types';

export function useSession(agentId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;

    createSession(agentId)
      .then((s) => {
        setSession(s);
        setIsReady(true);
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, [agentId]);

  return { session, isReady, error };
}
