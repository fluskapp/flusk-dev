/**
 * The one way a kit component invokes a server function: {loading, error,
 * retry} standardized so no consumer hand-rolls try/catch + state again.
 * retry() re-issues the exact last call — that is what a Retry button means.
 */
import { useCallback, useRef, useState } from "react";

export interface ServerCall<A extends unknown[], R> {
	/** Resolves null on failure; the error lands in `error`, not a throw. */
	call(...args: A): Promise<R | null>;
	loading: boolean;
	error: string | null;
	retry(): void;
	/** Dismiss the error without re-running anything. */
	clear(): void;
}

export function useServerCall<A extends unknown[], R>(
	fn: (...args: A) => Promise<R>,
): ServerCall<A, R> {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const lastArgs = useRef<A | null>(null);
	const fnRef = useRef(fn);
	fnRef.current = fn;

	const call = useCallback(async (...args: A): Promise<R | null> => {
		lastArgs.current = args;
		setLoading(true);
		setError(null);
		try {
			return await fnRef.current(...args);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	const retry = useCallback(() => {
		if (lastArgs.current !== null) void call(...lastArgs.current);
	}, [call]);

	return { call, loading, error, retry, clear: () => setError(null) };
}
