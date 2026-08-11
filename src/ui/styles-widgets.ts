/**
 * The shared control kit, read as IntelliJ New UI components: #search is a
 * TextField sitting on Editor.SearchField.background, .act is a Button
 * (Button.arc, Button.startBorderColor, the 28px minimumSize), #toast is a
 * notification balloon, .help-card is a Popup, kbd is Shortcut and .stat is a
 * Counter tile. Every value below is a token; the theme key each token was
 * read from is recorded in styles-tokens.ts.
 *
 * Controls carry Component.arc / Button.arc, containers do not: IntelliJ
 * rounds its fields and buttons and leaves its panels square.
 */
export const WIDGETS_CSS = `
/* --- TextField (Editor.SearchField) -------------------------------------- */
#search {
	display: block; width: calc(100% - var(--ij-space-4));
	margin: var(--ij-space) var(--ij-space-2);
	height: var(--ij-control-h); padding: 0 var(--ij-space-2);
	font: var(--ij-fs-6)/var(--ij-lh) var(--ij-font-ui); color: var(--ij-text);
	background: var(--ij-bg-editor);
	border: 1px solid var(--ij-border-control);
	border-radius: var(--ij-radius); outline: none;
}
/* The New UI draws the ring OUTSIDE the border, in *.focusColor. */
#search:focus {
	border-color: var(--ij-focus-ring);
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring); outline-offset: 0;
}
#search::placeholder { color: var(--ij-text-disabled); }
/* The focused / inactive selection distinction the theme file draws: two
   separate colours, never one colour at two opacities. */
#search::selection { background: var(--ij-selection); color: var(--ij-selection-text); }
#search:not(:focus)::selection { background: var(--ij-selection-inactive); }
#search:disabled { color: var(--ij-text-disabled); border-color: var(--ij-separator); }

/* --- Balloon notification ------------------------------------------------ */
/* Notification.background / .foreground — a plate that is DARK in the light
   theme, which is how IntelliJ draws a balloon and the only thing that tells
   it apart from the panel it floats over. It clears the status bar rather
   than straddling it. */
#toast {
	position: fixed; bottom: calc(var(--ij-status-h) + var(--ij-space-2));
	left: 50%; transform: translateX(-50%);
	z-index: 20; padding: var(--ij-space) var(--ij-space-3); font-size: var(--ij-fs-5);
	background: var(--ij-notification-bg); color: var(--ij-notification-fg);
	border: 1px solid var(--ij-border-control);
}

/* --- Popup --------------------------------------------------------------- */
/* IntelliJ never dims the window behind a popup, and the theme files carry no
   scrim colour, so the overlay is a positioning layer only. It still covers
   the viewport, so the click that dismisses the popup still lands on it. */
.overlay {
	position: fixed; inset: 0; z-index: 10;
	display: flex; align-items: center; justify-content: center;
}
.help-card {
	display: flex; flex-direction: column; min-width: 560px; /* design-exempt: popup measure */
	max-width: 92vw; max-height: 82vh; background: var(--ij-bg-panel);
	border: 1px solid var(--ij-border-control);
}
.popup-head {
	display: flex; align-items: baseline; gap: var(--ij-space-2); flex: none;
	padding: var(--ij-space) var(--ij-space-3);
	border-bottom: 1px solid var(--ij-separator);
}
.popup-head h3 { margin: 0; font-size: var(--ij-fs-6); }
.help-body { overflow: auto; padding: var(--ij-space-2) var(--ij-space-3); }
/* Grouped, two columns of groups: the sheet is a map, not a list. */
.help-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--ij-space-4); }
.help-group > h4 {
	margin: var(--ij-space-2) 0 var(--ij-space); font-size: var(--ij-fs-2);
	text-transform: uppercase; letter-spacing: .5px; color: var(--ij-text-secondary);
	border-bottom: 1px solid var(--ij-separator); padding-bottom: var(--ij-space-1);
}
.keys {
	display: grid; grid-template-columns: auto 1fr; align-items: center;
	gap: var(--ij-space-1) var(--ij-space-3);
}
/* Shortcut: backgroundOpacity is 0 in both themes, so the chip is an outline. */
kbd {
	font: 600 var(--ij-fs-3)/var(--ij-lh-tight) var(--ij-font-mono);
	color: var(--ij-text); background: none;
	border: 1px solid var(--ij-border-control); border-radius: var(--ij-radius-sm);
	padding: 0 var(--ij-space-2); text-align: center; white-space: nowrap;
}

/* --- Counter tiles -------------------------------------------------------- */
/* One-pixel separators with nothing doubled: the row draws its top and left
   edge, each tile draws its right and bottom one. */
.stats-row {
	display: flex; flex-wrap: wrap; margin-bottom: var(--ij-space-4);
	border-top: 1px solid var(--ij-separator);
	border-left: 1px solid var(--ij-separator);
}
.stat {
	flex: 1 1 110px; background: var(--ij-bg-inset);
	padding: var(--ij-space) var(--ij-space-2);
	border-right: 1px solid var(--ij-separator);
	border-bottom: 1px solid var(--ij-separator);
}
/* A tile with nowhere to go stays inert: no cursor, no hover fill. */
.stat[data-open] { cursor: pointer; }
.stat[data-open]:hover { background: var(--ij-hover); }
.stat[data-open]:active { background: var(--ij-selection); }
/* No colour here: .stat-v.ev is what paints a tile that leads somewhere. */
.stat-v { font: 600 var(--ij-fs-9)/var(--ij-lh-tight) var(--ij-font-ui); }
.stat-l {
	font-size: var(--ij-fs-3); text-transform: uppercase; letter-spacing: .5px;
	color: var(--ij-text-secondary);
}
.stat-h {
	font-size: var(--ij-fs-3); color: var(--ij-text-secondary);
	margin-top: var(--ij-space-1);
}

/* --- Button --------------------------------------------------------------- */
.act {
	display: inline-flex; align-items: center; height: var(--ij-control-h);
	padding: 0 var(--ij-space-3); color: var(--ij-text);
	background: var(--ij-bg-panel);
	border: 1px solid var(--ij-border-control);
	border-radius: var(--ij-radius);
}
.act:hover { background: var(--ij-hover); }
.act:active { background: var(--ij-selection); }
.act:focus-visible {
	border-color: var(--ij-focus-ring);
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring); outline-offset: 0;
}
/* Disabled is its own colour, not the enabled control at half opacity. */
.act[disabled], .act[disabled]:hover {
	background: var(--ij-bg-panel); color: var(--ij-text-disabled);
	border-color: var(--ij-separator); cursor: default;
}
.meta-actions { display: flex; gap: var(--ij-space); margin-left: auto; }
`;
