/**
 * One run. Which view the ref gets is decided by its shape (client-run.ts):
 * a session key lands in the transcript, an 8-hex id is a LIVE run tailed
 * over SSE, a journal path renders as markdown. The header half is awaited;
 * the transcript/body — the biggest payload in the app — is a DEFERRED
 * promise behind Suspense + Await.
 */
import { Await, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	getJournalBody,
	getJournalMeta,
	getRunHead,
	getSessionRun,
	type Journal,
	type JournalBody,
	type RunHead,
	type SessionRun,
} from "../features/projects/runs.functions.js";
import {
	getDecisionLog,
	getLiveRuns,
	type DecisionLog,
	type StartedRun,
} from "../features/run/run.functions.js";
import { decodeRef, refKind } from "../ui/react/runs/format.js";
import { JournalRun } from "../ui/react/runs/JournalRun.js";
import { Decisions } from "../ui/react/runs/Decisions.js";
import { LiveGone, LiveRun } from "../ui/react/runs/LiveRun.js";
import { SessionBody, type SessionLoadFail } from "../ui/react/runs/SessionRun.js";
import { SkelText, SkelTranscript } from "../ui/react/runs/skeleton.js";

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e));

type RunLoad =
	| {
			kind: "session";
			ref: string;
			head: RunHead;
			detail: Promise<SessionRun | SessionLoadFail>;
			decisions: Promise<DecisionLog | null>;
	  }
	| { kind: "live"; ref: string; run: StartedRun | null }
	| { kind: "journal"; ref: string; meta: Journal | null; body: Promise<JournalBody> };

export const Route = createFileRoute("/runs_/$runId")({
	ssr: true,
	loader: async ({ params }): Promise<RunLoad> => {
		const ref = decodeRef(params.runId);
		const kind = refKind(ref);
		if (kind === "session") {
			const head = (await getRunHead({ data: { key: ref } })) as RunHead;
			return {
				kind: "session",
				ref,
				head,
				// A missing/torn file must degrade to the error note, never reject
				// the SSR stream: an unhandled deferred rejection kills the whole
				// page render (it did, in CI, on exactly this line).
				detail: getSessionRun({ data: { key: ref } }).catch(
					(e: unknown): SessionLoadFail => ({
						header: null,
						error: reason(e),
						path: head.path ?? ref,
					}),
				) as Promise<SessionRun | SessionLoadFail>,
				decisions: getDecisionLog({ data: { ref } }).catch(() => null) as Promise<DecisionLog | null>,
			};
		}
		if (kind === "live") {
			// The RunnerWidget's chip links here with the id launch minted; an
			// unknown id (the server restarted) renders the honest note instead.
			const live = ((await getLiveRuns().catch(() => [])) as StartedRun[])
				.find((r) => r.runId === ref);
			return { kind: "live", ref, run: live ?? null };
		}
		return {
			kind: "journal",
			ref,
			// One journal's frontmatter, not the whole index (content.router.ts).
			meta: (await getJournalMeta({ data: { path: ref } })) as Journal | null,
			body: getJournalBody({ data: { path: ref } }).catch(
				(e: unknown): JournalBody => ({ text: "", html: "", error: reason(e) }),
			) as Promise<JournalBody>,
		};
	},
	component: RunPage,
});

function RunPage() {
	const load = Route.useLoaderData() as RunLoad;
	if (load.kind === "live") {
		return (
			<div id="run" className="view">
				{load.run !== null ? <LiveRun runId={load.ref} task={load.run.task} /> : <LiveGone runId={load.ref} />}
			</div>
		);
	}
	if (load.kind === "session") {
		// A task can be a whole spec; the TITLE is its first line and nothing
		// more — the full text already opens the transcript as the user turn.
		const task = (load.head.summary?.task ?? load.ref).split("\n", 1)[0] ?? load.ref;
		return (
			<div id="run" className="view">
				<div className="head-row">
					<h2 className="sys-ellipsis" title={load.head.summary?.task ?? undefined}>{task}</h2>
				</div>
				<Suspense fallback={null}>
					<Await promise={load.decisions}>{(log: DecisionLog | null) => <Decisions log={log} />}</Await>
				</Suspense>
				<Suspense fallback={<SkelTranscript />}>
					<Await promise={load.detail}>
						{(d: SessionRun | SessionLoadFail) => <SessionBody d={d} keyRef={load.ref} />}
					</Await>
				</Suspense>
			</div>
		);
	}
	// The meta half is already here: the fallback shows the run's name while
	// the body streams, so the header is immediate in both branches.
	const fallbackTitle = load.meta?.title.replace(/^Run:\s*/, "") ?? load.ref;
	return (
		<div id="run" className="view">
			<Suspense
				fallback={
					<>
						<div className="head-row">
							<h2>{fallbackTitle}</h2>
						</div>
						<SkelText rows={7} />
					</>
				}
			>
				<Await promise={load.body}>
					{(body: JournalBody) => <JournalRun meta={load.meta} path={load.ref} body={body} />}
				</Await>
			</Suspense>
		</div>
	);
}
