/**
 * The drag grips on the rail edges. Widths land in the root search params
 * (sw/cw) — the same place every other piece of workbench state lives — with
 * replace-style navigation so a drag is not two hundred history entries.
 * Clamped to the legacy bounds: a rail below 300px elides everything it says.
 *
 * While a drag is live the grip carries .dragging (the accent hairline stays
 * lit even when the pointer outruns the seam) and <body> carries .grip-drag
 * (window-wide resize cursor, no text selection). Double-click forgets the
 * width — the param leaves the URL and the rail returns to its default.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

const MIN = 300;
const MAX = 720;

const clamp = (px: number): number => Math.max(MIN, Math.min(MAX, Math.round(px)));

export function Grip({ side }: { side: "left" | "right" }) {
	const navigate = useNavigate();
	const [dragging, setDragging] = useState(false);
	const key = side === "left" ? "sw" : "cw";
	const onPointerDown = useCallback(
		(down: React.PointerEvent<HTMLDivElement>) => {
			down.preventDefault();
			setDragging(true);
			document.body.classList.add("grip-drag");
			const move = (e: PointerEvent): void => {
				const width = side === "left" ? e.clientX : window.innerWidth - e.clientX;
				navigate({
					to: ".",
					replace: true,
					search: (prev: Record<string, unknown>) => ({ ...prev, [key]: clamp(width) }),
				});
			};
			const up = (): void => {
				setDragging(false);
				document.body.classList.remove("grip-drag");
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", up);
			};
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", up);
		},
		[navigate, side, key],
	);
	const reset = useCallback(() => {
		navigate({
			to: ".",
			replace: true,
			search: (prev: Record<string, unknown>) => {
				const next = { ...prev };
				delete next[key];
				return next;
			},
		});
	}, [navigate, key]);
	return (
		<div
			className={`grip grip-${side}${dragging ? " dragging" : ""}`}
			title="Drag to resize · double-click to reset"
			onPointerDown={onPointerDown}
			onDoubleClick={reset}
		/>
	);
}
