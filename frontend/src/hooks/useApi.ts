/** Custom hooks for API data fetching. */

import { useState, useCallback, useEffect } from 'react';
import { api, Site, AnalysisRun, Comparison, AnalysisInput, ComparisonInput, AIQuestion } from '../services/api';

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.sites.list();
      setSites(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  return { sites, loading, error, refetch: fetchSites };
}

export function useAnalyzeSite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (input: AnalysisInput): Promise<AnalysisRun | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.analyze.single(input);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analyze, loading, error };
}

export function useCompareSites() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async (input: ComparisonInput): Promise<Comparison | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.compare.create(input);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Comparison failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { compare, loading, error };
}

export function useAIExplanation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explain = useCallback(async (question: AIQuestion): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.ai.explain(question);
      return result.answer;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI explanation failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { explain, loading, error };
}

export function useHealthCheck() {
  const [healthy, setHealthy] = useState(false);
  const [kernelsLoaded, setKernelsLoaded] = useState(0);

  const check = useCallback(async () => {
    try {
      const result = await api.health();
      setHealthy(result.status === 'healthy');
      setKernelsLoaded(result.spice_kernels_loaded);
    } catch {
      setHealthy(false);
      setKernelsLoaded(0);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [check]);

  return { healthy, kernelsLoaded, check };
}