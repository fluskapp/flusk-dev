/**
 * Every limit the web reader imposes, in one place, each with the reason it
 * has the value it has. A magic number in the fetch loop is a limit nobody
 * can review: these exist so the next reader can argue with the number
 * instead of guessing what it was protecting.
 *
 * Nothing here is a preference. Each one is the difference between "the
 * workbench read a page" and "the workbench hung, filled the disk, or was
 * walked around a documentation site forever by a redirect chain".
 */

/**
 * Wall-clock budget for ONE page: connect, headers and body together. A
 * per-socket timeout is not enough — a server that dribbles one byte a second
 * never trips it, and the panel spins forever. 10s is long enough for a slow
 * docs host on a bad link and short enough that a human still believes the
 * panel is alive.
 */
export const FETCH_TIMEOUT_MS = 10_000;

/**
 * Hard cap on bytes read from a response, enforced while streaming rather
 * than after: Content-Length is a claim by the remote, and a body with no
 * length header (chunked) has no claim at all. 2MB is several times the
 * largest real documentation page; beyond it the thing on the other end is
 * not prose, and buffering it would put the dashboard's memory under a
 * stranger's control.
 */
export const MAX_RESPONSE_BYTES = 2_000_000;

/**
 * How many 3xx hops one read may follow. Redirects are legitimate (http→https,
 * /latest→/v2.3), but the chain must terminate whether or not the remote
 * cooperates: `fetch` is called with redirect "manual" so this counter — not
 * the runtime's own default — is what ends a cycle.
 */
export const MAX_REDIRECTS = 5;

/**
 * The only two schemes that may ever be fetched. file:// would turn a URL box
 * into an arbitrary-file reader, and data:/javascript:/ftp: are not pages.
 * The list is an allowlist because a denylist of schemes is a list you forget
 * to update.
 */
export const ALLOWED_PROTOCOLS: readonly string[] = ["http:", "https:"];

/**
 * Longest URL accepted. Browsers stop caring somewhere past 2000 characters,
 * and a megabyte "URL" pasted into the box is an attempt to make the parser,
 * the cache key or the log line the interesting part of the request.
 */
export const MAX_URL_LENGTH = 2048;

/**
 * Escape hatch for the loopback/private-range refusal below. It exists for
 * the tests (which serve their fixture on 127.0.0.1) and for someone reading
 * their own localhost docs server on purpose. It is OFF unless explicitly
 * set, because the default must not let a pasted URL probe ports on the
 * machine ah is running on.
 */
export const LOOPBACK_ENV = "AH_WEB_ALLOW_LOOPBACK";

export function loopbackAllowed(): boolean {
	return process.env[LOOPBACK_ENV] === "1";
}
