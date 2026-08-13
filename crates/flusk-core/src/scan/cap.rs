//! capText port: length caps cut where a reader would cut, never mid-word.
//! JS `.length`/`.slice` count UTF-16 code units, so the cap operates on the
//! UTF-16 encoding — a byte- or char-counted cap would drift from the
//! reference on any non-ASCII commit body.

/// The `\s` set over UTF-16 units (every member is a single unit).
fn space_u16(u: u16) -> bool {
    matches!(u,
        0x09 | 0x0a | 0x0b | 0x0c | 0x0d | 0x20 | 0xa0 | 0x1680
        | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff)
}

fn trim_end_u16(w: &[u16]) -> &[u16] {
    let mut e = w.len();
    while e > 0 && space_u16(w[e - 1]) {
        e -= 1;
    }
    &w[..e]
}

/// `text.replace(/\S+$/, "").trimEnd()`, falling back to the input when the
/// window is one enormous token — an empty body loses more than a ragged one.
fn drop_partial_tail(window: &[u16]) -> String {
    let mut end = window.len();
    while end > 0 && !space_u16(window[end - 1]) {
        end -= 1;
    }
    let cut = trim_end_u16(&window[..end]);
    if cut.is_empty() {
        return String::from_utf16_lossy(window);
    }
    String::from_utf16_lossy(cut)
}

/// `text` capped to `max` UTF-16 units, never ending mid-word. The trailing
/// partial token is dropped; the char after the cut is what says whether the
/// last token in the window is whole.
pub fn cap_text(text: &str, max: usize) -> String {
    if max == 0 {
        return String::new();
    }
    let units: Vec<u16> = text.encode_utf16().collect();
    if units.len() <= max {
        return text.to_string();
    }
    if space_u16(units[max]) {
        return String::from_utf16_lossy(trim_end_u16(&units[..max]));
    }
    drop_partial_tail(&units[..max])
}
