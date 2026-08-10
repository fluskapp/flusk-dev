/**
 * Regression: ah must stay namespace-correct against an auth-free abagraph.
 *
 * Such a server (no ABAGRAPH_TOKENS → every request is admin) stores facts
 * UNTENANTED: dto/parse.rs `parse_fact_input` hardcodes `tenant: None` and
 * routes/transact.rs `scoped` returns admin asserts unchanged. Namespacing
 * therefore cannot rely on the server's tenant field — it rides in
 * `properties` (wire.ts NS_PROP), which the parser passes through verbatim.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { createMemoryClient } from "../src/memory/client.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

const NS_A = "repo:alpha-1111";
const NS_B = "repo:beta-2222";

let mock: MockAbagraph;
let client: MemoryClient;

beforeAll(async () => {
	mock = await startMockAbagraph({ dropTenantOnWrite: true });
	client = createMemoryClient({ baseUrl: mock.url, apiKey: null });
	await client.transact(NS_A, [
		{ subject: "Repo:alpha", predicate: "convention", object: "tabs not spaces" },
	]);
	await client.transact(NS_B, [
		{ subject: "Repo:beta", predicate: "convention", object: "spaces not tabs" },
	]);
});

afterAll(async () => {
	await mock.close();
});

it("stores facts untenanted, exactly like the real admin write path", () => {
	const stored = mock.dump(NS_A);
	expect(stored).toHaveLength(1);
	expect(stored[0]?.tenant).toBeUndefined();
	expect((stored[0]?.properties as Record<string, unknown>).ah_ns).toBe(NS_A);
});

it("query isolates namespaces despite the dropped tenant", async () => {
	const a = await client.query(NS_A, { predicate: "convention" });
	expect(a.map((f) => f.object)).toEqual(["tabs not spaces"]);
	const b = await client.query(NS_B, { predicate: "convention" });
	expect(b.map((f) => f.object)).toEqual(["spaces not tabs"]);
});

it("contextPack still finds this namespace's facts and only those", async () => {
	const a = await client.contextPack(NS_A, { goal: "how do we format code" });
	expect(a.map((f) => f.object)).toEqual(["tabs not spaces"]);
	const b = await client.contextPack(NS_B, { goal: "how do we format code" });
	expect(b.map((f) => f.object)).toEqual(["spaces not tabs"]);
});

it("search isolates namespaces too", async () => {
	const a = await client.search(NS_A, "convention");
	expect(a.map((f) => f.object)).toEqual(["tabs not spaces"]);
});

it("supersession stays namespace-local", async () => {
	await client.transact(NS_A, [
		{ subject: "Repo:alpha", predicate: "convention", object: "tabs, width 4" },
	]);
	const a = await client.query(NS_A, { predicate: "convention" });
	expect(a.map((f) => f.object)).toEqual(["tabs, width 4"]);
	const b = await client.query(NS_B, { predicate: "convention" });
	expect(b.map((f) => f.object)).toEqual(["spaces not tabs"]);
});
