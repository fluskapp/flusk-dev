/**
 * Tool window 8: Graph — what am I about to break. The panel FOLLOWS the
 * Documentation window (the "flusk:symbol" CustomEvent) rather than asking,
 * so there is no loader: the subject arrives after mount, or as a shareable
 * ?file=&symbol= deep link.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { GraphWindow } from "../ui/react/graph/GraphWindow.js";

const Search = Type.Object({
	file: Type.Optional(Type.String()),
	symbol: Type.Optional(Type.String()),
});

export const Route = createFileRoute("/graph")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	component: Page,
});

function Page() {
	const search = Route.useSearch() as { file?: string; symbol?: string };
	const initial =
		search.file === undefined ? null : { file: search.file, symbol: search.symbol ?? null };
	return (
		<div id="graph" className="view">
			<GraphWindow initial={initial} />
		</div>
	);
}
