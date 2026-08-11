/**
 * A composed prompt, as text. ONE renderer, because there is one format.
 *
 * `ah prompt` prints it for a human to copy and the flow runtime sends it to a
 * model; when each owned a copy of "`## <source>`, blank line, body, Constraints
 * as a `- ` list", a change to one silently did not reach the other.
 *
 * `why` is the single knob. `ah prompt` puts each block's justification in its
 * header, above the body, so the body repeats only the source. A flow node has
 * no header — nobody reads its prompt before the model does — so it carries the
 * justification inline, which is also the only way a step learns that the
 * artifact it inherited is one that FAILED.
 */
import type { ComposedPrompt } from "./types.js";

export interface RenderOptions {
	/** Emit each block's one-line justification between source and body. */
	why?: boolean;
}

export function renderBlocks(prompt: ComposedPrompt, opts: RenderOptions = {}): string {
	const head = (source: string, why: string): string =>
		opts.why === true && why.trim() !== "" ? `## ${source}\n${why.trim()}` : `## ${source}`;
	const parts = prompt.blocks.map((b) => `${head(b.source, b.why)}\n${b.text.trim()}\n`);
	if (prompt.constraints.length > 0) {
		parts.push(`## Constraints\n${prompt.constraints.map((c) => `- ${c}`).join("\n")}\n`);
	}
	return parts.join("\n");
}
