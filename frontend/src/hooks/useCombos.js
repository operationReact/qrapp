import { useState, useEffect, useCallback } from "react";
import * as svc from "@/services/comboService";

// ── generic async fetch hook (compliant with react-hooks v5) ──────────────
function useFetch(fetcher, depsKey = "") {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // defer state updates to avoid synchronous setState-in-effect warning
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const d = await fetcher();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, tick]);

  return { data, loading, error, refetch: () => setTick((t) => t + 1) };
}

// ── summary KPIs ───────────────────────────────────────────────────────────
export const useComboSummary = () =>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFetch(() => svc.getComboAnalyticsSummary());

// ── paginated list ─────────────────────────────────────────────────────────
export function useComboList(params) {
  const key = JSON.stringify(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useFetch(() => svc.listCombos(params), key);
}

// ── single combo ───────────────────────────────────────────────────────────
export function useCombo(id) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useFetch(() => svc.getCombo(id), String(id ?? ""));
}

// ── mutations (imperative) ─────────────────────────────────────────────────
export function useComboMutations(onSuccess) {
  const [busy, setBusy] = useState(false);
  const [mutError, setMutError] = useState(null);

  const run = useCallback(async (fn) => {
    setBusy(true);
    setMutError(null);
    try {
      const result = await fn();
      onSuccess?.();
      return result;
    } catch (e) {
      setMutError(e?.response?.data?.message ?? e?.message ?? "Something went wrong");
      throw e;
    } finally {
      setBusy(false);
    }
  }, [onSuccess]);

  return {
    busy,
    mutError,
    create:       (data)         => run(() => svc.createCombo(data)),
    update:       (id, data)     => run(() => svc.updateCombo(id, data)),
    updateStatus: (id, status)   => run(() => svc.updateComboStatus(id, status)),
    remove:       (id)           => run(() => svc.deleteCombo(id)),
  };
}
