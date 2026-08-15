/**
 * Attention/Overview: what needs me. Stat tiles from the loader; recent
 * activity is the heavier half and streams behind a deferred promise so the
 * shell paints immediately.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getOverview, type Overview } from "../features/projects/projects.functions.js";
import { getSetupStatus, type SetupStatus } from "../features/setup/setup.functions.js";

export const Route = createFileRoute("/")({
	ssr: true,
	loader: async (): Promise<{ overview: Overview; setup: SetupStatus }> => {
		// Independent reads — the session scan and the doctor cache share no
		// state, so paying them serially was pure waterfall.
		const [overview, setup] = await Promise.all([
			getOverview() as Promise<Overview>,
			getSetupStatus() as Promise<SetupStatus>,
		]);
		return { overview, setup };
	},
	component: OverviewPage,
});

function OverviewPage() {
	const { overview, setup } = Route.useLoaderData() as { overview: Overview; setup: SetupStatus };
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
			{setup.worst !== "ok" ? (
				<p className="dim setup-line">
					{setup.worst === "unknown"
						? "setup: never checked — run flusk doctor"
						: `setup: ${setup.worst} — ${Object.entries(setup.checks)
								.filter(([, v]) => !v.startsWith("ok:"))
								.map(([k]) => k)
								.join(", ")} (flusk doctor)`}
				</p>
			) : null}
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
