/**
 * Attention/Overview: what needs me. The route stays thin — the loader reads,
 * OverviewView draws (stat tiles, setup line, verdict-first activity).
 */
import { createFileRoute } from "@tanstack/react-router";
import { getOverview, type Overview } from "../features/projects/projects.functions.js";
import { getRunFeed, type RunRow } from "../features/projects/runs.functions.js";
import { getSetupStatus, type SetupStatus } from "../features/setup/setup.functions.js";
import { OverviewView } from "../ui/react/overview/OverviewView.js";
import { ReviewQueue } from "../ui/react/overview/ReviewQueue.js";

export const Route = createFileRoute("/")({
	ssr: true,
	loader: async (): Promise<{ overview: Overview; setup: SetupStatus; feed: RunRow[] | null }> => {
		// Independent reads — the session scan and the doctor cache share no
		// state, so paying them serially was pure waterfall.
		const [overview, setup, feed] = await Promise.all([
			getOverview() as Promise<Overview>,
			getSetupStatus() as Promise<SetupStatus>,
			// The queue is an enhancement to the front page, not its spine: a
			// feed error degrades to an honest "unavailable" line, never a 500.
			(getRunFeed({ data: { limit: 50 } }) as Promise<RunRow[]>).catch(() => null),
		]);
		return { overview, setup, feed };
	},
	component: OverviewPage,
});

function OverviewPage() {
	const { overview, setup, feed } = Route.useLoaderData() as {
		overview: Overview;
		setup: SetupStatus;
		feed: RunRow[] | null;
	};
	return <OverviewView overview={overview} setup={setup} queue={<ReviewQueue rows={feed} />} />;
}
