//! The pure-Rust half of the render tests: the escaping guarantee and block
//! shapes. Full TS-vs-Rust byte equality runs in vitest (test/native-render*).

use super::render_markdown;

#[test]
fn script_tags_render_as_text_everywhere() {
    let out = render_markdown("# <script>alert(1)</script>\n\nbody <img onerror=\"x\">\n\n- <script>a</script>\n\n> <script>b</script>\n");
    assert!(!out.contains("<script"), "{out}");
    assert!(!out.contains("<img"), "{out}");
    assert!(out.contains("&lt;script&gt;"));
}

#[test]
fn fence_cannot_break_out_of_code() {
    let out = render_markdown("```\n</code></pre><script>alert(1)</script>\n```\n");
    assert!(!out.contains("<script"), "{out}");
    assert!(out.contains("&lt;/code&gt;"));
}

#[test]
fn unsafe_schemes_stay_plain_text() {
    for url in ["javascript:alert(1)", "\u{1}javascript:x", "data:text/html,x", "//evil.example"] {
        let out = render_markdown(&format!("[click]({url})"));
        assert!(!out.contains("<a "), "{url} linked: {out}");
    }
    let ok = render_markdown("[x](https://example.com/a?b=1)");
    assert!(ok.contains("<a href=\"https://example.com/a?b=1\" rel=\"noopener noreferrer\">"));
}

#[test]
fn quotes_and_ampersands_escape() {
    let out = render_markdown("a & b \"c\" <d>");
    assert_eq!(out, "<p>a &amp; b &quot;c&quot; &lt;d&gt;</p>");
}

#[test]
fn blocks_take_their_shapes() {
    assert_eq!(render_markdown("## Hi *there*"), "<h2>Hi <em>there</em></h2>");
    assert_eq!(render_markdown("---"), "<hr>");
    assert_eq!(render_markdown("> a\n> b"), "<blockquote><p>a b</p></blockquote>");
    assert_eq!(
        render_markdown("- a\n  - b\n- [x] done"),
        "<ul><li>a<ul><li>b</li></ul></li><li class=\"task\"><input type=\"checkbox\" disabled checked> done</li></ul>"
    );
    assert_eq!(
        render_markdown("| a | b |\n|---|---|\n| 1 | 2 |"),
        "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>"
    );
}

#[test]
fn snake_case_survives_but_emphasis_works() {
    assert_eq!(render_markdown("use MAX_MATCHES and _em_"), "<p>use MAX_MATCHES and <em>em</em></p>");
}

#[test]
fn frontmatter_strips_only_when_it_parses() {
    let doc = "---\ntitle: x\n---\nbody";
    assert_eq!(render_markdown(doc), "<p>body</p>");
    // Opens with a rule, no key/value: NOT frontmatter, nothing is lost.
    let rule = "---\nplain words\n---\nafter";
    let out = render_markdown(rule);
    assert!(out.contains("plain words"), "{out}");
}

#[test]
fn unclosed_fence_consumes_to_end_as_code() {
    let out = render_markdown("```ts\nconst a = 1\nno closer");
    assert!(out.starts_with("<pre class=\"code\"><code class=\"lang-ts\">"), "{out}");
    assert!(out.contains("no closer"));
}

#[test]
fn empty_and_crlf_inputs() {
    assert_eq!(render_markdown(""), "");
    assert_eq!(render_markdown("a\r\nb"), "<p>a b</p>");
}
