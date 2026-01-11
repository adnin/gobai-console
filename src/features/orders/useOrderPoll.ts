// src/features/orders/useOrderPoll.ts
import { api } from '@/src/lib/api.ts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Options = {
  intervalMs?: number;
  orderId: number;
};

export function useOrderPoll({ intervalMs = 1500, orderId }: Options) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [highDemand, setHighDemand] = useState(false);
  const t0Ref = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOnce = useCallback(async () => {
    const res = await api.get(`/api/v1/customer/orders/${orderId}`);
    setOrder(res.data?.data ?? res.data);
  }, [orderId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await fetchOnce();
    } finally {
      setLoading(false);
    }
  }, [fetchOnce]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!mounted) {
          return;
        }
        setLoading(true);
        await fetchOnce();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    timerRef.current = setInterval(() => {
      fetchOnce().catch(() => {});
      const elapsed = Date.now() - t0Ref.current;
      if (elapsed >= 15_000) {
        setHighDemand(true);
      }
    }, intervalMs);

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = null;
    };
  }, [fetchOnce, intervalMs]);

  const paymentExpiresAt = useMemo(() => {
    const v = order?.payment_expires_at;
    return v ? new Date(v).getTime() : null;
  }, [order]);

  return { highDemand, loading, order, paymentExpiresAt, refresh };
}
