/** Keyboard gestures, toasts, help overlay — ah's muscle memory, ported. */
export const CLIENT_KEYS_JS = `
function toast(msg) {
	var t = $("#toast");
	t.textContent = msg;
	t.hidden = false;
	clearTimeout(window.__toastT);
	window.__toastT = setTimeout(function () { t.hidden = true; }, 1800);
}

async function copyText(text, label) {
	try { await navigator.clipboard.writeText(text); toast(label || "Copied"); }
	catch (e) { toast("Copy failed"); }
}

function visibleKeys() {
	return Array.prototype.map.call(document.querySelectorAll("#list .row"),
		function (el) { return el.getAttribute("data-k"); });
}

function moveSel(delta) {
	var keys = visibleKeys();
	if (!keys.length) return;
	var i = keys.indexOf(current);
	var next = Math.max(0, Math.min(keys.length - 1, i < 0 ? 0 : i + delta));
	if (keys[next] !== current) select(keys[next]);
	var el = document.querySelector('#list .row[data-k="' + CSS.escape(keys[next]) + '"]');
	if (el) el.scrollIntoView({ block: "nearest" });
}

document.addEventListener("keydown", function (e) {
	if (e.metaKey || e.ctrlKey || e.altKey) return;
	var search = $("#search");
	var typing = document.activeElement === search;

	if (e.key === "Escape") {
		var help = $("#help");
		if (!help.hidden) { help.hidden = true; return; }
		if (search.value) {
			search.value = ""; query = ""; renderList(lastList); toast("Search cleared");
		}
		if (typing) search.blur();
		return;
	}
	if (typing) {
		if (e.key === "Enter") {
			e.preventDefault();
			search.blur();
			var ks = visibleKeys();
			if (ks.length) select(ks[0]);
		}
		return;
	}
	if (e.key === "/") { e.preventDefault(); search.focus(); search.select(); return; }
	if (e.key === "?") { $("#help").hidden = false; return; }
	if (e.key === "t") { toggleTheme(); return; }
	if (e.key === "b") { toggleBrain(); return; }
	if (e.key === "n") { toggleRuns(); return; }
	if (e.key === "r") { loadList(true); toast("Refreshed"); return; }
	if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); moveSel(1); }
	else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); moveSel(-1); }
});

$("#search").addEventListener("input", function () {
	query = this.value.toLowerCase();
	renderList(lastList);
});
$("#help").addEventListener("click", function () { this.hidden = true; });
$("#help-btn").addEventListener("click", function () { $("#help").hidden = false; });
`;
