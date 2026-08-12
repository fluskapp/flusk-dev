/**
 * Guaranteed room per source, so one loud source cannot take the whole block.
 *
 * Normalising scores makes sources comparable; it does not stop the source
 * with the most CANDIDATES from winning every slot. A repo with four hundred
 * indexed commits and one profile line will hand the packer four hundred
 * history blocks that all outrank the profile — and the run starts knowing
 * everything about last month and nothing about what it is running on.
 *
 * The floor is a first pass: each source packs into its own reserved slice
 * before anything competes globally. It is a FLOOR, not a quota — a source
 * that cannot fill its slice leaves the rest to the free-for-all, and a source
 * with more to say can still win the remainder on rank.
 *
 * The shares sum to 0.80 by design. The last 0.20 is the open contest, and it
 * is what makes the floors floors: if they summed to 1.00 the ranking step
 * would decide nothing at all, and the block would be a fixed pie chart of its
 * sources regardless of the task.
 */

/**
 * Why each is what it is:
 *
 *   history 0.28 the largest corpus and the loudest; 0.28 is enough for a
 *                trap, a precedent and an attempt, and not enough to bury the
 *                rest — this is the number that stops all-commits-no-code.
 *   house-  0.22 the binding rules are pinned already; this covers the ranked
 *   rules        rules documents, of which two or three is the useful number.
 *   runs    0.18 a resume has exactly ONE prior run, so its three blocks are
 *                bounded by construction; the floor only has to fit them.
 *   profile 0.12 four short orientation blocks, capped at 0.44 score. It needs
 *                a floor precisely BECAUSE it can never win on rank.
 *   default 0.10 an unregistered source gets a seat, not a say.
 */
export const FLOOR_SHARE: Record<string, number> = {
	history: 0.28,
	"house-rules": 0.22,
	runs: 0.18,
	profile: 0.12,
};

export const DEFAULT_FLOOR_SHARE = 0.1;

/** Tokens reserved for `source` out of the ranked remainder, never negative. */
export function floorFor(source: string, rankedBudget: number): number {
	const share = FLOOR_SHARE[source] ?? DEFAULT_FLOOR_SHARE;
	return Math.max(0, Math.floor(rankedBudget * share));
}
