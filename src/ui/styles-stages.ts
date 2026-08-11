/**
 * The stage pipeline: the row of chips that says where a harness run got to.
 *
 * Its own file because two unrelated surfaces draw it — the run view and the
 * frontmatter property table of any journal opened as a document — so it is
 * not the transcript's private styling, and folding it back in there is what
 * pushed that file past the size cap.
 */
export const STAGES_CSS = `
/* The stage pipeline as a Badge row. A pending stage is not a disabled
   control — its name is content — so it is the secondary text on a real border. */
.stages { display: flex; flex-wrap: wrap; gap: var(--ij-space-1); margin: var(--ij-space-2) 0; }
.stage {
	font: var(--ij-fs-2) var(--font-code);
	line-height: calc(var(--ij-row-h) - var(--ij-space-2));
	padding: 0 var(--ij-space-2); border-radius: var(--ij-radius-sm);
	background: transparent; color: var(--ij-text-secondary); border: 1px solid var(--ij-border-control);
}
.stage.completed { color: var(--ok); border-color: var(--ok); }
.stage.running { background: var(--accent); color: var(--ij-button-default-fg); border-color: var(--accent); }
.stage.error { color: var(--err); border-color: var(--err); }
.stage.stopped { color: var(--warn); border-color: var(--warn); }

/* The glyph carries the status as well as the colour does. Colour alone is
   invisible to anyone who cannot separate the greens from the reds, and it is
   lost entirely when a chip sits on an inverted selected row. */
.stg-i { margin-right: var(--ij-space-1); font-style: normal; }
/* Duration is context, not the label: it reads at the secondary weight so a
   row still scans as a list of stage NAMES. */
.stg-t { margin-left: var(--ij-space-1); color: var(--ij-text-secondary); opacity: .8; }
.stage.running .stg-t { color: inherit; }
.stg-row { display: flex; flex-wrap: wrap; gap: var(--ij-space-1); }
`;
