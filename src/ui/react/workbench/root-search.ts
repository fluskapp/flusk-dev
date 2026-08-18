/**
 * The workbench's URL-borne state: which tool windows are open and how wide
 * the resizable ones are. Root-route search params rather than localStorage,
 * so the whole workbench state is linkable and restorable — this continues
 * what the legacy tree already started ("the address bar names the run").
 *
 * Typebox, the same vocabulary as tool args and config sections. Everything
 * is optional with a default, so a bare URL is the default workbench.
 */
import { Type } from "typebox";
import { Value } from "typebox/value";

export const RootSearchSchema = Type.Object({
	/** Projects rail (tool window 1). */
	side: Type.Optional(Type.Boolean()),
	/** Chat rail (5). */
	chat: Type.Optional(Type.Boolean()),
	/** Find strip along the bottom (4). */
	find: Type.Optional(Type.Boolean()),
	/** Documentation window (6). */
	doc: Type.Optional(Type.Boolean()),
	/** Run Configurations dialog: a config name, "new", or absent = closed. */
	rc: Type.Optional(Type.String()),
	/** Rail widths, px, clamped by the grips on write. */
	sw: Type.Optional(Type.Number()),
	cw: Type.Optional(Type.Number()),
});

export interface RootSearch {
	side?: boolean;
	chat?: boolean;
	find?: boolean;
	doc?: boolean;
	rc?: string;
	sw?: number;
	cw?: number;
}

/** Defaults mirror the legacy boot: rails open, Find closed until summoned. */
export const ROOT_DEFAULTS = { side: true, chat: true, find: false, doc: false } as const;

/** Drops unknown keys and mistyped values rather than throwing: a mangled
 * hand-edited URL degrades to the default workbench, never to an error page. */
export function validateRootSearch(input: Record<string, unknown>): RootSearch {
	const out: Record<string, unknown> = {};
	for (const key of ["side", "chat", "find", "doc", "rc", "sw", "cw"]) {
		if (key in input) out[key] = input[key];
	}
	const cleaned = Value.Convert(RootSearchSchema, out);
	return Value.Check(RootSearchSchema, cleaned) ? (cleaned as RootSearch) : {};
}
