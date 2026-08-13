/** Indexed markdown, filterable by text, project and kind (client-docs.ts). */
import { createFileRoute } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { type Artifact, getArtifacts } from "../features/docs/docs.functions.js";
import { DocsView } from "../ui/react/docs/DocsView.js";

const Search = Type.Object({
	q: Type.Optional(Type.String()),
	project: Type.Optional(Type.String()),
	kind: Type.Optional(Type.String()),
});

type DocsSearch = { q?: string; project?: string; kind?: string };

export const Route = createFileRoute("/docs")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loader: async (): Promise<Artifact[]> => getArtifacts() as Promise<Artifact[]>,
	component: Page,
});

function Page() {
	const docs = Route.useLoaderData() as Artifact[];
	const filter = Route.useSearch() as DocsSearch;
	return (
		<div id="docs" className="view">
			<DocsView docs={docs} filter={filter} />
		</div>
	);
}
