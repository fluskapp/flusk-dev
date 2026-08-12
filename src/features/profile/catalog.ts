/**
 * What a signal in a repository implies, as data.
 *
 * This is a CURATED STARTING POINT, not a registry. It lists things that are
 * known to exist and are widely used; it does not know what was published this
 * morning, and it will be wrong about a private setup. It is one plain table
 * so that disagreeing with it means editing a row rather than reading a
 * detector — which is the only reason it is a table at all.
 *
 * Two rules keep it honest:
 *
 *  - A row names the SIGNAL it needs. Nothing is suggested speculatively, so
 *    "you might like X" cannot appear; the reader always gets "because your
 *    package.json depends on pg".
 *  - Nothing here installs, downloads, or runs. A row produces a suggestion
 *    with text to paste and a place to paste it.
 *
 * MCP ids are the official @modelcontextprotocol/server-* packages. Where no
 * official server exists the row says what to do in prose instead of inventing
 * a package name, because a confidently wrong install command costs more than
 * no suggestion at all.
 */
import type { SuggestionKind } from "./types.js";

export interface CatalogRow {
	id: string;
	kind: SuggestionKind;
	title: string;
	rationale: string;
	/** Detected names (see detect.ts) that must ALL be present to fire. */
	needs: string[];
	/** npm package of the MCP server, when an official one exists. */
	pkg?: string;
}

export const CATALOG: CatalogRow[] = [
	{
		id: "mcp:postgres",
		kind: "mcp",
		title: "Postgres MCP server",
		rationale:
			"Lets the agent read your schema and run read-only queries, so it stops guessing " +
			"column names from the ORM models.",
		needs: ["postgres"],
		pkg: "@modelcontextprotocol/server-postgres",
	},
	{
		id: "mcp:sqlite",
		kind: "mcp",
		title: "SQLite MCP server",
		rationale: "Query the database the tests run against without shelling out to a CLI.",
		needs: ["sqlite"],
		pkg: "@modelcontextprotocol/server-sqlite",
	},
	{
		id: "mcp:github",
		kind: "mcp",
		title: "GitHub MCP server",
		rationale:
			"Issues, PRs and review comments as tools rather than as gh invocations parsed out of stdout.",
		needs: ["github"],
		pkg: "@modelcontextprotocol/server-github",
	},
	{
		id: "mcp:puppeteer",
		kind: "mcp",
		title: "Browser automation MCP server",
		rationale:
			"This repo already drives a browser in its tests; the same capability in the agent's " +
			"hands means it can reproduce a UI bug instead of reasoning about one.",
		needs: ["browser-testing"],
		pkg: "@modelcontextprotocol/server-puppeteer",
	},
	{
		id: "skill:verify",
		kind: "skill",
		title: "Write down what verification means here",
		rationale:
			"flusk found the commands but nothing states which of them must pass before work is " +
			"called done, so every run has to re-derive it.",
		needs: ["has-verify"],
	},
	{
		id: "skill:release",
		kind: "skill",
		title: "Capture the release procedure",
		rationale:
			"A release script exists, which means there is a sequence around it that currently " +
			"lives in someone's head.",
		needs: ["release-script"],
	},
	{
		id: "agent:test-writer",
		kind: "agent",
		title: "A test-writer agent pointed at this repo's runner",
		rationale:
			"A named agent that knows the runner and the conventions beats re-explaining them " +
			"in every task.",
		needs: ["test-runner"],
	},
	{
		id: "agent:migration",
		kind: "agent",
		title: "A schema-migration agent",
		rationale:
			"Migrations are the change most worth doing the same way twice; an agent spec is " +
			"where that sameness lives.",
		needs: ["migrations"],
	},
];
