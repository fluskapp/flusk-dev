/**
 * The one-shot move from `~/.ah` to `~/.flusk`.
 *
 * Two things changed names at the rename, and both are on disk:
 *
 * 1. The state root itself. A single `rename` is enough — everything under it
 *    (sessions, store, index, logs) is addressed relative to the root, so
 *    nothing inside needs rewriting.
 * 2. The harness ops fact log. Its filename is a slug plus a hash OF THE
 *    NAMESPACE STRING (`store/paths.ts`), and the namespace itself changed
 *    from "ah" to "flusk" — so the new name is not a substring edit of the old
 *    one and must be computed by the same function that names it normally.
 *
 * This runs once at startup and then does nothing for the rest of the
 * installation's life. There is deliberately NO dual-read fallback: a reader
 * that can find state in two places is a reader that will eventually write to
 * the wrong one. Either the move happened, or there was nothing to move.
 */
import { existsSync, renameSync } from "node:fs";
import { fluskHome, legacyHome } from "../../session/paths.js";
import { nsPath } from "../../store/paths.js";
import { FLUSK_NS } from "../../store/namespaces.js";
import { join } from "node:path";

/** The harness ops namespace before the rename; only this file may know it. */
const LEGACY_NS = "ah";

/** What the migration did, so the caller can say it out loud. */
export interface HomeMigration {
	/** Absent when nothing was moved — the overwhelmingly common case. */
	movedHome?: { from: string; to: string };
	movedFactLog?: { from: string; to: string };
}

/** True when this migration changed anything at all. */
export const didMigrate = (m: HomeMigration): boolean =>
	m.movedHome !== undefined || m.movedFactLog !== undefined;

/** Human-readable lines describing a migration; empty when it was a no-op. */
export function describeMigration(m: HomeMigration): string[] {
	const lines: string[] = [];
	if (m.movedHome) lines.push(`migrated state root: ${m.movedHome.from} -> ${m.movedHome.to}`);
	if (m.movedFactLog) {
		lines.push(`migrated fact log: ${m.movedFactLog.from} -> ${m.movedFactLog.to}`);
	}
	return lines;
}

/**
 * Moves `~/.ah` to `~/.flusk` when the destination does not exist yet.
 * Skipped entirely when FLUSK_HOME is set: an explicit root is the caller
 * saying where state lives, and moving a directory they named somewhere they
 * did not would be a surprise.
 */
function migrateRoot(): HomeMigration["movedHome"] {
	if (process.env.FLUSK_HOME !== undefined) return undefined;
	const to = fluskHome();
	const from = legacyHome();
	if (existsSync(to) || !existsSync(from)) return undefined;
	renameSync(from, to);
	return { from, to };
}

/**
 * Renames the ops fact log inside whatever root is in play — including a root
 * named by FLUSK_HOME, which is how a copied `.ah` home is adopted. Both names
 * come from `nsPath`, so a change to the naming scheme cannot desynchronise
 * the two halves of this rename.
 */
function migrateFactLog(): HomeMigration["movedFactLog"] {
	const dir = join(fluskHome(), "store");
	const from = nsPath(dir, LEGACY_NS);
	const to = nsPath(dir, FLUSK_NS);
	if (!existsSync(from) || existsSync(to)) return undefined;
	renameSync(from, to);
	return { from, to };
}

/**
 * Idempotent: safe to call on every start. Never throws for the ordinary
 * reasons a move fails (a root on another filesystem, a permission problem) —
 * a failed migration must not stop a run that would otherwise work, it just
 * leaves the old state where it is and reports nothing moved.
 */
export function migrateHome(): HomeMigration {
	const out: HomeMigration = {};
	try {
		const movedHome = migrateRoot();
		if (movedHome) out.movedHome = movedHome;
		const movedFactLog = migrateFactLog();
		if (movedFactLog) out.movedFactLog = movedFactLog;
	} catch {
		return out;
	}
	return out;
}
