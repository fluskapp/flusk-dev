/**
 * "Is this host somewhere a pasted URL is allowed to reach?" — asked of a
 * hostname before connecting and of every resolved address after DNS.
 *
 * The dashboard listens on loopback and the machine running it sits inside
 * whatever network the user's laptop is on. Without this test, a URL typed
 * into the web panel is a port scanner for 127.0.0.1, 10/8 and the cloud
 * metadata address — reached from inside the trust boundary, with the answer
 * rendered back on screen. Refusals name the range so the sentence on screen
 * is actionable rather than "failed".
 */
import { loopbackAllowed } from "./limits.js";

/** Names that are loopback by definition, whatever DNS says today. */
const LOCAL_NAMES = new Set(["localhost", "localhost.localdomain", "ip6-localhost"]);

function ipv4Reason(host: string): string | null {
	const parts = host.split(".").map(Number);
	if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
		return null;
	}
	const [a = 0, b = 0] = parts;
	if (a === 127 || a === 0) return "loopback address";
	if (a === 10 || (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168)) {
		return "private network address";
	}
	// 169.254.169.254 is the cloud metadata service on every major provider.
	if (a === 169 && b === 254) return "link-local address";
	if (a >= 224) return "multicast or reserved address";
	return null;
}

function ipv6Reason(host: string): string | null {
	const h = host.replace(/^\[|\]$/g, "").toLowerCase();
	if (!h.includes(":")) return null;
	if (h === "::1" || h === "::") return "loopback address";
	if (/^f[cd]/.test(h)) return "unique-local address";
	if (h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb")) {
		return "link-local address";
	}
	// ::ffff:127.0.0.1 — an IPv4 loopback wearing an IPv6 hat.
	const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
	return mapped?.[1] !== undefined ? ipv4Reason(mapped[1]) : null;
}

/**
 * The refusal sentence for `host`, or null when it may be reached. `host` is
 * either a hostname from a URL or a literal address DNS returned — both are
 * checked, because a public name that resolves to 127.0.0.1 is the whole
 * point of DNS rebinding.
 */
export function blockedHost(host: string): string | null {
	const h = host.trim().toLowerCase().replace(/\.$/, "");
	if (h === "") return "empty host";
	const named = LOCAL_NAMES.has(h) || h.endsWith(".localhost");
	const reason = named ? "loopback address" : (ipv4Reason(h) ?? ipv6Reason(h));
	if (reason === null) return null;
	// The escape hatch opens loopback ONLY. Someone reading their own docs
	// server asked for 127.0.0.1; nobody asks for the metadata service.
	return reason === "loopback address" && loopbackAllowed() ? null : reason;
}
