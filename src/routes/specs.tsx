/**
 * Tool window 2: Specs — what you intend. The `.flusk/specs` library of the
 * chosen repo, grouped by lifecycle status; the open spec lives in
 * ?spec=<name> and the repo in ?repo=<root> (the address bar names both).
 * The repo defaults to the first configured repo-kind project.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { getProjects, type ProjectSummary } from "../features/projects/projects.functions.js";
import { getSpec, getSpecs } from "../features/specs/specs.functions.js";
import type { Spec, SpecScan } from "../features/specs/spec.types.js";
import { SpecDetail } from "../ui/react/specs/SpecDetail.js";
import { SpecsView } from "../ui/react/specs/SpecsView.js";
import type { RepoChoice } from "../ui/react/specs/spec-rows.js";

const Search = Type.Object({
	status: Type.Optional(Type.String()),
	mode: Type.Optional(Type.String()),
	spec: Type.Optional(Type.String()),
	repo: Type.Optional(Type.String()),
});

type SpecsSearch = { status?: string; mode?: string; spec?: string; repo?: string };

interface SpecsLoad {
	repos: RepoChoice[];
	repo: string | null;
	scan: SpecScan;
	open: Spec | null;
}

export const Route = createFileRoute("/specs")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loaderDeps: ({ search }) => ({
		repo: (search as SpecsSearch).repo,
		spec: (search as SpecsSearch).spec,
	}),
	loader: async ({ deps }): Promise<SpecsLoad> => {
		const projects = (await getProjects()) as ProjectSummary[];
		const repos = projects.map((p) => ({ name: p.name, path: p.path }));
		const repo = deps.repo ?? (projects.find((p) => p.kind === "repo") ?? projects[0])?.path ?? null;
		if (repo === null) return { repos, repo, scan: { specs: [], skipped: [] }, open: null };
		// The scan and the open spec are independent reads: parallel, never a
		// waterfall. Both are light — a spec is a page of markdown.
		const [scan, open] = await Promise.all([
			getSpecs({ data: { repo } }) as Promise<SpecScan>,
			deps.spec === undefined
				? Promise.resolve(null)
				: (getSpec({ data: { repo, name: deps.spec } }) as Promise<Spec | null>),
		]);
		return { repos, repo, scan, open };
	},
	component: Page,
});

function Page() {
	const { repos, repo, scan, open } = Route.useLoaderData() as SpecsLoad;
	const { status, mode, spec } = Route.useSearch() as SpecsSearch;
	return (
		<div id="specs" className="view">
			{spec !== undefined ? (
				open === null || repo === null ? (
					<div className="empty small">could not read that spec</div>
				) : (
					<SpecDetail spec={open} repo={repo} />
				)
			) : (
				<SpecsView
					scan={scan}
					repos={repos}
					repo={repo}
					filter={{
						...(status !== undefined ? { status } : {}),
						...(mode !== undefined ? { mode } : {}),
					}}
				/>
			)}
		</div>
	);
}
