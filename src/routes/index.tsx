/**
 * Attention/Overview: what needs me. Stat tiles from the loader; recent
 * activity is the heavier half and streams behind a deferred promise so the
 * shell paints immediately.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getOverview, type Overview } from "../features/projects/projects.functions.js";

export const Route = createFileRoute("/")({
	ssr: true,
	loader: async (): Promise<Overview> => getOverview() as Promise<Overview>,
	component: OverviewPage,
});

function OverviewPage() {
	const overview = Route.useLoaderData() as Overview;
	return (
		<div id="overview" className="view">
			<h2>Attention</h2>
			<div className="tiles">
				{overview.stats.map((s) => (
					<div key={s.label} className="tile" title={s.hint}>
						<div className="tile-n">{s.value}</div>
						<div className="tile-l">{s.label}</div>
					</div>
				))}
			</div>
			<h3>Recent activity</h3>
			<ul className="activity">
				{overview.activity.map((a) => (
					<li key={`${a.kind}:${a.where}:${a.at}`}>
						<span className="dim">{a.at}</span> {a.title} <span className="dim">{a.status}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
