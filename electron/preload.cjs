/**
 * The only bridge. The renderer needs almost nothing from Node — the engine
 * is on the other side of HTTP — so the exposed surface is three calls, all
 * fire-and-forget conveniences, none returning handles.
 */
const { contextBridge, shell } = require("electron");

contextBridge.exposeInMainWorld("flusk", {
	platform: process.platform,
	openExternal: (url) => {
		if (typeof url === "string" && /^https?:\/\//.test(url)) void shell.openExternal(url);
	},
	revealInFinder: (path) => {
		if (typeof path === "string" && path.startsWith("/")) shell.showItemInFolder(path);
	},
});
