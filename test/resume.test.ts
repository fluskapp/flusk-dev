import { expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import type { Msg, ToolResultMsg } from "../src/core/types.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import { repairDanglingToolCalls } from "../src/session/repair.js";
import { Session } from "../src/session/session.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

const INTERRUPTED = "[interrupted — no result recorded]";

test("repair: returns the input untouched when nothing dangles", () => {
	const empty: Msg[] = [];
	expect(repairDanglingToolCalls(empty)).toBe(empty);
	const textOnly: Msg[] = [{ role: "user", content: "hi" }, assistantText("done")];
	expect(repairDanglingToolCalls(textOnly)).toBe(textOnly);
	const answered: Msg[] = [
		assistantToolCalls([{ id: "a", name: "bash", args: {} }]),
		{ role: "toolResult", callId: "a", name: "bash", output: "ok", isError: false },
	];
	expect(repairDanglingToolCalls(answered)).toBe(answered);
});

test("repair: synthesizes isError results for unanswered calls only", () => {
	const msgs: Msg[] = [
		{ role: "user", content: "go" },
		assistantToolCalls([
			{ id: "c1", name: "bash", args: { command: "ls" } },
			{ id: "c2", name: "read", args: { file_path: "x" } },
		]),
		{ role: "toolResult", callId: "c1", name: "bash", output: "ok", isError: false },
	];
	const repaired = repairDanglingToolCalls(msgs);
	expect(msgs).toHaveLength(3); // pure: input not mutated
	expect(repaired).toHaveLength(4);
	expect(repaired[3]).toEqual({
		role: "toolResult",
		callId: "c2",
		name: "read",
		output: INTERRUPTED,
		isError: true,
	});
});

test("repair: ignores dangling calls on a non-final assistant message", () => {
	const msgs: Msg[] = [
		assistantToolCalls([{ id: "old", name: "bash", args: {} }]),
		{ role: "toolResult", callId: "old", name: "bash", output: "ok", isError: false },
		assistantText("wrapped up"),
	];
	expect(repairDanglingToolCalls(msgs)).toBe(msgs);
});

test("resume: repairs dangling calls, persists them, steers, and continues", async () => {
	const repo = await setupTestHome("ah-resume-");
	try {
		// A session that died mid-dispatch: dangling toolCall, no stats entry.
		const dead = Session.create({ task: "fix bug", repoRoot: repo, model: fakeModel });
		dead.appendMessage({ role: "user", content: "fix bug" });
		dead.appendMessage(
			assistantToolCalls([{ id: "d1", name: "bash", args: { command: "echo x" } }]),
		);
		const sessionPath = dead.path;
		dead.close();

		const provider = new FakeProvider([{ message: assistantText("resumed and finished") }]);
		const agent = createAgent({
			provider,
			model: fakeModel,
			tools: [],
			task: "fix bug",
			repoRoot: repo,
			sessionPath,
			steer: "skip that command and just summarize",
		});
		expect(agent.session.path).toBe(sessionPath);
		const { reason } = await agent.run();
		expect(reason).toBe("completed");

		// The synthetic result was persisted before the steer and continuation.
		const context = agent.session.buildContext();
		expect(context).toHaveLength(5);
		expect(context[2]).toEqual<ToolResultMsg>({
			role: "toolResult",
			callId: "d1",
			name: "bash",
			output: INTERRUPTED,
			isError: true,
		});
		expect(context[3]).toEqual({ role: "user", content: "skip that command and just summarize" });
		expect(context[4]).toMatchObject({ role: "assistant" });

		// The provider saw the repaired context, and the file replays exactly.
		expect(provider.requests[0]?.messages).toEqual(context.slice(0, 4));
		expect(Session.load(sessionPath).buildContext()).toEqual(context);

		agent.session.close();
	} finally {
		teardownTestHome();
	}
});
