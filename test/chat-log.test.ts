/**
 * The chat conversation log: append-only JSONL under FLUSK_HOME/chats, the
 * supersede rule, and crash tolerance. All offline, all inside a tempdir.
 */
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
	chatsDir,
	latestConversationId,
	newConversationId,
	nextSeq,
	openChatLog,
	readConversation,
} from "../src/features/chat/chat-log.repository.js";
import type { ChatTurnRecord } from "../src/features/chat/types.js";

let home: string;
let realHome: string | undefined;

const turn = (fields: Partial<ChatTurnRecord>): ChatTurnRecord => ({
	role: "user",
	content: "hi",
	at: "2026-08-17T00:00:00.000Z",
	...fields,
});

beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-chat-log-"));
	realHome = process.env.FLUSK_HOME;
	process.env.FLUSK_HOME = home;
});

afterAll(() => {
	if (realHome === undefined) delete process.env.FLUSK_HOME;
	else process.env.FLUSK_HOME = realHome;
	rmSync(home, { recursive: true, force: true });
});

it("ids look server-issued and sort chronologically", () => {
	const id = newConversationId(new Date("2026-08-17T12:34:56.789Z"));
	expect(id.startsWith("2026-08-17T12-34-56-789Z-")).toBe(true);
	expect(id).toMatch(/^[A-Za-z0-9_-]{1,80}$/);
});

it("writes the header once, however often the log is reopened", () => {
	const a = openChatLog("re-open");
	a.append({ type: "turn", seq: 0, turn: turn({}) });
	a.close();
	const b = openChatLog("re-open");
	b.append({ type: "turn", seq: 1, turn: turn({ role: "assistant", content: "yo" }) });
	b.close();
	const lines = readFileSync(join(chatsDir(), "re-open.jsonl"), "utf8").trim().split("\n");
	expect(lines.filter((l) => l.includes('"header"'))).toHaveLength(1);
	expect(JSON.parse(lines[0] ?? "")).toMatchObject({ type: "header", version: 1, id: "re-open" });
	expect(readConversation("re-open").turns.map((t) => t.content)).toEqual(["hi", "yo"]);
	expect(nextSeq("re-open")).toBe(2);
});

it("a turn supersedes every partial with its seq", () => {
	const log = openChatLog("supersede");
	log.append({ type: "turn", seq: 0, turn: turn({}) });
	log.append({ type: "partial", seq: 1, text: "he", at: "2026-08-17T00:00:01.000Z" });
	log.append({ type: "partial", seq: 1, text: "hello", at: "2026-08-17T00:00:03.000Z" });
	log.append({ type: "turn", seq: 1, turn: turn({ role: "assistant", content: "hello world" }) });
	log.close();
	const { turns } = readConversation("supersede");
	expect(turns).toHaveLength(2);
	expect(turns[1]).toMatchObject({ role: "assistant", content: "hello world" });
	expect(turns[1]?.partial).toBeUndefined();
});

it("a trailing orphan partial surfaces as a partial assistant turn, in place", () => {
	const log = openChatLog("orphan");
	log.append({ type: "turn", seq: 0, turn: turn({}) });
	log.append({ type: "partial", seq: 1, text: "half a rep", at: "2026-08-17T00:00:02.000Z" });
	log.close();
	expect(readConversation("orphan").turns[1]).toEqual({
		role: "assistant",
		content: "half a rep",
		at: "2026-08-17T00:00:02.000Z",
		partial: true,
	});
});

it("drops a torn final line instead of failing the whole read", () => {
	const log = openChatLog("torn");
	log.append({ type: "turn", seq: 0, turn: turn({}) });
	log.close();
	appendFileSync(join(chatsDir(), "torn.jsonl"), '{"type":"turn","seq":1');
	expect(readConversation("torn").turns).toHaveLength(1);
	expect(nextSeq("torn")).toBe(1);
});

it("err turns round-trip with their flag", () => {
	const log = openChatLog("err");
	log.append({
		type: "turn",
		seq: 0,
		turn: turn({ role: "assistant", content: "claude not found on PATH", err: true }),
	});
	log.close();
	expect(readConversation("err").turns[0]).toMatchObject({ err: true });
});

it("latestConversationId picks the lexicographic max, null when empty", () => {
	rmSync(chatsDir(), { recursive: true, force: true });
	expect(latestConversationId()).toBeNull();
	openChatLog("2026-02-02T00-00-00-000Z-bbbbbbbb").close();
	openChatLog("2026-01-01T00-00-00-000Z-aaaaaaaa").close();
	expect(latestConversationId()).toBe("2026-02-02T00-00-00-000Z-bbbbbbbb");
});
