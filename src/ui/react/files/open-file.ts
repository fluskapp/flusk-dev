/**
 * Open `path` in the code viewer route, scrolled to `line` (1-based; 0 means
 * the top) — the React replacement for the legacy `openFile` tab call. Find
 * and the palette both land files here, so the address bar names the file
 * the way it already names the run.
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";

export function useOpenFile(): (path: string, line?: number) => void {
	const navigate = useNavigate();
	return useCallback(
		(path: string, line?: number) => {
			void navigate({
				to: "/files/$",
				params: { _splat: path },
				search: line !== undefined && line > 0 ? { line } : {},
			} as never);
		},
		[navigate],
	);
}

/** The project the workbench is showing, read off the address bar. */
export function useProjectName(): string {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const m = /^\/projects\/([^/]+)/.exec(pathname);
	return m === null ? "" : decodeURIComponent(m[1] ?? "");
}
