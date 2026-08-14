/**
 * The only file that talks to docker. Everything is the docker CLI — the
 * daemon API would be a dependency and a socket path per platform; the CLI is
 * what the user already authenticated, and `--context` is what makes the same
 * verbs run locally or against a cloud engine.
 *
 * The container is deliberately boring: the repo bind-mounted at ITS OWN
 * absolute path (so paths in tool output mean the same thing inside and out),
 * same workdir, `sleep infinity` as PID 1, one container per repo by name.
 * The command classifier runs before anything reaches here — a container
 * changes the blast radius of a command, never the decision to run it.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import type { CommandRoute, ContainerConfig, ContainerStatus } from "./container.types.js";

export type DockerExec = (args: string[]) => { status: number; stdout: string; stderr: string };

/** Injectable for tests; the default really spawns docker. */
export const realDocker: DockerExec = (args) => {
	const r = spawnSync("docker", args, { encoding: "utf8", timeout: 120_000 });
	if (r.error !== undefined) return { status: 127, stdout: "", stderr: String(r.error.message) };
	return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
};

const ctxArgs = (cfg: ContainerConfig): string[] =>
	cfg.context !== undefined ? ["--context", cfg.context] : [];

/** Stable per repo path: "flusk-<basename>-<sha8>". */
export function containerName(repoRoot: string): string {
	const hash = createHash("sha256").update(repoRoot).digest("hex").slice(0, 8);
	const slug = basename(repoRoot).toLowerCase().replace(/[^a-z0-9]+/g, "-");
	return `flusk-${slug}-${hash}`;
}

export function containerStatus(
	repoRoot: string,
	cfg: ContainerConfig,
	docker: DockerExec = realDocker,
): ContainerStatus {
	const name = containerName(repoRoot);
	const r = docker([...ctxArgs(cfg), "inspect", "--format", "{{.State.Running}}\t{{.Config.Image}}", name]);
	if (r.status !== 0) return { name, running: false, ...(cfg.context ? { context: cfg.context } : {}) };
	const [running, image] = r.stdout.trim().split("\t");
	return {
		name,
		running: running === "true",
		...(image !== undefined && image !== "" ? { image } : {}),
		...(cfg.context ? { context: cfg.context } : {}),
	};
}

/** Idempotent: an already-running container is the success case, not an error. */
export function containerUp(
	repoRoot: string,
	cfg: ContainerConfig,
	image: string,
	docker: DockerExec = realDocker,
): ContainerStatus {
	const current = containerStatus(repoRoot, cfg, docker);
	if (current.running) return current;
	const name = current.name;
	docker([...ctxArgs(cfg), "rm", "-f", name]); // a stopped remnant blocks the name
	const r = docker([
		...ctxArgs(cfg),
		"run", "-d", "--name", name,
		"-v", `${repoRoot}:${repoRoot}`,
		"-w", repoRoot,
		"--label", "dev.flusk.repo=" + repoRoot,
		image, "sleep", "infinity",
	]);
	if (r.status !== 0) throw new Error(`docker run failed: ${r.stderr.trim() || r.stdout.trim()}`);
	return containerStatus(repoRoot, cfg, docker);
}

export function containerDown(
	repoRoot: string,
	cfg: ContainerConfig,
	docker: DockerExec = realDocker,
): boolean {
	const r = docker([...ctxArgs(cfg), "rm", "-f", containerName(repoRoot)]);
	return r.status === 0;
}

/**
 * The route the bash tool spawns: `docker exec` with the command handed to
 * the container's own /bin/sh. `-w cwd` keeps the tool's cwd contract; -i
 * keeps stdin open so the host-side kill semantics match the local path.
 */
export function execRoute(repoRoot: string, cfg: ContainerConfig): (command: string, cwd: string) => CommandRoute {
	const name = containerName(repoRoot);
	return (command, cwd) => ({
		argv0: "docker",
		argv: [...ctxArgs(cfg), "exec", "-i", "-w", cwd, name, "/bin/sh", "-c", command],
	});
}
