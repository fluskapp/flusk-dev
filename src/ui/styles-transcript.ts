/**
 * The run transcript: IntelliJ's Run/Debug tool window console.
 *
 * That surface is an editor, not a feed of cards — a header strip under one
 * hairline, console lines on the editor background, and tool calls as
 * collapsible tree nodes one Tree.rowHeight tall. Status is a Badge.*, the
 * stage strip is the Counter/Badge row above it; the journal body below it is
 * markdown (styles-md.ts). Every colour, space, radius and size is a token;
 * the only literal is the `1px` of a separator.
 *
 * Two facts about expUI shape the rules below: *.selectionForeground equals
 * the default foreground in BOTH themes, so a filled selection needs no
 * colour override; and the inactive selection is its own colour
 * (*.selectionInactiveBackground, Gray11/Gray4), not the focused fill faded.
 */
export const TRANSCRIPT_CSS = `
#meta {
	display: flex; flex-wrap: wrap; align-items: center;
	gap: var(--ij-space-1) var(--ij-space-3); min-height: var(--ij-tw-header-h);
	padding: 0 0 var(--ij-space-2); border-bottom: 1px solid var(--border);
	font-size: var(--ij-fs-4);
}
#meta .meta-item { display: inline-flex; align-items: center; gap: var(--ij-space); }

/* Badge.*: a filled plate in the status colour with the theme's own on-badge
   foreground. An outline badge means something else in expUI. */
.pill {
	display: inline-block; padding: 0 var(--ij-space-2);
	border-radius: var(--ij-radius-sm); letter-spacing: .04em;
	font-size: var(--ij-fs-1); font-weight: 600; line-height: var(--ij-lh-loose);
	color: var(--on-accent); background: var(--run); text-transform: uppercase;
}
.pill.completed { background: var(--ok); }
.pill.error { background: var(--err); }
/* blocked is MEDIUM in the attention rules; red would contradict that. */
.pill.blocked, .pill.stopped { background: var(--warn); }
/* Filled with the default button's Blue, so it takes that key's white fg. */
.pill.running { background: var(--accent); color: var(--ij-button-default-fg); }

/* The gutter the speaker tag sits in, and the indent every summary line below
   the transcript aligns to. Derived from the spacing step, not measured. */
#transcript {
	--tx-gutter: calc(var(--ij-space-4) * 3);
	padding: var(--ij-space-3) 0 var(--ij-space-4);
}
/* No align-items at all: a turn that is only tool calls has no first line box,
   and baseline alignment would synthesise one from the bottom of the whole
   node list. The tag is given the body's own line-height instead (.msg-tag
   below), so the two line up without a hand-tuned padding. */
.msg { display: flex; gap: var(--ij-space-3); padding: var(--ij-space) 0; }
.msg-tag {
	flex: none; width: var(--tx-gutter); text-align: right; letter-spacing: .04em;
	font-size: var(--ij-fs-1); font-weight: 700; text-transform: uppercase;
	line-height: calc(var(--ij-fs-6) * var(--ij-lh)); color: var(--tag-flusk);
}
.msg.user .msg-tag { color: var(--tag-user); padding-top: var(--ij-space); }
.msg-body { min-width: 0; flex: 1; }
.pre { white-space: pre-wrap; overflow-wrap: break-word; }
/* Table.stripeColor and a two-pixel rule — the console's way of banding a run
   of lines. No card: no border, no radius, no shadow. */
.msg.user .msg-body {
	background: var(--code-bg); padding: var(--ij-space) var(--ij-space-2);
	box-shadow: inset var(--ij-space-1) 0 0 var(--tag-user);
}

/* A collapsible node row: Tree.rowHeight tall, on one hairline, no frame. The
   status rule is a border and not an inset shadow because the summary's own
   selection fill would paint over a shadow the parent drew. */
.tool { border-bottom: 1px solid var(--border); border-left: var(--ij-space-1) solid transparent; }
.tool.err { border-left-color: var(--err); }
.tool > summary {
	display: flex; align-items: center; gap: var(--ij-space-2);
	min-height: var(--ij-row-h); padding: 0 var(--ij-space-2);
	cursor: pointer; list-style: none; user-select: none;
}
.tool > summary::-webkit-details-marker { display: none; }
.tool > summary::before { content: "▸"; color: var(--dim); font-size: var(--ij-fs-1); }
.tool[open] > summary::before { content: "▾"; }
.tool > summary:hover { background: var(--hover); }
/* Expanded is NOT selected: disclosure and selection are independent in an
   IntelliJ tree, and filling every open node made several rows read as
   selected at once. Only the row the keyboard is on is filled. */
.tool > summary:focus { background: var(--ij-selection); outline: none; }
.tool > summary:focus-visible {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
	outline-offset: calc(var(--ij-focus-ring-w) * -1);
}
/* A tool NAME is not a status, so it carries no colour and no plate. */
.tool-chip { flex: none; font: 600 var(--ij-fs-3) var(--font-code); color: var(--text); }
.tool-preview {
	font: var(--ij-fs-4) var(--font-code); color: var(--dim); min-width: 0;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tool-flag { margin-left: auto; color: var(--err); font-size: var(--ij-fs-3); font-weight: 600; }
/* Console output, capped at fourteen rows so one node cannot own the view. */
.code {
	margin: 0; padding: var(--ij-space) var(--ij-space-3); background: var(--code-bg);
	border-top: 1px solid var(--border); overflow-x: auto;
}
/* The height cap belongs to the TRANSCRIPT, not to the .code class. Tool
   output there is an excerpt and a 400-line dump would bury the next turn --
   but .code is also what the markdown renderer, the doc window's signature
   and the file editor emit, and an editor that can only ever show 19 lines is
   not an editor. Unscoped, this rule clipped every one of them; markdown had
   already grown a max-height:none patch to escape it. Scope it instead, so
   the next surface that renders code does not have to discover this. */
#transcript .code { max-height: calc(var(--ij-row-h) * 14); }
.code.out { color: var(--text); }
.pad { padding: var(--ij-space-1) var(--ij-space-3); }

/* Label.errorForeground behind a marker. The token layer has no error FILL
   (Editor.ToolTip.errorBackground is not in SEMANTIC), so none is invented. */
.error-line {
	margin: var(--ij-space-1) 0; padding: var(--ij-space-1) var(--ij-space-2);
	color: var(--err); font-size: var(--ij-fs-5);
	box-shadow: inset var(--ij-space-1) 0 0 var(--err);
}
.compaction {
	margin: var(--ij-space-3) 0 0; padding: var(--ij-space-1) 0; text-align: center;
	font-size: var(--ij-fs-3); color: var(--dim); border-top: 1px solid var(--border);
}
.stats, .running-note {
	margin: var(--ij-space-4) 0 0 calc(var(--tx-gutter) + var(--ij-space-3));
	font-size: var(--ij-fs-5);
}
.stats { color: var(--dim); }
.running-note { color: var(--accent); }

/* Only a failing stage is a handle onto the journal, so only it is a row you
   can select. The selection outlives :focus (client-journal.ts sets .on),
   which is the whole point of having an inactive selection colour. */
.stage[data-stage], .error-line[data-stage] { cursor: pointer; }
.stage[data-stage]:hover, .error-line[data-stage]:hover { background: var(--hover); }
.stage.on, .error-line.on { background: var(--ij-selection-inactive); }
.stage[data-stage]:focus, .error-line[data-stage]:focus {
	background: var(--ij-selection); outline: none;
}
.stage[data-stage]:focus-visible, .error-line[data-stage]:focus-visible {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
	outline-offset: calc(var(--ij-focus-ring-w) * -1);
}
`;
