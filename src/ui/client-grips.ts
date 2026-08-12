/**
 * Tool-window splitters.
 *
 * In IntelliJ every tool window drags. flusk had exactly one — the chat rail —
 * and hard-coded the other two, so the Find results pane was stuck at nine
 * 22px rows and the project tree at 268px whatever you were reading. The
 * difference between skimming nine hits and skimming forty is a splitter.
 *
 * One helper, three grips: each writes a CSS variable the #app grid is built
 * from and remembers it, the way the chat width already did.
 */
export const CLIENT_GRIPS_JS = `
/** Clamp, apply to the grid, remember. Returns the value actually used. */
function twSize(name, key, px, min, max) {
	var v = Math.max(min, Math.min(max, Math.round(px) || 0));
	document.documentElement.style.setProperty(name, v + "px");
	try { localStorage.setItem(key, String(v)); } catch (e) { /* private mode */ }
	return v;
}

/** The reader's last choice, or nothing at all — never a silent default. */
function twRestore(name, key, min, max) {
	var saved = parseInt(localStorage.getItem(key) || "", 10);
	if (saved > 0) twSize(name, key, saved, min, max);
}

/**
 * A splitter on one edge of \`panel\`. \`measure\` turns a pointer event into
 * the new size; pointer capture keeps the drag alive over the whole window.
 */
function twGrip(panel, id, measure) {
	if (!panel) return null;
	var grip = document.createElement("div");
	grip.id = id;
	grip.className = "tw-grip";
	grip.title = "Drag to resize";
	panel.appendChild(grip);
	grip.addEventListener("pointerdown", function (e) {
		e.preventDefault();
		grip.setPointerCapture(e.pointerId);
		var move = function (ev) { measure(ev); };
		grip.addEventListener("pointermove", move);
		grip.addEventListener("pointerup", function () {
			grip.removeEventListener("pointermove", move);
		}, { once: true });
	});
	return grip;
}

var SIDE_W_KEY = "flusk-side-width", FIND_H_KEY = "flusk-find-height";

/** The left rail and the bottom rail, dragged the same way the chat rail is. */
function wireGrips() {
	twRestore("--tw-left", SIDE_W_KEY, 160, 620);
	twRestore("--tw-bottom", FIND_H_KEY, 120, 720);
	// On #app, not #side: #side scrolls, and a grip inside it scrolls away
	// from the border it is meant to sit on.
	twGrip($("#app"), "side-grip", function (ev) {
		twSize("--tw-left", SIDE_W_KEY, ev.clientX, 160, 620);
	});
	twGrip($("#find"), "find-grip", function (ev) {
		twSize("--tw-bottom", FIND_H_KEY, window.innerHeight - ev.clientY - 22, 120, 720);
	});
}
`;
