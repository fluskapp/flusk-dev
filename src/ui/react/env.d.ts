/** Vite asset imports the engine's tsc never sees (excluded from build). */
declare module "*.css?url" {
	const href: string;
	export default href;
}
declare module "*.css" {
	const css: string;
	export default css;
}
