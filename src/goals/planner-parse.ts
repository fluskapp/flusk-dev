/**
 * Defensive parsing of the planner LLM output: slice the first "{" to the
 * last "}", JSON-parse, validate the shape strictly. Garbage throws with the
 * tail of the raw text so the failure is diagnosable from the error alone.
 */

export interface ParsedPlan {
	title: string;
	tasks: Array<{ description: string; dependsOn: number[] }>;
}

const tail = (s: string): string => (s.length > 160 ? `…${s.slice(-160)}` : s);

export function parsePlanJson(raw: string): ParsedPlan {
	const a = raw.indexOf("{");
	const b = raw.lastIndexOf("}");
	if (a === -1 || b <= a) throw new Error(`planner: no JSON object in model output: ${tail(raw)}`);
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw.slice(a, b + 1));
	} catch {
		throw new Error(`planner: unparseable JSON in model output: ${tail(raw)}`);
	}
	const p = parsed as { title?: unknown; tasks?: unknown };
	const tasks = Array.isArray(p.tasks) ? p.tasks : null;
	if (typeof p.title !== "string" || p.title === "" || !tasks || tasks.length === 0)
		throw new Error(`planner: plan shape invalid (need title + non-empty tasks): ${tail(raw)}`);
	return {
		title: p.title,
		tasks: tasks.map((t) => {
			const o = t as { description?: unknown; dependsOn?: unknown };
			if (typeof o.description !== "string" || o.description === "")
				throw new Error(`planner: task without description: ${tail(raw)}`);
			const deps = o.dependsOn === undefined ? [] : o.dependsOn;
			if (!Array.isArray(deps) || deps.some((d) => !Number.isInteger(d)))
				throw new Error(`planner: dependsOn must be an array of task indices: ${tail(raw)}`);
			return { description: o.description, dependsOn: deps as number[] };
		}),
	};
}
