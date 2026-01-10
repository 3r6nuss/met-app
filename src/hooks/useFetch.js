import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for data fetching with loading and error states.
 * Replaces the pattern of calling setState directly in useEffect.
 * 
 * @param {string} url - The URL to fetch from
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {boolean} immediate - Whether to fetch immediately on mount (default: true)
 * @returns {object} { data, loading, error, refetch }
 */
export function useFetch(url, options = {}, immediate = true) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(url, {
                credentials: 'include',
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setData(result);
            return result;
        } catch (err) {
            setError(err.message || 'Ein Netzwerkfehler ist aufgetreten');
            console.error(`Fetch error for ${url}:`, err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        if (immediate) {
            fetchData();
        }
    }, [immediate, fetchData]);

    return { data, loading, error, refetch: fetchData };
}

/**
 * Custom hook for lazy data fetching (manual trigger only).
 * Useful for mutations (POST, PUT, DELETE).
 * 
 * @param {string} url - The URL to fetch from
 * @param {object} options - Fetch options
 * @returns {object} { data, loading, error, execute }
 */
export function useLazyFetch(url, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (body = null) => {
        setLoading(true);
        setError(null);

        try {
            const fetchOptions = {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            if (body) {
                fetchOptions.body = JSON.stringify(body);
            }

            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setData(result);
            return result;
        } catch (err) {
            setError(err.message || 'Ein Netzwerkfehler ist aufgetreten');
            console.error(`Fetch error for ${url}:`, err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [url]);

    return { data, loading, error, execute };
}

export default useFetch;
