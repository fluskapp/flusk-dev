/** Document browser and rendered-markdown preview styles. */
export const DOCS_CSS = `
.docs-split { display: grid; grid-template-columns: 300px 1fr; height: 100%; }
.docs-list { overflow-y: auto; border-right: 1px solid var(--border); padding-bottom: 30px; }
#doc-search {
	display: block; width: calc(100% - 20px); margin: 10px; padding: 4px 8px;
	font: 12.5px var(--font-ui); color: var(--text); background: var(--bg);
	border: 1px solid var(--border); border-radius: 5px; outline: none;
}
.doc-row {
	display: flex; align-items: center; gap: 8px; padding: 4px 12px;
	cursor: pointer; border-left: 2px solid transparent; font-size: 12.5px;
}
.doc-row:hover { background: var(--hover); }
.doc-row.active { background: var(--sel); border-left-color: var(--accent); }
.doc-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-row .dim { margin-left: auto; white-space: nowrap; }
.kind {
	font: 10px var(--font-code); text-transform: uppercase; padding: 1px 5px;
	border-radius: 3px; background: var(--hover); color: var(--dim); flex: none;
}
.k-context { color: var(--accent); background: var(--accent-soft); }
.k-plan { color: var(--warn); }
.k-skill { color: var(--ok); }
.docs-preview { overflow-y: auto; padding: 16px 22px 40px; }
.doc-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.doc-head .dim { font: 11px var(--font-code); }
.frontmatter {
	border: 1px solid var(--border); border-radius: 6px; background: var(--panel);
	padding: 8px 12px; margin-bottom: 16px; font-size: 12px;
}
.fm-row { display: flex; gap: 12px; padding: 2px 0; }
.fm-k { color: var(--dim); min-width: 110px; }

.md { line-height: 1.65; }
.md h1, .md h2, .md h3, .md h4 { margin: 20px 0 8px; line-height: 1.3; }
.md h1 { font-size: 20px; } .md h2 { font-size: 16px; } .md h3 { font-size: 14px; }
.md p, .md ul, .md ol, .md blockquote { margin: 8px 0; }
.md ul, .md ol { padding-left: 22px; }
.md code { background: var(--code-bg); border-radius: 3px; padding: 1px 4px; font-size: 12px; }
.md pre.code { padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; }
.md pre.code code { background: none; padding: 0; }
.md blockquote {
	border-left: 3px solid var(--border); padding-left: 12px; color: var(--dim); margin-left: 0;
}
.md table { border-collapse: collapse; font-size: 12.5px; display: block; overflow-x: auto; }
.md th, .md td { border: 1px solid var(--border); padding: 4px 9px; text-align: left; }
.md th { background: var(--panel); }
.md a { color: var(--accent); }
.md hr { border: none; border-top: 1px solid var(--border); margin: 18px 0; }
#runs-btn { font-size: 12px; padding: 2px 10px; border: 1px solid var(--border); border-radius: 5px; }
#runs-btn.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.journal {
	border: 1px solid var(--border); border-radius: 6px; background: var(--panel);
	padding: 8px 12px; margin-bottom: 8px;
}
.journal.open { background: var(--bg); border-color: var(--accent); }
.journal-head { display: flex; align-items: center; gap: 9px; cursor: pointer; }
.journal-head .dim { margin-left: auto; white-space: nowrap; }
.journal .stages { display: flex; flex-wrap: wrap; gap: 4px; margin: 7px 0 4px; }
.stage {
	font: 10.5px var(--font-code); padding: 1px 6px; border-radius: 3px;
	background: var(--hover); color: var(--dim); border: 1px solid transparent;
}
.stage.completed { background: transparent; border-color: var(--ok); color: var(--ok); }
.stage.running { background: var(--accent); color: #fff; }
.stage.error { background: transparent; border-color: var(--err); color: var(--err); }
.stage.stopped { border-color: var(--warn); color: var(--warn); background: transparent; }
#journal-body { margin-top: 8px; max-height: 420px; }
.brain-head { font-size: 12px; color: var(--dim); margin-bottom: 14px; }
.brain-sec { margin-bottom: 26px; }
.brain-sec h3 {
	margin: 0 0 8px; font-size: 12px; text-transform: uppercase;
	letter-spacing: .5px; color: var(--dim);
	border-bottom: 1px solid var(--border); padding-bottom: 5px;
}
.goal {
	border: 1px solid var(--border); border-radius: 6px;
	padding: 8px 12px; margin-bottom: 10px; background: var(--panel);
}
.goal-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.goal-head .dim { margin-left: auto; }
.task {
	display: flex; align-items: center; gap: 9px;
	padding: 3px 0 3px 4px; font-size: 12.5px;
}
.fact {
	display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
	padding: 4px 0; font-size: 12.5px; border-bottom: 1px solid var(--border);
}
.fact .dim { margin-left: auto; }

.meta-actions { display: flex; gap: 6px; margin-left: auto; }
.act {
	font-size: 11.5px; color: var(--text); padding: 2px 10px;
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
}
.act:hover { background: var(--hover); border-color: var(--dim); }
`;
