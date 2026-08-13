/**
 * /doc — the LSP-backed documentation view. ssr:'data-only' and NO loader on
 * purpose: the language service warms for seconds and holds hundreds of MB,
 * so the lookup runs from a client effect (DocLookupView), never on the SSR
 * path. `sym` is "<line>:<col>" for an exact position, or a symbol name that
 * resolves through the file's outline.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { DocLookupView } from "../ui/react/docwin/DocLookupView.js";

const Search = Type.Object({
	path: Type.Optional(Type.String()),
	sym: Type.Optional(Type.String()),
});

export const Route = createFileRoute("/doc")({
	ssr: "data-only",
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	component: Page,
});

function Page() {
	const search = Route.useSearch() as { path?: string; sym?: string };
	return (
		<div id="docwin-view" className="view">
			<DocLookupView path={search.path} sym={search.sym} />
		</div>
	);
}
