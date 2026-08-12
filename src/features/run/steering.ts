import type { UserMsg } from "./run.types.js";

/**
 * FIFO of steering text the user typed while the agent runs. The loop drains
 * it at each turn boundary and injects the entries as UserMsgs.
 */
export class SteeringQueue {
	#queue: string[] = [];

	push(text: string): void {
		this.#queue.push(text);
	}

	drain(): UserMsg[] {
		const msgs = this.#queue.map((content): UserMsg => ({ role: "user", content }));
		this.#queue.length = 0;
		return msgs;
	}
}
