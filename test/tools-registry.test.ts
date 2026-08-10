import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../src/tools/registry.js";
import type { Tool } from "../src/tools/tool.js";
import { truncateMiddle } from "../src/tools/truncate.js";

const echoTool: Tool = {
	name: "echo",
	description: "echoes args back",
	parameters: Type.Object({
		file_path: Type.String(),
		count: Type.Optional(Type.Number()),
	}),
	mode: "parallel",
	execute: async (args) => ({ output: JSON.stringify(args) }),
};

describe("ToolRegistry", () => {
	it("registers, gets, and lists tools", () => {
		const reg = new ToolRegistry();
		reg.register(echoTool);
		expect(reg.get("echo")).toBe(echoTool);
		expect(reg.get("nope")).toBeUndefined();
		expect(reg.list()).toEqual([echoTool]);
	});

	it("schemas() returns name, description, and parameters pass-through", () => {
		const reg = new ToolRegistry();
		reg.register(echoTool);
		const schemas = reg.schemas();
		expect(schemas).toHaveLength(1);
		const schema = schemas[0];
		if (!schema) throw new Error("expected one schema");
		expect(schema.name).toBe("echo");
		expect(schema.description).toBe("echoes args back");
		expect(schema.parameters).toBe(echoTool.parameters);
		expect((schema.parameters as { type: string }).type).toBe("object");
	});

	it("throws a useful message when a required arg is missing", () => {
		const reg = new ToolRegistry();
		expect(() => reg.validateArgs(echoTool, {})).toThrowError(/file_path[\s\S]*Received: \{\}/);
	});

	it('coerces string "5" to number 5 via Convert', () => {
		const reg = new ToolRegistry();
		const out = reg.validateArgs(echoTool, { file_path: "a.txt", count: "5" });
		expect(out).toEqual({ file_path: "a.txt", count: 5 });
	});

	it("does not mutate the caller's args object", () => {
		const reg = new ToolRegistry();
		const args = { file_path: "a.txt", count: "5" };
		reg.validateArgs(echoTool, args);
		expect(args.count).toBe("5");
	});
});

describe("truncateMiddle", () => {
	it("returns short strings unchanged", () => {
		expect(truncateMiddle("hello", 10)).toBe("hello");
	});

	it("elides the middle and reports elided char count", () => {
		const s = "a".repeat(50) + "b".repeat(50);
		const out = truncateMiddle(s, 20);
		expect(out.startsWith("a".repeat(10))).toBe(true);
		expect(out.endsWith("b".repeat(10))).toBe(true);
		expect(out).toContain("… [elided 80 chars] …");
	});
});
