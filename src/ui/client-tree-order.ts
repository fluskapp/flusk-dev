/**
 * How the project list is ordered before it is drawn.
 *
 * Thirteen equally-weighted rows, four of which were the same repository
 * checked out four times and eight of which had never run anything, is a list
 * you read rather than a list you scan. Ordering is its own concern from
 * rendering because it is the part with the rules.
 */
export const CLIENT_TREE_ORDER_JS = `
/** Anything worth looking at today: work in flight, or something asking. */
function isBusy(p) {
	return p.liveRuns > 0 || p.attention.length > 0 || p.runs > 0;
}

/**
 * Worktrees sort directly under the repo they belong to, and projects with
 * nothing in them sink below a divider.
 *
 * Thirteen equally-weighted rows, four of which were the same repo checked out
 * four times and eight of which had never run anything, is a list you read
 * instead of a list you scan.
 */
function orderProjects(list) {
	var busy = list.filter(isBusy);
	var quiet = list.filter(function (p) { return !isBusy(p); });
	var out = [];
	var placed = {};
	busy.concat(quiet).forEach(function (p) {
		if (placed[p.name] || p.worktreeOf) return;
		placed[p.name] = 1;
		out.push(p);
		list.forEach(function (w) {
			if (w.worktreeOf === p.name && !placed[w.name]) { placed[w.name] = 1; out.push(w); }
		});
	});
	// A worktree whose main repo is not itself indexed still has to appear.
	list.forEach(function (p) { if (!placed[p.name]) { placed[p.name] = 1; out.push(p); } });
	return out;
}
`;
