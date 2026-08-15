/**
 * The attachments strip above the composer — the old Ask context card, kept
 * whole (docs/experience.md): EXACTLY what will ride with the next message,
 * every block in full, each one switchable off — off dims, never disappears,
 * because "what did I turn off" has to be answerable at a glance.
 */
import type { AskBlock } from "../../../features/orchestra/ask.functions.js";
import { AttachAdd } from "./AttachAdd.js";
import { allBlocks, allNotes, countText, preambleText, toggleBlock } from "./attach-logic.js";
import { AT } from "./attach-store.js";
import { scopeText, whoRow } from "./attach-who.js";

const base = (p: string): string => p.split("/").pop() ?? p;

function Block({ b }: { b: AskBlock }) {
	const off = AT.off[b.id] === true;
	return (
		<div className={off ? "att-blk off" : "att-blk"} data-att-blk={b.id}>
			<label className="att-blk-h">
				<input
					type="checkbox"
					data-att-block={b.id}
					checked={!off}
					onChange={(e) => toggleBlock(b.id, e.target.checked)}
				/>
				<span>{b.label}</span>
			</label>
			<pre className="att-blk-b">{b.text}</pre>
		</div>
	);
}

/**
 * The agent's prompt as its own block: rendered, counted, and labelled with
 * who wrote it. No checkbox — it genuinely cannot be switched off, and
 * pretending otherwise would be a worse lie than not showing it.
 */
function PreambleBlock() {
	const head = preambleText();
	if (head === "") return null;
	const who = whoRow();
	const where = scopeText(who);
	return (
		<div className="att-blk att-blk-fixed" data-att-blk="preamble">
			<div className="att-blk-h">
				<span>
					agent prompt — {who?.label}
					{where !== "" ? ` (${where})` : ""}, prepended and not switchable
				</span>
			</div>
			<pre className="att-blk-b">{head}</pre>
		</div>
	);
}

/** Never a blank box: no blocks means the strip says what a send will be. */
export function AttachStrip() {
	const blocks = allBlocks();
	let notes = allNotes();
	if (!AT.loading && blocks.length === 0 && preambleText() === "" && notes.length === 0) {
		notes = ["Nothing attached — a message goes to the model on its own. Enter sends."];
	}
	return (
		<section id="chat-attach">
			<div className="att-head">
				<span>Attachments</span>
				{AT.ctx?.file != null ? (
					<span className="att-where" title={AT.ctx.file}>
						{base(AT.ctx.file)}
						{AT.ctx.symbol !== null ? ` › ${AT.ctx.symbol}` : ""}
					</span>
				) : null}
				<span className="spacer" />
				<span className="att-count">{countText()}</span>
			</div>
			{AT.loading ? (
				<div className="att-note">Reading what is on screen …</div>
			) : (
				<>
					<PreambleBlock />
					{blocks.map((b) => (
						<Block key={b.id} b={b} />
					))}
				</>
			)}
			{notes.map((n, i) => (
				<div className="att-note" key={i}>
					{n}
				</div>
			))}
			<AttachAdd />
		</section>
	);
}
