/**
 * Tool-window splitters: the geometry all three rails share.
 *
 * flusk shipped one draggable rail (chat) and hard-coded the other two, so the
 * Find results pane was stuck at about nine rows and the project tree at
 * 268px. IntelliJ drags every splitter; these pin that all three do, and that
 * each remembers where it was left.
 */
import { expect, it } from "vitest";
import { CLIENT_CHAT_JS } from "../src/ui/client-chat.js";
import { CLIENT_GRIPS_JS } from "../src/ui/client-grips.js";
import { CHROME_CSS } from "../src/ui/styles-chrome.js";

it("lets the panel be dragged and remembers the width, down to 300px", () => {
	expect(CLIENT_CHAT_JS).toContain('var CHAT_W_KEY = "flusk-chat-width"');
	expect(CLIENT_CHAT_JS).toContain("var CHAT_MIN_W = 300");
	// The drag and the persistence are the shared tool-window splitter now —
	// the chat rail is one of three, not the only one (see client-grips.ts).
	expect(CLIENT_CHAT_JS).toContain('twSize("--tw-right", CHAT_W_KEY, px, CHAT_MIN_W, 760)');
	expect(CLIENT_CHAT_JS).toContain('twRestore("--tw-right", CHAT_W_KEY');
	expect(CLIENT_CHAT_JS).toContain('twGrip(panel, "chat-grip"');
	expect(CLIENT_GRIPS_JS).toContain("localStorage.setItem(key, String(v))");
	expect(CLIENT_GRIPS_JS).toContain("document.documentElement.style.setProperty(name, v");
	expect(CHROME_CSS).toContain("#chat-grip");
	expect(CHROME_CSS).toContain("cursor: col-resize");
});

it("makes the other two tool windows draggable too, and remembers them", () => {
	expect(CLIENT_GRIPS_JS).toContain('twSize("--tw-left", SIDE_W_KEY');
	expect(CLIENT_GRIPS_JS).toContain('twSize("--tw-bottom", FIND_H_KEY');
	expect(CLIENT_GRIPS_JS).toContain(
		'var SIDE_W_KEY = "flusk-side-width", FIND_H_KEY = "flusk-find-height"',
	);
	expect(CHROME_CSS).toContain("#side-grip");
	expect(CHROME_CSS).toContain("cursor: row-resize");
});
