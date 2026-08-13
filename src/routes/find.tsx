/**
 * Find in Files as a full page (/find), interactive — ssr off, the panel owns
 * the keyboard. The controls live in the URL: q, glob, regex, case and the
 * project scope are search params, so a search is linkable and Reload lands
 * on the same query the way the rest of the workbench restores itself.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { FindPanel, type FindPanelState } from "../ui/react/find/FindPanel.js";
import { useOpenFile } from "../ui/react/files/open-file.js";

const Search = Type.Object({
	q: Type.Optional(Type.String()),
	glob: Type.Optional(Type.String()),
	regex: Type.Optional(Type.Boolean()),
	case: Type.Optional(Type.Boolean()),
	project: Type.Optional(Type.String()),
});

export const Route = createFileRoute("/find")({
	ssr: false,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	component: Page,
});

function Page() {
	const search = Route.useSearch() as {
		q?: string;
		glob?: string;
		regex?: boolean;
		case?: boolean;
		project?: string;
	};
	const navigate = useNavigate();
	const openFile = useOpenFile();
	const project = search.project ?? "";

	/** Controls remembered in the URL: every change rewrites the search half. */
	const sync = (s: FindPanelState) => {
		void navigate({
			to: "/find",
			replace: true,
			search: {
				...(s.q !== "" ? { q: s.q } : {}),
				...(s.mask !== "" ? { glob: s.mask } : {}),
				...(s.re ? { regex: true } : {}),
				...(s.cs ? { case: true } : {}),
				...(s.scope === "project" && project !== "" ? { project } : {}),
			},
		} as never);
	};

	return (
		<div id="findview" className="view">
			<FindPanel
				project={project}
				autoFocus
				initial={{
					...(search.q !== undefined ? { q: search.q } : {}),
					...(search.glob !== undefined ? { mask: search.glob } : {}),
					...(search.regex !== undefined ? { re: search.regex } : {}),
					...(search.case !== undefined ? { cs: search.case } : {}),
					scope: project !== "" ? "project" : "all",
				}}
				onState={sync}
				onOpenFile={(path, line) => openFile(path, line)}
			/>
		</div>
	);
}
