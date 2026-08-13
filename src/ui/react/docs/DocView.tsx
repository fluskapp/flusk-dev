/**
 * One document, RENDERED (client-docs.ts's loadDoc): frontmatter as a
 * property table ahead of the body, the [Preview | Split | Raw] control in
 * the toolbar, and the path actions every file-holding view offers.
 */
import type { DocBody, DocMeta } from "../../../features/docs/docs.functions.js";
import { PathActions } from "../runs/run-actions.js";
import { useToast } from "../runs/widgets.js";
import { fmTable } from "./frontmatter.js";
import { MdSurface } from "./MdSurface.js";
import "../runs/table.css";
import "../runs/widgets.css";
import "../runs/stages.css";
import "./docs.css";

export function DocView({ meta, body }: { meta: DocMeta; body: DocBody }) {
	const [toastNode, toast] = useToast();
	return (
		<>
			<MdSurface
				id={`doc:${meta.path}`}
				title={meta.title}
				path={meta.path}
				html={fmTable(meta.frontmatter) + body.html}
				text={body.text}
				actions={<PathActions path={meta.path} toast={toast} />}
			/>
			{toastNode}
		</>
	);
}
