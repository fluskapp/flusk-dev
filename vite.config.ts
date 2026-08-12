import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dashboard app. The engine stays a plain tsc build (tsconfig.build.json);
// this config owns only src/routes + src/ui/react. Nitro's node preset makes
// the output an embeddable request handler, which is what Electron mounts.
export default defineConfig({
	// The engine's tsc build owns dist/; the app builds beside it so neither
	// clobbers the other (vite empties its outDir on every build).
	build: { outDir: "dist-app" },
	plugins: [
		tanstackStart({
			srcDirectory: "src",
			// Phase 4 mounts the handler inside Electron; never self-listen.
			target: "node-server",
		}),
		viteReact(),
	],
});
