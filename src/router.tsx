/**
 * The TanStack Start router. One instance per request on the server, one for
 * the life of the tab on the client; everything interesting lives in the
 * route files under src/routes/.
 */
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.js";

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
	});
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
