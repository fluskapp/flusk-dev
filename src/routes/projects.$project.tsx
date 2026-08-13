/** One project: config, models, toolbelt, verify chain (client-project.ts). */
import { createFileRoute } from "@tanstack/react-router";
import { getProjectDetail, type ProjectDetail } from "../features/projects/detail.functions.js";
import { ProjectView } from "../ui/react/projects/ProjectView.js";

export const Route = createFileRoute("/projects/$project")({
	ssr: true,
	loader: async ({ params }): Promise<ProjectDetail | null> =>
		getProjectDetail({ data: { name: params.project } }) as Promise<ProjectDetail | null>,
	component: Page,
});

function Page() {
	const d = Route.useLoaderData() as ProjectDetail | null;
	const { project } = Route.useParams() as { project: string };
	return (
		<div id="project" className="view">
			{d === null ? (
				<div className="empty small">could not read project {project}</div>
			) : (
				<ProjectView d={d} />
			)}
		</div>
	);
}
