import type { Msg } from "../core/types.js";

/** System prompt for the compaction summarizer call. */
export function summarizeSystem(): string {
	return [
		"You compress an agent transcript into a handoff summary for a coding agent",
		"that will continue the work with the original transcript removed.",
		"Respond with exactly these markdown sections:",
		"## Goal",
		"## Current state",
		"## Decisions",
		"## Files read",
		"## Files modified",
		"## Next steps",
		"When a previous summary is given, merge it in so nothing already learned is lost.",
		"Be terse: bullets over prose, no preamble, no commentary outside the sections.",
	].join("\n");
}

function renderMsg(m: Msg): string {
	switch (m.role) {
		case "user":
			return `[user] ${m.content}`;
		case "toolResult":
			return `[tool ${m.name}${m.isError ? " ERROR" : ""}] ${m.output}`;
		case "assistant": {
			const parts: string[] = [];
			for (const b of m.content) {
				if (b.type === "text") parts.push(b.text);
				else if (b.type === "toolCall") parts.push(`<call ${b.name} ${JSON.stringify(b.args)}>`);
				// thinking blocks are omitted: they never carry state the summary needs
			}
			return `[assistant] ${parts.join(" ")}`;
		}
	}
}

/** User message for the summarizer: optional previous summary, then the transcript. */
export function summarizeUser(msgs: Msg[], previousSummary?: string): string {
	const transcript = msgs.map(renderMsg).join("\n");
	if (previousSummary === undefined) {
		return `Transcript to summarize:\n${transcript}`;
	}
	return `Previous summary to merge:\n${previousSummary}\n\nTranscript to fold into it:\n${transcript}`;
}
