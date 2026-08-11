/**
 * The Flows view. Only what the existing vocabulary does not already cover:
 * stage chips, tables, pills, sections and code blocks are reused as they are,
 * so a flow run looks like every other run in the workbench.
 */
export const FLOW_CSS = `
.flow-step {
	border: 1px solid var(--border); border-radius: 6px; background: var(--panel);
	margin-bottom: 10px; overflow: hidden;
}
.flow-step-head {
	display: flex; align-items: baseline; gap: 8px; padding: 6px 10px; font-size: 12.5px;
}
.flow-step-head .dim { font: 11.5px var(--font-code); }
.flow-sources {
	display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
	padding: 0 10px 8px; font-size: 11.5px;
}
.flow-step .code.out {
	margin: 0; border-top: 1px solid var(--border); max-height: 320px; overflow: auto;
}
#flows .stages { margin: 4px 0; }
#flows .tbl td .stages { margin: 0; }
`;
