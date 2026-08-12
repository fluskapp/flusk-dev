/**
 * Contract-shaped fake sources for the wiring tests.
 *
 * Separate from the tests because they answer a question the assertions
 * cannot: "built once per run" is a claim about how many times gather() ran,
 * and one build and two identical builds render the same bytes. So the source
 * counts its own calls and records the isResume it was asked with.
 */
import type { ContextSource } from "../src/features/context/types.js";

/** Distinctive enough that finding it in a system prompt proves the route. */
export const MARKER = "MARKER-VERIFY-CHAIN: this repository is verified with npm test.";

export interface Spy {
	calls: number;
	resumes: boolean[];
}

export const newSpy = (): Spy => ({ calls: 0, resumes: [] });

/** One pinned block, plus a record of every time it was asked for. */
export function fixtureSource(spy: Spy): ContextSource {
	return {
		id: "fixture",
		label: "Fixture",
		gather: (req) => {
			spy.calls += 1;
			spy.resumes.push(req.isResume);
			return {
				items: [
					{
						id: "fixture:verify",
						source: "fixture",
						title: "Verify chain",
						body: MARKER,
						why: "Fixture source, pinned — it states how this repo is verified.",
						tokens: 20,
						score: 0,
						tier: "pinned",
					},
				],
				status: "ok",
				notes: [],
			};
		},
	};
}

/** A source that breaks the no-throw contract gather() is defined by (L7). */
export const explodingSource: ContextSource = {
	id: "boom",
	label: "Broken",
	gather: () => {
		throw new Error("fixture source exploded");
	},
};
