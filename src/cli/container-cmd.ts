/**
 * `flusk container <up|status|down>` — the repo's container, managed by name.
 * `up` resolves the image the way a run would (devcontainer.json wins over
 * containers.image), so what you inspect is exactly what `run --container`
 * will execute in. All verbs honor containers.context: point it at an ssh://
 * or cloud context and these same commands manage the remote engine.
 */
import { loadConfig } from "../platform/config/config.js";
import { containerSettings, resolveImage, startContainerRuntime } from "../features/containers/runtime.js";
import { containerDown, containerStatus } from "../features/containers/docker.repository.js";

export interface ContainerCmdOpts {
	repo: string;
	out?: NodeJS.WritableStream;
}

export async function containerCmd(sub: string | undefined, opts: ContainerCmdOpts): Promise<number> {
	const out = opts.out ?? process.stdout;
	const cfg = loadConfig(opts.repo);
	try {
		if (sub === "up") {
			const rt = startContainerRuntime(opts.repo, cfg);
			out.write(
				`up: ${rt.status.name} · ${rt.image} (${rt.imageSource})` +
					`${rt.status.context !== undefined ? ` · context ${rt.status.context}` : ""}\n`,
			);
			return 0;
		}
		if (sub === "status") {
			const s = containerStatus(opts.repo, containerSettings(cfg));
			const image = resolveImage(opts.repo, cfg);
			out.write(
				`${s.name}: ${s.running ? `running · ${s.image ?? "?"}` : "not running"}` +
					` · would use ${image.image} (${image.source})` +
					`${s.context !== undefined ? ` · context ${s.context}` : ""}\n`,
			);
			return 0;
		}
		if (sub === "down") {
			const ok = containerDown(opts.repo, containerSettings(cfg));
			out.write(ok ? "down\n" : "nothing to remove\n");
			return 0;
		}
	} catch (e) {
		out.write(`flusk: ${e instanceof Error ? e.message : String(e)}\n`);
		return 1;
	}
	out.write("flusk: container takes up, status or down\n");
	return 1;
}
