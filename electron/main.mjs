/**
 * The desktop app: lifecycle, single instance, the one-shot home migration,
 * prewarm, and the loopback server the window talks to.
 *
 * The renderer is hardened to uselessness as an attack surface: context
 * isolation on, sandbox on, no Node, navigation pinned to the loopback
 * origin, window.open denied. Everything reaches the engine through server
 * functions over HTTP — the same trust boundary the browser dashboard had,
 * plus a per-launch nonce so no OTHER local program can drive the port even
 * if it guesses it.
 */
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, session, shell } from "electron";
import { startAppServer } from "./server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NONCE = randomBytes(16).toString("hex");

/** dist-app sits beside electron/ in the repo and inside resources when packaged. */
const appDir = () => (app.isPackaged ? join(process.resourcesPath, "dist-app") : join(here, "..", "dist-app"));
const engineDir = () => (app.isPackaged ? join(process.resourcesPath, "dist") : join(here, "..", "dist"));

let serverP;

async function startServer() {
	// Packaged: the prebuilt native binaries live under resources/native.
	if (app.isPackaged) process.env.FLUSK_NATIVE_DIR = join(process.resourcesPath, "native");
	// The one-shot ~/.ah -> ~/.flusk migration, before anything reads state.
	const { migrateHome, describeMigration } = await import(join(engineDir(), "platform/paths/migrate.js"));
	for (const line of describeMigration(migrateHome())) console.log(`flusk: ${line}`);
	const handler = (await import(join(appDir(), "server", "server.js"))).default;
	// Teardown reuses the engine's own registries: abort live chats first
	// (their CLI children are detached), then the doc/LSP registries.
	const { liveChats } = await import(join(engineDir(), "features/chat/chat.router.js"));
	const { disposeDocRegistries } = await import(join(engineDir(), "features/docs/doc.router.js"));
	return startAppServer({
		handler,
		clientDir: join(appDir(), "client"),
		nonce: NONCE,
		onClose: () => {
			for (const chat of [...liveChats]) chat.abort();
			liveChats.clear();
			disposeDocRegistries();
		},
	});
}

async function createWindow() {
	const srv = await serverP;
	const win = new BrowserWindow({
		width: 1440,
		height: 900,
		show: false,
		backgroundColor: "#1e1f22",
		// Own the chrome, the JetBrains way: no stock (theme-mismatched) macOS
		// title bar — the traffic lights float over the app's own toolbar
		// (--ij-toolbar-h is 34px, so x/y 10 centers them on it). The toolbar
		// is the drag region (chrome.css) and insets past the lights.
		titleBarStyle: "hiddenInset",
		trafficLightPosition: { x: 10, y: 10 },
		webPreferences: {
			contextIsolation: true,
			sandbox: true,
			nodeIntegration: false,
			preload: join(here, "preload.cjs"),
		},
	});
	// Every renderer request carries the launch nonce; the server refuses
	// anything without it, so another local browser cannot drive the port.
	win.webContents.session.webRequest.onBeforeSendHeaders(
		{ urls: [`${srv.url}/*`] },
		(details, cb) => {
			details.requestHeaders["x-flusk-nonce"] = NONCE;
			cb({ requestHeaders: details.requestHeaders });
		},
	);
	// Navigation stays on the loopback origin; everything else opens outside.
	win.webContents.on("will-navigate", (e, url) => {
		if (!url.startsWith(srv.url)) {
			e.preventDefault();
			void shell.openExternal(url);
		}
	});
	win.webContents.setWindowOpenHandler(({ url }) => {
		void shell.openExternal(url);
		return { action: "deny" };
	});
	win.once("ready-to-show", () => win.show());
	await win.loadURL(srv.url);
	return win;
}

const got = app.requestSingleInstanceLock();
if (!got) {
	app.quit();
} else {
	// Prewarm while Chromium boots: the server (and with it the Nitro handler
	// and the history index) is ready before the first paint needs it.
	serverP = undefined;
	app.on("second-instance", () => {
		const [win] = BrowserWindow.getAllWindows();
		if (win) {
			if (win.isMinimized()) win.restore();
			win.focus();
		}
	});
	app.whenReady().then(() => {
		serverP = startServer();
		void createWindow();
		app.on("activate", () => {
			if (BrowserWindow.getAllWindows().length === 0) void createWindow();
		});
	});
	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") app.quit();
	});
	app.on("before-quit", async (e) => {
		if (serverP === undefined) return;
		e.preventDefault();
		const srv = await serverP;
		serverP = undefined;
		// The close aborts detached children (chats, LSP) before the process
		// dies — the teardown that stops a killed window from still billing.
		await srv.close();
		app.quit();
	});
}
