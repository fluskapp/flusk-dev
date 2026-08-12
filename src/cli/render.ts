import { styleText } from "node:util";
import type { EventBus } from "../core/events.js";

type Style = Parameters<typeof styleText>[0];

const SUMMARY_MAX = 60;

/** Best-effort one-line summary of tool args: command, then file_path, then JSON. */
function summarizeArgs(args: unknown): string {
	let text: string;
	if (typeof args === "object" && args !== null) {
		const rec = args as Record<string, unknown>;
		if (typeof rec.command === "string") text = rec.command;
		else if (typeof rec.file_path === "string") text = rec.file_path;
		else text = JSON.stringify(args);
	} else {
		text = JSON.stringify(args) ?? String(args);
	}
	const oneLine = text.replace(/\n/g, " ");
	return oneLine.length > SUMMARY_MAX ? `${oneLine.slice(0, SUMMARY_MAX)}…` : oneLine;
}

function firstLine(text: string): string {
	return text.split("\n", 1)[0] ?? "";
}

/**
 * Terminal renderer: subscribes to the event bus and writes a live view of
 * the run to `out`. Colors only when the stream is a TTY.
 */
export function attachRenderer(events: EventBus, out: NodeJS.WritableStream): void {
	const isTTY = Boolean((out as { isTTY?: boolean }).isTTY);
	const paint = (style: Style, text: string): string => (isTTY ? styleText(style, text) : text);
	let midLine = false;
	const line = (text: string): void => {
		if (midLine) {
			out.write("\n");
			midLine = false;
		}
		out.write(`${text}\n`);
	};

	let modelShown = false;
	let liveCostUsd = 0;
	events.on("run:start", (e) => {
		line(paint("bold", `flusk · ${e.task}`));
		if (modelShown) return; // the chosen model is announced exactly once
		modelShown = true;
		line(paint("dim", `model ${e.model.provider}/${e.model.id} · run ${e.runId}`));
	});
	events.on("turn:end", (e) => {
		liveCostUsd += e.message.usage.costUsd;
	});
	events.on("assistant:delta", (e) => {
		if (e.channel !== "text") return;
		out.write(e.text);
		midLine = !e.text.endsWith("\n");
	});
	events.on("tool:start", (e) => {
		line(paint("cyan", `→ ${e.name}: ${summarizeArgs(e.args)}`));
	});
	events.on("tool:end", (e) => {
		if (!e.isError) return;
		line(paint("red", `  ✗ ${firstLine(e.output)}`));
	});
	events.on("run:end", (e) => {
		// Live per-turn accumulation backs the stats figure when it reads zero.
		const cost = `$${(e.stats.usage.costUsd || liveCostUsd).toFixed(4)}`;
		line(paint("bold", `done ${e.reason} · ${e.stats.turns} turns · ${cost}`));
	});
}
