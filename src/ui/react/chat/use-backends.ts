/**
 * The backend picker's state, ported from client-chat-stream.ts loadBackends:
 * unavailable backends stay listed and disabled, carrying their note; the
 * remembered choice wins only while it is still available.
 */
import { useEffect, useState } from "react";
import { getChatBackends, type ChatBackend } from "../../../features/chat/chat.functions.js";
import { CHAT_KEY } from "./chat-model.js";

export interface BackendsApi {
	/** null while loading; a failed fetch is an empty list plus `failed`. */
	backends: ChatBackend[] | null;
	failed: boolean;
	backendId: string;
	pick: (id: string) => void;
	/** "no backend available" when nothing usable is configured. */
	note: string;
}

export function useBackends(): BackendsApi {
	const [backends, setBackends] = useState<ChatBackend[] | null>(null);
	const [failed, setFailed] = useState(false);
	const [backendId, setBackendId] = useState("");
	useEffect(() => {
		let alive = true;
		getChatBackends().then(
			(list) => {
				if (!alive) return;
				let saved = "";
				try {
					saved = localStorage.getItem(CHAT_KEY) ?? "";
				} catch {
					saved = "";
				}
				const known = list.some((b) => b.available && b.id === saved);
				const first = list.find((b) => b.available);
				setBackends(list);
				setBackendId(known ? saved : (first?.id ?? ""));
			},
			() => {
				if (!alive) return;
				setBackends([]);
				setFailed(true);
			},
		);
		return () => {
			alive = false;
		};
	}, []);
	const pick = (id: string): void => {
		setBackendId(id);
		try {
			localStorage.setItem(CHAT_KEY, id);
		} catch {
			/* private mode */
		}
	};
	const usable = (backends ?? []).some((b) => b.available);
	const note = backends !== null && !usable ? "no backend available" : "";
	return { backends, failed, backendId, pick, note };
}
