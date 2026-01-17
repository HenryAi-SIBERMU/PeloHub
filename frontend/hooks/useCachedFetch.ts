import { useState, useEffect, useRef } from 'react';

// Use a simple in-memory cache to avoid re-parsing JSON if component re-mounts quickly
const memoryCache: Record<string, any> = {};

export const useCachedFetch = (url: string, storageKey: string) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        const load = async () => {
            // 1. Try to load from LocalStorage first (Instant Speed)
            try {
                const cached = localStorage.getItem(storageKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setData(parsed);
                    // Don't set loading to false yet if we want to show a background spinner, 
                    // but for "Instant" feel, usually we want loading=false if we have data.
                    // Let's keep loading=true to indicate "refreshing" if needed, 
                    // OR set loading=false to fully simulate "Instant".
                    // User wants "Instant", so if cache exists, we act like we are done.
                    setLoading(false);
                    memoryCache[storageKey] = parsed;
                }
            } catch (e) {
                console.warn("Cache parse error", e);
            }

            // 2. Fetch fresh data (Background Update)
            try {
                // If we didn't have cache, ensure loading is true
                if (!data && !memoryCache[storageKey]) setLoading(true);

                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json = await res.json();

                // Deep compare or just update?
                // For simplicity, just update and save.
                setData(json);
                localStorage.setItem(storageKey, JSON.stringify(json));
                memoryCache[storageKey] = json;
            } catch (err) {
                console.error("Fetch error:", err);
                setError(err);
            } finally {
                setLoading(false);
                hasFetched.current = true;
            }
        };

        load();
    }, [url, storageKey]);

    return { data, loading, error };
};
