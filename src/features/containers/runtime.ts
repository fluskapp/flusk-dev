/**
 * The seam a run opts into: resolve where commands should execute for this
 * repo — devcontainer image first (the repo's own statement), the configured
 * image otherwise — ensure the container, and hand back the CommandRouter
 * the bash tool spawns through. Pure orchestration over the repositories.
 */
import type { FluskConfig } from "../../platform/config/types.js";
import type { CommandRouter, ContainerConfig, ContainerStatus } from "./container.types.js";
import { readDevcontainer } from "./devcontainer.repository.js";
import { containerUp, execRoute, type DockerExec, realDocker } from "./docker.repository.js";

export interface ContainerRuntime {
	router: CommandRouter;
	status: ContainerStatus;
	/** Where the image came from: the reviewer's first question. */
	imageSource: "devcontainer" | "config";
	image: string;
}

export function containerSettings(cfg: FluskConfig): ContainerConfig {
	return {
		image: cfg.containers.image,
		...(cfg.containers.context !== undefined && cfg.containers.context !== ""
			? { context: cfg.containers.context }
			: {}),
	};
}

/** Throws with the exact fix when the devcontainer names what we cannot build. */
export function resolveImage(repoRoot: string, cfg: FluskConfig): { image: string; source: "devcontainer" | "config" } {
	const dev = readDevcontainer(repoRoot);
	if (dev === null) return { image: cfg.containers.image, source: "config" };
	if (dev.image !== undefined) return { image: dev.image, source: "devcontainer" };
	throw new Error(`${dev.unsupported}; set containers.image in config or add "image" to devcontainer.json`);
}

export function startContainerRuntime(
	repoRoot: string,
	cfg: FluskConfig,
	docker: DockerExec = realDocker,
): ContainerRuntime {
	const settings = containerSettings(cfg);
	const { image, source } = resolveImage(repoRoot, cfg);
	const status = containerUp(repoRoot, settings, image, docker);
	return { router: execRoute(repoRoot, settings), status, image, imageSource: source };
}
