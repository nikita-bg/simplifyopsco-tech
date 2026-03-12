"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Store {
  id: string;
  shop_domain: string;
  subscription_tier: string;
  created_at: string | null;
}

interface StoreContextType {
  storeId: string | null;
  stores: Store[];
  hasStore: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  storeId: null,
  stores: [],
  hasStore: false,
  loading: true,
  refetch: async () => {},
});

export function StoreProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        credentials: "include",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores || []);
      }
    } catch {
      console.warn("Failed to fetch user stores");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const storeId = stores.length > 0 ? stores[0].id : null;

  return (
    <StoreContext.Provider
      value={{
        storeId,
        stores,
        hasStore: stores.length > 0,
        loading,
        refetch: fetchStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
