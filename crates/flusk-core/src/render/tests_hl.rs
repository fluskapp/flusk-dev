//! Pure-Rust highlighter tests: classes land where the reference puts them,
//! escaping holds, and the two pathological shapes the reference's header
//! documents (unrolled string bodies, consumed unterminated openers) finish.

use super::highlight_code;

#[test]
fn ts_tokens_take_their_classes() {
    let out = highlight_code("const n = 42 // done", "ts");
    assert!(out.contains("<span class=\"hl-kw\">const</span>"), "{out}");
    assert!(out.contains("<span class=\"hl-num\">42</span>"));
    assert!(out.contains("<span class=\"hl-com\">// done</span>"));
    let call = highlight_code("foo(1)", "ts");
    assert!(call.contains("<span class=\"hl-fn\">foo</span>"), "{call}");
}

#[test]
fn strings_escape_and_wrap() {
    let out = highlight_code("x = \"<b>&\"", "python");
    assert!(out.contains("<span class=\"hl-str\">&quot;&lt;b&gt;&amp;&quot;</span>"), "{out}");
}

#[test]
fn json_keys_differ_from_values() {
    let out = highlight_code("{\"k\": \"v\"}", "json");
    assert!(out.contains("<span class=\"hl-fn\">&quot;k&quot;</span>"), "{out}");
    assert!(out.contains("<span class=\"hl-str\">&quot;v&quot;</span>"));
}

#[test]
fn unterminated_openers_consume_not_retry() {
    // An unclosed /* comments out the rest of the block, as every real
    // highlighter renders it — and as the non-quadratic scan requires.
    let out = highlight_code("/*a\nb\nc", "ts");
    assert_eq!(out, "<span class=\"hl-com\">/*a\nb\nc</span>");
    // An unpartnered quote ends at the newline instead of eating the block.
    let q = highlight_code("\"open\nnext", "ts");
    assert!(q.starts_with("<span class=\"hl-str\">&quot;open</span>\n"), "{q}");
}

#[test]
fn pathological_inputs_finish() {
    // The two shapes from the reference's header, at reduced size: the old
    // grammar needed minutes; anything non-linear would still take seconds.
    let pairs = "\"\\".repeat(150_000);
    assert!(!highlight_code(&pairs, "ts").is_empty());
    let opens = "/*a".repeat(150_000);
    assert!(!highlight_code(&opens, "ts").is_empty());
}

#[test]
fn diff_and_yaml_lines_classify() {
    let d = highlight_code("diff --git a b\n+add\n-del\nplain", "diff");
    assert_eq!(
        d,
        "<span class=\"hl-meta\">diff --git a b</span>\n<span class=\"hl-add\">+add</span>\n<span class=\"hl-del\">-del</span>\nplain"
    );
    let y = highlight_code("key: 42\n# note", "yaml");
    assert!(y.contains("<span class=\"hl-kw\">key</span>"), "{y}");
    assert!(y.contains("<span class=\"hl-num\">42</span>"));
    assert!(y.contains("<span class=\"hl-com\"># note</span>"));
}

#[test]
fn unsupported_language_returns_escaped_source() {
    assert_eq!(highlight_code("<a> & b", "cobol"), "&lt;a&gt; &amp; b");
    assert_eq!(highlight_code("", "ts"), "");
}

#[test]
fn cap_returns_plain_escaped_text() {
    let big = "x ".repeat(500_001); // 1,000,002 units
    assert_eq!(highlight_code(&big, "ts"), big);
}
