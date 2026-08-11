/** Document list chips and the rendered-markdown reader. */
export const DOCS_CSS = `
#docs { padding: 10px 18px 40px; max-width: 1080px; }
#doc-search {
	display: block; width: 100%; max-width: 340px; margin: 0 0 10px;
	padding: 3px 7px; font: 12.5px var(--font-ui); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px; outline: none;
}
#doc-search:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
.kind {
	font: 10px var(--font-code); text-transform: uppercase; padding: 1px 5px;
	border-radius: 3px; background: var(--hover); color: var(--dim);
}
.k-context { color: var(--accent); background: var(--accent-soft); }
.k-plan { color: var(--warn); }
.k-skill { color: var(--ok); }

#doc { padding: 12px 22px 40px; max-width: 900px; }
.doc-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.doc-head .dim { font: 11px var(--font-code); }
.frontmatter {
	border: 1px solid var(--border); border-radius: 6px; background: var(--panel);
	padding: 7px 10px; margin-bottom: 14px; font-size: 12px;
}
.fm-row { display: flex; gap: 12px; padding: 2px 0; }
.fm-k { color: var(--dim); min-width: 110px; }

.md { line-height: 1.65; }
.md h1, .md h2, .md h3, .md h4 { margin: 18px 0 7px; line-height: 1.3; }
.md h1 { font-size: 19px; } .md h2 { font-size: 16px; } .md h3 { font-size: 14px; }
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
.md hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
`;
