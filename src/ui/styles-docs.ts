/** Document list chips and the rendered-markdown reader. */
export const DOCS_CSS = `
#docs { padding: 8px 16px 36px; max-width: 1080px; }
#doc-search {
	display: block; width: 100%; max-width: 340px; margin: 0 0 8px;
	padding: 2px 6px; font: 12.5px var(--font-ui); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); outline: none;
}
#doc-search:focus { border-color: var(--accent); }
.kind {
	font: 10px var(--font-code); text-transform: uppercase; padding: 0 5px;
	background: var(--hover); color: var(--dim);
}
/* Only "context" is tinted, and with the accent — a document KIND is not a
   status, so plan must not read as a warning nor skill as a success. */
.k-context { color: var(--accent); background: var(--accent-soft); }

#doc, #file { display: flex; flex-direction: column; min-height: 0; }

.md { line-height: 1.6; max-width: 900px; }
.md h1, .md h2, .md h3, .md h4 { margin: 16px 0 6px; line-height: 1.3; }
.md h1 { font-size: 18px; } .md h2 { font-size: 15px; } .md h3 { font-size: 13.5px; }
.md p, .md ul, .md ol, .md blockquote { margin: 7px 0; }
.md ul, .md ol { padding-left: 20px; }
.md code { background: var(--code-bg); padding: 0 3px; font-size: 12px; }
.md pre.code { padding: 8px 10px; border: 1px solid var(--border); }
.md pre.code code { background: none; padding: 0; }
.md blockquote {
	border-left: 2px solid var(--border); padding-left: 10px; color: var(--dim); margin-left: 0;
}
.md table { border-collapse: collapse; font-size: 12.5px; display: block; overflow-x: auto; }
.md th, .md td { border: 1px solid var(--border); padding: 2px 8px; text-align: left; }
.md th { background: var(--panel); }
.md a { color: var(--accent); }
.md hr { border: none; border-top: 1px solid var(--border); margin: 14px 0; }
/* Syntax colour (highlight.ts emits these): meaning only, never decoration. */
.hl-kw { color: var(--accent); }
.hl-str { color: var(--ok); }
.hl-com { color: var(--dim); font-style: italic; }
.hl-num { color: var(--warn); }
.hl-fn { color: var(--tag-user); }
.hl-punct { color: var(--dim); }
.hl-add { color: var(--ok); }
.hl-del { color: var(--err); }
.hl-meta { color: var(--accent); }
`;
