/**
 * The drag grips on the rail edges. Widths land in the root search params
 * (sw/cw) — the same place every other piece of workbench state lives — with
 * replace-style navigation so a drag is not two hundred history entries.
 * Clamped to the legacy bounds: a rail below 300px elides everything it says.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

const MIN = 300;
const MAX = 720;

const clamp = (px: number): number => Math.max(MIN, Math.min(MAX, Math.round(px)));

export function Grip({ side }: { side: "left" | "right" }) {
	const navigate = useNavigate();
	const onPointerDown = useCallback(
		(down: React.PointerEvent<HTMLDivElement>) => {
			down.preventDefault();
			const key = side === "left" ? "sw" : "cw";
			const move = (e: PointerEvent): void => {
				const width = side === "left" ? e.clientX : window.innerWidth - e.clientX;
				navigate({
					to: ".",
					replace: true,
					search: (prev: Record<string, unknown>) => ({ ...prev, [key]: clamp(width) }),
				});
			};
			const up = (): void => {
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", up);
			};
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", up);
		},
		[navigate, side],
	);
	return <div className={`grip grip-${side}`} onPointerDown={onPointerDown} />;
}
