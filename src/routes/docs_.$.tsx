/**
 * A rendered document. The splat is the document's absolute path without its
 * leading slash (the tree and list build links the same way). Meta — title
 * and frontmatter — is awaited; the BODY is a DEFERRED promise so the list
 * navigates instantly however large the file is.
 */
import { Await, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	type DocBody,
	type DocMeta,
	getDocBody,
	getDocMeta,
} from "../features/docs/docs.functions.js";
import { DocView } from "../ui/react/docs/DocView.js";
import { decodeRef } from "../ui/react/runs/format.js";
import { SkelText } from "../ui/react/runs/skeleton.js";

interface DocLoad {
	path: string;
	meta: DocMeta | null;
	body: Promise<DocBody>;
}

export const Route = createFileRoute("/docs_/$")({
	ssr: true,
	loader: async ({ params }): Promise<DocLoad> => {
		const path = `/${decodeRef((params as { _splat?: string })._splat ?? "")}`;
		return {
			path,
			meta: (await getDocMeta({ data: { path } })) as DocMeta | null,
			body: getDocBody({ data: { path } }).catch(
				(): DocBody => ({ text: "", html: "" }),
			) as Promise<DocBody>,
		};
	},
	component: Page,
});

function Page() {
	const load = Route.useLoaderData() as DocLoad;
	if (load.meta === null) {
		return (
			<div id="docview" className="view">
				<div className="empty small">could not render this document</div>
			</div>
		);
	}
	const meta = load.meta;
	return (
		<div id="docview" className="view">
			<Suspense
				fallback={
					<>
						<div className="head-row">
							<h2>{meta.title}</h2>
						</div>
						<SkelText rows={8} />
					</>
				}
			>
				<Await promise={load.body}>
					{(body: DocBody) =>
						body.html === "" && body.text === "" ? (
							<div className="empty small">could not render this document</div>
						) : (
							<DocView meta={meta} body={body} />
						)
					}
				</Await>
			</Suspense>
		</div>
	);
}
