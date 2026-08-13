/**
 * The visible-context half of the Ask panel: EXACTLY what will be attached,
 * every block in full, each one switchable off — off dims, never disappears,
 * because "what did I turn off" has to be answerable at a glance. Ported from
 * client-ask-context.ts.
 */
import type { AskBlock } from "../../../features/orchestra/ask.functions.js";
import { askCountText, askPreamble, askToggleBlock } from "./ask-logic.js";
import { A } from "./ask-store.js";
import { askScopeText, askWho } from "./ask-who.js";

const base = (p: string): string => p.split("/").pop() ?? p;

function Block({ b }: { b: AskBlock }) {
	const off = A.off[b.id] === true;
	return (
		<div className={off ? "ask-blk off" : "ask-blk"} data-ask-blk={b.id}>
			<label className="ask-blk-h">
				<input
					type="checkbox"
					data-ask-block={b.id}
					checked={!off}
					onChange={(e) => askToggleBlock(b.id, e.target.checked)}
				/>
				<span>{b.label}</span>
			</label>
			<pre className="ask-blk-b">{b.text}</pre>
		</div>
	);
}

/**
 * The agent's prompt as its own block: rendered, counted, and labelled with
 * who wrote it. No checkbox — it genuinely cannot be switched off, and
 * pretending otherwise would be a worse lie than not showing it.
 */
function PreambleBlock() {
	const head = askPreamble();
	if (head === "") return null;
	const who = askWho();
	const where = askScopeText(who);
	return (
		<div className="ask-blk ask-blk-fixed" data-ask-blk="preamble">
			<div className="ask-blk-h">
				<span>
					agent prompt — {who?.label}
					{where !== "" ? ` (${where})` : ""}, prepended to your question and not switchable
				</span>
			</div>
			<pre className="ask-blk-b">{head}</pre>
		</div>
	);
}

/** Never a blank box: a snapshot with no blocks prints the server's sentences. */
export function AskContextCard() {
	const blocks = A.ctx?.blocks ?? [];
	let notes = (A.err !== "" ? [A.err] : []).concat(A.notes);
	if (!A.loading && blocks.length === 0 && askPreamble() === "" && notes.length === 0) {
		notes = ["Nothing was attached, so the question goes to the model on its own."];
	}
	return (
		<section className="ask-ctx">
			<div className="ask-ctx-head">
				<span>Context attached</span>
				{A.ctx?.file != null ? (
					<span className="ask-where" title={A.ctx.file}>
						{base(A.ctx.file)}
						{A.ctx.symbol !== null ? ` › ${A.ctx.symbol}` : ""}
					</span>
				) : null}
				<span className="spacer" />
				<span id="ask-count" className="dim small">
					{askCountText()}
				</span>
			</div>
			{A.loading ? (
				<div className="ask-empty">Reading what is on screen …</div>
			) : (
				<>
					<PreambleBlock />
					{blocks.map((b) => (
						<Block key={b.id} b={b} />
					))}
				</>
			)}
			{notes.map((n, i) => (
				<div className="ask-note" key={i}>
					{n}
				</div>
			))}
		</section>
	);
}
