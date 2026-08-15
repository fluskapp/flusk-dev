/**
 * Gone as a window (docs/experience.md): a flow run IS a run, so /flows
 * forwards to the Flows segment of /runs. Old links survive — ?run=<id>
 * keeps naming the same open run, as /runs?flow=<id>.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";

const Search = Type.Object({ run: Type.Optional(Type.String()) });

export const Route = createFileRoute("/flows")({
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	beforeLoad: ({ search }) => {
		const run = (search as { run?: string }).run;
		throw redirect({
			to: "/runs",
			search: { kind: "flow", ...(run !== undefined ? { flow: run } : {}) },
		});
	},
});
