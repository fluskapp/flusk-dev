/**
 * The chat endpoints: the picker, the SSE stream, and the disconnect path.
 * Everything runs against a local stub endpoint — no CLI is ever spawned and
 * nothing leaves the loopback interface.
 */
import { writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { readConversation } from "../src/features/chat/chat-log.repository.js";
import type { ChatBackend } from "../src/features/chat/types.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { type ChatStub, startChatStub } from "./api-chat-stub.js";
import { call, post, sseChunks } from "./api-http.js";
import { journal, type Tree, tree } from "./project-fixture.js";

let t: Tree;
let ui: UiServer;
let stub: ChatStub;

beforeAll(async () => {
	t = tree();
	journal(join(t.work, "proj-a"), "r", { title: "Run: r", date: "2026-08-01", status: "done" });
	stub = await startChatStub();
	writeFileSync(
		join(t.home, "config.json"),
		JSON.stringify({
			ui: t.cfg.ui,
			memory: { enabled: false },
			chat: {
				backends: [
					{
						id: "stub",
						label: "Stub",
						kind: "openai-compatible",
						baseUrl: `${stub.url}/fast`,
						model: "m",
					},
					{ id: "stub-slow", kind: "openai-compatible", baseUrl: `${stub.url}/slow`, model: "m" },
				],
			},
		}),
	);
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	await stub.close();
	t.cleanup();
});

it("lists configured backends alongside the auto-detected CLIs", async () => {
	const res = await call(ui.url, "/api/chat/backends");
	expect(res.status).toBe(200);
	const list = JSON.parse(res.body) as ChatBackend[];
	expect(list.map((b) => b.id)).toEqual(["claude", "codex", "kimi", "stub", "stub-slow"]);
	expect(list.every((b) => typeof b.available === "boolean")).toBe(true);
	expect(list.find((b) => b.id === "stub")).toMatchObject({
		available: true,
		kind: "openai-compatible",
	});
});

it("streams meta first, one frame per chunk, and persists the conversation", async () => {
	const res = await post(ui.url, "/api/chat", {
		backendId: "stub",
		messages: [{ role: "user", content: "hi" }],
	});
	expect(res.status).toBe(200);
	const frames = sseChunks(res.body);
	expect(frames[0]).toMatchObject({ type: "meta" });
	expect(frames.slice(1)).toEqual([
		{ type: "delta", text: "hello " },
		{ type: "delta", text: "world" },
		{ type: "done" },
	]);
	// The SSE transcript and the file on disk tell the same story.
	const id = (frames[0] as { conversationId: string }).conversationId;
	expect(readConversation(id).turns.map((t) => [t.role, t.content])).toEqual([
		["user", "hi"],
		["assistant", "hello world"],
	]);
});

it("rejects a conversationId that is not a server-issued id", async () => {
	const res = await post(ui.url, "/api/chat", {
		backendId: "stub",
		messages: [{ role: "user", content: "hi" }],
		conversationId: "../x",
	});
	expect(res.status).toBe(400);
	expect(JSON.parse(res.body)).toEqual({ error: "conversationId must be a server-issued id" });
});

it("reports an unknown backend as an error chunk, not an HTTP failure", async () => {
	const res = await post(ui.url, "/api/chat", {
		backendId: "ghost",
		messages: [{ role: "user", content: "hi" }],
	});
	expect(res.status).toBe(200);
	const frames = sseChunks(res.body);
	expect(frames[0]).toMatchObject({ type: "meta" });
	expect(frames.slice(1)).toEqual([
		{ type: "error", message: "unknown chat backend: ghost" },
		{ type: "done" },
	]);
});

it("aborts the upstream stream when the client disconnects", async () => {
	const url = new URL(ui.url);
	const req = request(
		{
			hostname: "127.0.0.1",
			port: url.port,
			path: "/api/chat",
			method: "POST",
			headers: { "content-type": "application/json" },
		},
		(res) => {
			// First frame proves the stream is live; killing the tab is the point.
			res.on("data", () => req.destroy());
		},
	);
	req.on("error", () => {}); // destroy() surfaces as ECONNRESET here
	req.end(JSON.stringify({ backendId: "stub-slow", messages: [{ role: "user", content: "hi" }] }));

	for (let i = 0; i < 100 && !stub.aborted; i++) await delay(50);
	expect(stub.aborted).toBe(true);
});
