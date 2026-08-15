/**
 * One run. Which view the ref gets is decided by its shape (client-run.ts):
 * a session key lands in the transcript, a journal path renders as markdown.
 * The header half is awaited; the transcript/body — the biggest payload in
 * the app — is a DEFERRED promise behind Suspense + Await.
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
import { getDecisionLog, type DecisionLog } from "../features/run/run.functions.js";
import { decodeRef, refKind } from "../ui/react/runs/format.js";
import { JournalRun } from "../ui/react/runs/JournalRun.js";
import { Decisions } from "../ui/react/runs/Decisions.js";
import { SessionBody } from "../ui/react/runs/SessionRun.js";
import { SkelText, SkelTranscript } from "../ui/react/runs/skeleton.js";

type RunLoad =
	| {
			kind: "session";
			ref: string;
			head: RunHead;
			detail: Promise<SessionRun>;
			decisions: Promise<DecisionLog | null>;
	  }
	| { kind: "journal"; ref: string; meta: Journal | null; body: Promise<JournalBody> };

export const Route = createFileRoute("/runs/$runId")({
	ssr: true,
	loader: async ({ params }): Promise<RunLoad> => {
		const ref = decodeRef(params.runId);
		if (refKind(ref) === "session") {
			return {
				kind: "session",
				ref,
				head: (await getRunHead({ data: { key: ref } })) as RunHead,
				detail: getSessionRun({ data: { key: ref } }) as Promise<SessionRun>,
				decisions: getDecisionLog({ data: { ref } }).catch(() => null) as Promise<DecisionLog | null>,
			};
		}
		return {
			kind: "journal",
			ref,
			// One journal's frontmatter, not the whole index (content.router.ts).
			meta: (await getJournalMeta({ data: { path: ref } })) as Journal | null,
			body: getJournalBody({ data: { path: ref } }).catch(
				(): JournalBody => ({ text: "", html: "" }),
			) as Promise<JournalBody>,
		};
	},
	component: RunPage,
});

function RunPage() {
	const load = Route.useLoaderData() as RunLoad;
	if (load.kind === "session") {
		const task = load.head.summary?.task ?? load.ref;
		return (
			<div id="run" className="view">
				<div className="head-row">
					<h2>{task}</h2>
					<span className="dim">{load.head.path ?? load.ref}</span>
				</div>
				<Suspense fallback={null}>
					<Await promise={load.decisions}>{(log: DecisionLog | null) => <Decisions log={log} />}</Await>
				</Suspense>
				<Suspense fallback={<SkelTranscript />}>
					<Await promise={load.detail}>
						{(d: SessionRun) => <SessionBody d={d} keyRef={load.ref} />}
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
