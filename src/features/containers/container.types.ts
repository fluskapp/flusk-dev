/**
 * The container feature's contract. A container is process/OS isolation FOR A
 * RUN — the git branch stays, the classifier stays; what changes is where the
 * bash tool's commands execute.
 */

/** How one shell command becomes a process: argv for the host spawn. */
export interface CommandRoute {
	argv0: string;
	argv: string[];
}

/** Maps (command, cwd) to a spawnable route. The default is /bin/sh -c. */
export type CommandRouter = (command: string, cwd: string) => CommandRoute;

export interface ContainerConfig {
	/**
	 * Docker context to run against. Local engine when absent; an ssh:// or
	 * cloud context makes the SAME commands run remotely — that is the whole
	 * local/cloud story, and why there is no separate cloud code path.
	 */
	context?: string;
	/** Image when the repo has no devcontainer.json. */
	image: string;
}

export interface ContainerStatus {
	name: string;
	running: boolean;
	image?: string;
	context?: string;
}

/** What devcontainer.json contributes; only image-based files are honored. */
export interface DevcontainerSpec {
	image?: string;
	workspaceFolder?: string;
	/** Present when the file exists but names a build (Dockerfile/compose). */
	unsupported?: string;
}
