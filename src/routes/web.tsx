/**
 * Tool window 9: Web — fetch and read a URL beside the code. The open page
 * lives in ?url= (the address bar names the page); with none the panel is the
 * reading list. A failed list request is NOT an empty cache: the loader keeps
 * the two apart, because rendering "Nothing fetched yet" for a failure tells
 * a reader with fifty cached pages that their cache does not exist.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { getWebList, type WebListItem } from "../features/web/web.functions.js";
import { WebWindow } from "../ui/react/web/WebWindow.js";

const Search = Type.Object({ url: Type.Optional(Type.String()) });

interface WebLoad {
	list: WebListItem[] | null;
	listErr: string;
}

export const Route = createFileRoute("/web")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loader: async (): Promise<WebLoad> => {
		try {
			return { list: await (getWebList() as Promise<WebListItem[]>), listErr: "" };
		} catch (e) {
			return { list: null, listErr: e instanceof Error ? e.message : String(e) };
		}
	},
	component: Page,
});

function Page() {
	const data = Route.useLoaderData() as WebLoad;
	const search = Route.useSearch() as { url?: string };
	return (
		<div id="web" className="view">
			<WebWindow initialUrl={search.url ?? null} list={data.list} listErr={data.listErr} />
		</div>
	);
}
