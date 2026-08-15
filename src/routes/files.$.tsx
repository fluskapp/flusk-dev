/**
 * The code viewer with outline gutter (/files/$): the splat is the absolute
 * path, ?line= targets a line, ?sym= a declaration. ssr is data-only — the
 * component needs measured layout (the marked line's band is placed from the
 * gutter row's own offset), so it renders on the client.
 *
 * The body and the outline are the HEAVY half: both ride as un-awaited
 * promises, so the tab paints "opening …" immediately instead of holding the
 * navigation hostage to a disk read and a documentation engine.
 */
import { Await, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Type } from "typebox";
import { Value } from "typebox/value";
import {
	getFileOutline,
	getFileSource,
	type OutlineReply,
	type SourceReply,
} from "../features/projects/files.functions.js";
import { FileView } from "../ui/react/files/FileView.js";
import { SkelCode } from "../ui/react/runs/skeleton.js";

const Search = Type.Object({
	line: Type.Optional(Type.Number()),
	sym: Type.Optional(Type.String()),
});

interface FileLoader {
	path: string;
	source: Promise<SourceReply>;
	outline: Promise<OutlineReply>;
}

export const Route = createFileRoute("/files/$")({
	ssr: 'data-only',
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loader: async ({ params }): Promise<FileLoader> => {
		const raw = (params as { _splat?: string })._splat ?? "";
		// The splat loses its leading slash in the URL; every indexed path is
		// absolute, so put it back rather than asking the repository to guess.
		const path = raw.startsWith("/") || raw.startsWith("~") ? raw : `/${raw}`;
		return {
			path,
			source: getFileSource({ data: { path } }) as Promise<SourceReply>,
			outline: getFileOutline({ data: { path } }) as Promise<OutlineReply>,
		};
	},
	component: Page,
});

function Page() {
	const data = Route.useLoaderData() as FileLoader;
	const search = Route.useSearch() as { line?: number; sym?: string };
	return (
		<div id="file" className="view">
			<Suspense fallback={<SkelCode />}>
				<Await promise={data.source}>
					{(src: SourceReply) => (
						<FileView
							path={data.path}
							source={src}
							outline={data.outline}
							line={search.line ?? 0}
							sym={search.sym}
						/>
					)}
				</Await>
			</Suspense>
		</div>
	);
}
