/**
 * A raw HTTP client for the dashboard tests. `fetch` will not let a caller set
 * Host, and the whole point of these tests is to send the headers a hostile
 * page would — so they go over node:http directly.
 */
import { request } from "node:http";

export interface Reply {
	status: number;
	body: string;
	/** Lowercased response headers — the framing defences live here. */
	headers: Record<string, string>;
}

export interface Options {
	method?: string;
	headers?: Record<string, string>;
	body?: string;
}

export function call(base: string, path: string, opts: Options = {}): Promise<Reply> {
	const url = new URL(path, base);
	return new Promise((done, fail) => {
		const req = request(
			{
				hostname: "127.0.0.1",
				port: url.port,
				path: `${url.pathname}${url.search}`,
				method: opts.method ?? "GET",
				headers: opts.headers ?? {},
			},
			(res) => {
				let text = "";
				res.setEncoding("utf8");
				res.on("data", (c: string) => {
					text += c;
				});
				const headers: Record<string, string> = {};
				for (const [k, v] of Object.entries(res.headers)) {
					headers[k] = Array.isArray(v) ? v.join(", ") : (v ?? "");
				}
				res.on("end", () => done({ status: res.statusCode ?? 0, body: text, headers }));
			},
		);
		req.on("error", fail);
		if (opts.body !== undefined) req.write(opts.body);
		req.end();
	});
}

/** POST a JSON body; the server never inspects content-type, but be honest. */
export function post(
	base: string,
	path: string,
	body: unknown,
	headers: Record<string, string> = {},
): Promise<Reply> {
	return call(base, path, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

/** The `data:` payloads of an SSE response body, parsed. */
export function sseChunks(body: string): unknown[] {
	return body
		.split("\n")
		.filter((l) => l.startsWith("data: "))
		.map((l) => JSON.parse(l.slice(6)) as unknown);
}
