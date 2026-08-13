import { defineConfig } from "vite";

// flusk.dev: a static site built from the SAME design tokens as the product
// (scripts/gen-tokens.mjs writes ../src/ui/react/tokens.css, which index.html
// links relatively) — the site and the app cannot drift. Nothing dynamic:
// the app is Electron-only, so the site hosts words and downloads.
export default defineConfig({
	root: __dirname,
	build: { outDir: "../dist-site", emptyOutDir: true },
});
