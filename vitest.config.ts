import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
		testTimeout: 20_000,
		// Many tests spawn git/bash subprocesses; unbounded worker parallelism
		// starves their timing on wide machines. Cap contention, keep assertions.
		maxWorkers: 4,
	},
});
