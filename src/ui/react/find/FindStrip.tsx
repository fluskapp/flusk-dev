/**
 * Tool window 4: Find in Files, along the bottom like the IDE it mirrors.
 * The workbench mounts this only while the root `find` search param is on, so
 * "Esc closes" is a navigation: flip the param off and the strip unmounts.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useOpenFile, useProjectName } from "../files/open-file.js";
import { FindPanel } from "./FindPanel.js";

export function FindStrip() {
	const navigate = useNavigate();
	const project = useProjectName();
	const openFile = useOpenFile();

	const close = useCallback(() => {
		void navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({ ...prev, find: false }),
		} as never);
	}, [navigate]);

	return (
		<section id="find">
			<div className="tw-head">
				<span className="tw-num">4</span>
				<span className="glyph">find</span>
				<span>Find in Files</span>
				<span className="spacer" />
				<button id="find-hide" title="Hide Find (⌘4)" onClick={close}>
					✕
				</button>
			</div>
			<FindPanel
				project={project}
				autoFocus
				onClose={close}
				onOpenFile={(path, line) => openFile(path, line)}
			/>
		</section>
	);
}
