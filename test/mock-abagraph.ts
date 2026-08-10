/**
 * Mock abagraph server (node:http, port 0, 127.0.0.1 only) with the REAL
 * route semantics — handlers live in mock-abagraph-routes.ts and cite the
 * abagraph source they mirror. All requests run as admin (server/auth.rs:
 * no tokens configured → every request is admin), so reads return ALL
 * tenants and write bodies carry their own tenant — exactly the environment
 * hit's MemoryClient wrapper must handle.
 */
import { createServer } from "node:http";
import {
	contextPack,
	fail,
	json,
	listFacts,
	readBody,
	search,
	transact,
	verify,
} from "./mock-abagraph-routes.js";
import { type MockFact, Store } from "./mock-abagraph-state.js";

export interface MockAbagraph {
	url: string;
	close(): Promise<void>;
	/** Every stored fact (any status) belonging to namespace `ns`. */
	dump(ns: string): MockFact[];
}

export interface MockOptions {
	/**
	 * Reproduce the real server's ACTUAL admin write path instead of its
	 * documented intent: dto/parse.rs `parse_fact_input` hardcodes
	 * `tenant: None` and routes/transact.rs `scoped` returns admin asserts
	 * unchanged, so an auth-free abagraph stores every fact untenanted.
	 * hit must stay namespace-correct under this — see wire.ts NS_PROP.
	 */
	dropTenantOnWrite?: boolean;
}

export async function startMockAbagraph(opts: MockOptions = {}): Promise<MockAbagraph> {
	const store = new Store();
	store.dropTenantOnWrite = opts.dropTenantOnWrite === true;
	const server = createServer(async (req, res) => {
		const url = new URL(req.url ?? "/", "http://127.0.0.1");
		const route = `${req.method} ${url.pathname}`;
		try {
			if (route === "GET /api/health") return json(res, 200, { ok: true }); // routes/entities.rs
			if (route === "POST /api/transact") return transact(store, await readBody(req), res);
			if (route === "GET /api/facts") return listFacts(store, url.searchParams, res);
			if (route === "POST /api/context") return contextPack(store, await readBody(req), res);
			if (url.pathname === "/api/search") {
				// routes/search.rs: GET ?q=/?question= or POST {question}
				const body = req.method === "POST" ? await readBody(req) : {};
				const q =
					url.searchParams.get("q") ??
					url.searchParams.get("question") ??
					(typeof body.question === "string" ? body.question : "");
				return search(store, q, res);
			}
			if (route === "POST /api/verify") return verify(store, await readBody(req), res);
			if (route === "POST /api/consolidate")
				return json(res, 200, { collapsed: 0, superseded: [], conflicts: 0 }); // no-op
			return fail(res, 404, "NotFound", `no route ${route}`);
		} catch (e) {
			return fail(res, 400, "SchemaInvalid", String(e));
		}
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const addr = server.address();
	const port = typeof addr === "object" && addr !== null ? addr.port : 0;
	return {
		url: `http://127.0.0.1:${port}`,
		close: () =>
			new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
		dump: (ns) =>
			store.facts.filter(
				(f) =>
					f.tenant === ns ||
					(typeof f.properties === "object" &&
						f.properties !== null &&
						(f.properties as Record<string, unknown>).hit_ns === ns),
			),
	};
}
