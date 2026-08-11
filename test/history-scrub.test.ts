import { describe, expect, it } from "vitest";
import { redact } from "../src/history/scrub.js";

const AWS = "AKIAIOSFODNN7EXAMPLE";
const GH = "ghp_16C7e42F292c6912E7710c838347Ae178B4a";
const PAT = "github_pat_11ABCDEFG0aBcDeFgHiJkL_MnOpQrStUvWxYz0123456789AbCdEf";
const OPENAI = "sk-proj-Tf9aZq2LmN4pR7sV1xY6wB3cD5eG8hJ0kL2mN4pQ";
const ANTHROPIC = "sk-ant-api03-Tf9aZq2LmN4pR7sV1xY6wB3cD5eG8hJ0kL2mN4pQ";
const SHA = "9c1e5a3b7d2f4086ab19ce7f0d3a5b8c62e4f109";
const SHA256 = "3b1af0e9c27d54806fa1be3c9d07e5f28a4b6c19d05e73f2ab8c4d6e19f70a25";
const INTEGRITY = "sha512-Xk9pLmQ2rTvW4yZ1aB3cD5eF7gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6aB8cD0eF";

describe("scrub: secret shapes", () => {
	it("redacts each credential kind with a marker naming it", () => {
		expect(redact(`aws ${AWS} rotated`)).toBe("aws [redacted: aws key] rotated");
		expect(redact(`token ${GH}`)).toBe("token [redacted: github token]");
		expect(redact(`token ${PAT}`)).toBe("token [redacted: github token]");
		expect(redact(`key ${OPENAI}`)).toBe("key [redacted: openai key]");
		expect(redact(`key ${ANTHROPIC}`)).toBe("key [redacted: anthropic key]");
		expect(redact("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc")).toBe(
			"Authorization: Bearer [redacted: bearer token]",
		);
	});

	it("keeps the key name but drops the value of an assignment", () => {
		expect(redact("password=hunter2 was committed")).toBe(
			"password=[redacted: password] was committed",
		);
		expect(redact('api_key = "abc-123-def"')).toBe("api_key=[redacted: api key]");
		expect(redact("auth_token: zz9plural")).toBe("auth_token=[redacted: token]");
		// The key survives so the card is still findable by searching "password".
		expect(redact("password=hunter2")).toContain("password");
	});

	/**
	 * Regression: the rule was anchored with `\b`, which cannot match between
	 * `_` and a letter, so every PREFIXED env-var key escaped — the dominant
	 * real-world shape. Quoted keys (JSON/YAML/compose) escaped for the same
	 * reason, a `"` sitting between the key and its separator.
	 */
	it("redacts a prefixed or quoted credential key, not only a bare one", () => {
		expect(redact("DB_PASSWORD=hunter2hunter2")).toBe("DB_PASSWORD=[redacted: password]");
		expect(redact("OPENAI_API_KEY=abcdefghijklmnopqrstuvwx")).toBe(
			"OPENAI_API_KEY=[redacted: api key]",
		);
		expect(redact("AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")).toBe(
			"AWS_SECRET_ACCESS_KEY=[redacted: api key]",
		);
		expect(redact("export MY_SECRET=topsecretvalue123")).toBe(
			"export MY_SECRET=[redacted: secret]",
		);
		expect(redact('{"password": "hunter2"}')).not.toContain("hunter2");
		expect(redact('  "client_secret": "abc123def456"')).toContain("[redacted: secret]");
	});

	it("redacts credentials in a URL, keeping the host that identifies it", () => {
		expect(redact("postgres://admin:pw@db:5432/prod")).toBe(
			"postgres://[redacted: url credentials]@db:5432/prod",
		);
		expect(redact("git clone https://user:ghp_tok@github.com/a/b.git")).toBe(
			"git clone https://[redacted: url credentials]@github.com/a/b.git",
		);
		expect(redact("mongodb+srv://svc:pw@cluster/db")).toContain("[redacted: url credentials]");
	});

	it("redacts the underscore and webhook provider families too", () => {
		expect(redact("sk_live_51H8xkLJ2eZvKYlo2C0abcdEFghIJ")).toBe("[redacted: api key]");
		expect(redact("npm_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789")).toBe("[redacted: api key]");
		expect(redact("xoxb-123456789012-abcdefghijkl")).toBe("[redacted: api key]");
		expect(redact("https://hooks.slack.com/services/T0/B0/XXXXXXXXXXXXXXXXXXXXXXXX")).toBe(
			"https://[redacted: webhook url]",
		);
	});

	it("removes a whole PEM block, not just its header", () => {
		const pem = `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA1\nq3r5t7u9\n-----END RSA PRIVATE KEY-----`;
		const out = redact(`before\n${pem}\nafter`);
		expect(out).toBe("before\n[redacted: private key]\nafter");
		expect(out).not.toContain("MIIEowIBAAKCAQEA1");
	});

	it("redacts unexplained high-entropy runs of 32+ chars", () => {
		expect(redact("blob Aa1Bb2Cc3Dd4Ee5Ff6Gg7Hh8Ii9Jj0Kk1Ll2Mm3")).toBe("blob [redacted: secret]");
		expect(redact(`md5 ${"d41d8cd98f00b204e9800998ecf8427e"}`)).toBe("md5 [redacted: hash]");
	});
});

describe("scrub: false positives", () => {
	/**
	 * We err toward over-redaction everywhere EXCEPT two public digest shapes,
	 * because both are identifiers a reader needs verbatim.
	 */
	it("leaves a git sha (40 and 64 hex) exactly as it was", () => {
		expect(redact(`This reverts commit ${SHA}.`)).toBe(`This reverts commit ${SHA}.`);
		expect(redact(SHA256)).toBe(SHA256);
		expect(redact(`fix in ${SHA} and ${SHA.slice(0, 8)}`)).toContain(SHA);
	});

	it("leaves a lockfile integrity digest recognisable", () => {
		const line = `  "integrity": "${INTEGRITY}",`;
		expect(redact(line)).toBe(line);
	});

	it("leaves ordinary prose, code and long identifiers alone", () => {
		const prose = "fix(auth): the session cookie was not cleared on logout (#421)";
		expect(redact(prose)).toBe(prose);
		const ident = "export const aVeryLongCamelCaseIdentifier2NameForTesting = 1;";
		expect(redact(ident)).toBe(ident);
	});

	/**
	 * The credential key must END at the keyword. "tokens" and "tokenizer" are
	 * words this corpus is genuinely about; redacting `max_tokens=4096` would
	 * cost the index the whole budget/compaction story to catch nothing.
	 */
	it("does not mistake a word that merely contains a keyword for a key", () => {
		const code = "max_tokens=4096, tokenizer: fast, tokens: 12, key={item.id}";
		expect(redact(code)).toBe(code);
		expect(redact("const secretSauce = 1")).toBe("const secretSauce = 1");
	});

	/**
	 * Regression from the real corpus: with "/" in the entropy charset this
	 * rule ate the path list of 679 of 793 linof-base commits. Paths are the
	 * highest-value field on a commit card — they must survive verbatim.
	 */
	it("leaves file paths intact, including long mixed-case ones with digits", () => {
		const paths = [
			"base44/functions/handleUserThing.ts",
			"src/components/settings/AccountSecurityPanelContainer.tsx",
			"packages/prime-agent-runtime/src/Base44EntityScheduler2Factory.ts",
			"docs/runs/2026-08-10-linof-harness-run.md",
		].join("\n");
		expect(redact(paths)).toBe(paths);
	});

	it("is idempotent and cheap over a large body", () => {
		const once = redact(`a ${GH} b ${SHA} c password=x`);
		expect(redact(once)).toBe(once);
		const big = `${prosePad()}\n${GH}\n`.repeat(200);
		const started = Date.now();
		const out = redact(big);
		expect(out).not.toContain(GH);
		expect(Date.now() - started).toBeLessThan(1000);
	});
});

function prosePad(): string {
	return "refactor(ui): split the panel into a container and a presenter ".repeat(8);
}
