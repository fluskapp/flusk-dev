/**
 * Turning an AgentSpec plus a task into the ONE string a worker hands to a
 * model.
 *
 * A spec is a PROMPT, never code: this file only ever concatenates
 * `spec.prompt` into text destined for a model. Nothing here eval()s it,
 * imports it, or lets it reach a shell — a "cli" worker passes the result as
 * a single argv element, never inside a command line.
 *
 * The task is fenced and labelled rather than glued onto the instructions.
 * A project-scoped spec is authored by whatever repo was cloned, and the task
 * may quote issue text or a web page; keeping the two visibly separate is
 * what stops either from reading as a new instruction to the other.
 */
import type { AgentSpec } from "./types.js";

const TASK_OPEN = "<task>";
const TASK_CLOSE = "</task>";

export function delegationPrompt(spec: AgentSpec, task: string): string {
	const head = spec.prompt.trim();
	const body = `${TASK_OPEN}\n${fence(task)}\n${TASK_CLOSE}`;
	return `${head}\n\nThe delegated task is inside ${TASK_OPEN}. Do it, then report what you changed.\n\n${body}`;
}

/** A task that spells the closing tag cannot forge the end of its own block. */
function fence(task: string): string {
	return task.trim().split(TASK_CLOSE).join("<⁄task>");
}

/**
 * How a delegated agent's output re-enters a parent's context. The summary is
 * agent-authored text: it reports on work, it never redirects the caller, and
 * a consumer that pastes it raw into a prompt hands a subagent the parent's
 * instruction channel.
 */
export function labelResult(agentName: string, summary: string): string {
	const safe = summary.split("</subagent-result>").join("<⁄subagent-result>");
	return `<subagent-result agent="${agentName}">\n${safe}\n</subagent-result>`;
}
