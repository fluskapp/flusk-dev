/**
 * The window's body: the sections of one symbol in the order IntelliJ reads
 * them, or a sentence you can act on. Never a blank box — every state below
 * prints something (client-doc.ts renderDoc / client-doc-rows.ts docSections).
 */
import type { DocState } from "./use-doc.js";
import { base, useDocRendered } from "./use-doc.js";
import { DocSec, LocRow, TagsSec, UsagesSec } from "./doc-rows.js";
import { RelatedSec } from "./doc-related.js";

function Empty({ text }: { text: string }) {
	return <div className="dw-empty">{text}</div>;
}

export function DocBody({ state }: { state: DocState }) {
	const p = state.payload;
	const doc = p?.doc ?? null;
	// The signature starts as escaped text, so a failed render degrades to
	// plain source; the seq guard lives inside the hook.
	const rendered = useDocRendered(doc, p?.file ?? "");
	if (state.busy !== "") {
		return (
			<Empty
				text={`Indexing this project to look up ${base(state.busy)} … the first symbol waits for the language service, the rest are instant.`}
			/>
		);
	}
	if (p === null) {
		return (
			<Empty text="No symbol at the caret. Open a source file — the project tree, ⌘⇧O, or a Find in Files hit — and click any identifier in it." />
		);
	}
	if (doc === null) return <Empty text={p.note ?? "no symbol at this position"} />;
	const openable = p.openable ?? null;
	return (
		<>
			<DocSec title="Signature">
				{rendered !== null && rendered.sig !== "" ? (
					<div className="dw-sig" dangerouslySetInnerHTML={{ __html: rendered.sig }} />
				) : (
					<div className="dw-sig">
						<pre className="code">{doc.signature}</pre>
					</div>
				)}
			</DocSec>
			<DocSec title="Documentation">
				{rendered !== null && rendered.prose !== "" ? (
					<div className="dw-doc" dangerouslySetInnerHTML={{ __html: rendered.prose }} />
				) : (
					<div className="dw-doc">
						{rendered === null && doc.docs !== "" ? null : (
							<div className="dw-none">no doc comment here</div>
						)}
					</div>
				)}
			</DocSec>
			<TagsSec tags={doc.tags} />
			<DocSec title="Defined in">
				{doc.defined !== null ? (
					<LocRow loc={doc.defined} openable={openable === null || openable.includes(doc.defined.file)} />
				) : (
					<div className="dw-none">no declaration for this symbol in the indexed sources</div>
				)}
			</DocSec>
			<UsagesSec doc={doc} openable={openable} />
			<RelatedSec related={p.related} note={p.note} />
		</>
	);
}
