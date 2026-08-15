/**
 * /chat — the chat shell page. The conversation itself lives in the ChatRail
 * tool window (window 5, mounted by the root chrome); this page server-renders
 * the light half: which backends exist and whether they can answer, so the
 * picker's state is explainable from a URL.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getChatBackends, type ChatBackend } from "../features/chat/chat.functions.js";

export const Route = createFileRoute("/chat")({
	ssr: true,
	loader: async (): Promise<ChatBackend[]> => getChatBackends() as Promise<ChatBackend[]>,
	component: Page,
});

function Page() {
	const backends = Route.useLoaderData() as ChatBackend[];
	return (
		<div id="chatview" className="view">
			<h2>Chat</h2>
			<p className="dim">
				The conversation lives in the Chat tool window (5), on the right rail — talk with your
				code, with a spec, with a run; context rides as visible attachments above the composer
				(the old Ask, folded in). These are the backends it can stream from — unavailable ones
				stay listed with their reason.
			</p>
			<table className="tbl">
				<tbody>
					{backends.map((b) => (
						<tr key={b.id}>
							<td>{b.label}</td>
							<td>{b.kind}</td>
							<td className="dim">{b.available ? "available" : (b.note ?? "unavailable")}</td>
						</tr>
					))}
					{backends.length === 0 ? (
						<tr>
							<td className="dim">no backends configured</td>
						</tr>
					) : null}
				</tbody>
			</table>
		</div>
	);
}
