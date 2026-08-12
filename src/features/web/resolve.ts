/**
 * The second half of the host check: what the name RESOLVES to.
 *
 * blockedHost() reads the literal in the URL, which stops
 * http://127.0.0.1:8080 and http://10.0.0.5 — but not evil.example whose A
 * record is 127.0.0.1. Every hop resolves its host here first, so a public
 * name pointing inside the machine is refused before the connection.
 *
 * The residual gap is honest and worth stating: this resolves, then fetch()
 * resolves again, and a record with a one-second TTL can change between the
 * two (DNS rebinding). Closing that needs a connection-time hook Node's fetch
 * does not expose; what this buys is that the common case — a name that
 * simply points at loopback or a private range — never connects at all.
 */
import { lookup } from "node:dns/promises";
import { blockedHost } from "./address.js";

export async function resolvedBlock(hostname: string): Promise<string | null> {
	let addrs: Array<{ address: string }>;
	try {
		addrs = await lookup(hostname, { all: true });
	} catch {
		// A name that does not resolve is not a policy refusal: let the fetch
		// fail so the panel prints the transport's own message (ENOTFOUND).
		return null;
	}
	for (const { address } of addrs) {
		const reason = blockedHost(address);
		if (reason !== null) return `${hostname} resolves to ${address}: ${reason}`;
	}
	return null;
}
