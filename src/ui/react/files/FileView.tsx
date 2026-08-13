/**
 * The file tab's decision chain, ported from loadFile: source goes to the
 * SYMBOL-AWARE viewer first — without that the outline strip and every
 * identifier click are unreachable by any user gesture. When the server will
 * not serve the file that way (over the source cap, binary, unindexed), the
 * tab falls through to the truncating read-only body, and past that to the
 * peek of whatever Find last matched. It never pretends to a body it was not
 * given.
 */
import { Await } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import "./code.css";
import {
	getFileBody,
	type FileBodyReply,
	type OutlineReply,
	type SourceReply,
} from "../../../features/projects/files.functions.js";
import { CodeViewer } from "./CodeViewer.js";
import { EdBar } from "./ed-bar.js";
import { FilePeek, PeekBlock, useMarkLine } from "./FilePeek.js";

interface Props {
	path: string;
	source: SourceReply;
	outline: Promise<OutlineReply>;
	line: number;
	sym?: string;
}

export function FileView({ path, source, outline, line, sym }: Props) {
	if (!source.ok) return <FallbackBody path={path} line={line} />;
	return (
		<Suspense fallback={<CodeViewer source={source} outline={null} line={line} sym={sym} />}>
			<Await promise={outline}>
				{(o: OutlineReply) => <CodeViewer source={source} outline={o} line={line} sym={sym} />}
			</Await>
		</Suspense>
	);
}

/**
 * The /api/file half of the legacy chain: a body truncated at 512KB, shown
 * read-only with the peek block above it — where the hit is, without hiding
 * the document. Fetched lazily so the common case never reads a file twice.
 */
function FallbackBody({ path, line }: { path: string; line: number }) {
	const [reply, setReply] = useState<FileBodyReply | "loading">("loading");
	useEffect(() => {
		let stale = false;
		setReply("loading");
		getFileBody({ data: { path } })
			.then((r: FileBodyReply) => {
				if (!stale) setReply(r);
			})
			.catch(() => {
				if (!stale) setReply({ ok: false, note: "read failed" });
			});
		return () => {
			stale = true;
		};
	}, [path]);
	useMarkLine([reply, line]);

	if (reply === "loading") return <div className="empty small">opening …</div>;
	if (!reply.ok) return <FilePeek path={path} line={line} />;
	return (
		<>
			<EdBar path={path} line={line} />
			<PeekBlock path={path} line={line} />
			<div className="file-plain">
				<pre className="code" dangerouslySetInnerHTML={{ __html: reply.html }} />
				{reply.truncated ? (
					<div className="empty small">shown to 512KB of {reply.bytes} bytes</div>
				) : null}
			</div>
		</>
	);
}
