//! An order-preserving JSON value, because the log is compared by byte.
//!
//! JSON.stringify writes object keys in insertion order, and the sweep path
//! re-encodes lines it parsed — so parse → encode must round-trip a fact's
//! key order exactly. serde_json's Map sorts keys, which would silently
//! re-order `properties` on every compaction; this value keeps document
//! order instead, exactly as JSON.parse → JSON.stringify does in Node.
//! Numbers stay `serde_json::Number` so an integer never grows a ".0".

use serde_json::Number;

#[derive(Clone, Debug, PartialEq)]
pub enum JVal {
    Null,
    Bool(bool),
    Num(Number),
    Str(String),
    Arr(Vec<JVal>),
    Obj(Vec<(String, JVal)>),
}

impl JVal {
    pub fn get(&self, key: &str) -> Option<&JVal> {
        match self {
            JVal::Obj(entries) => entries.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    pub fn get_str(&self, key: &str) -> Option<&str> {
        match self.get(key) {
            Some(JVal::Str(s)) => Some(s),
            _ => None,
        }
    }

    pub fn get_f64(&self, key: &str) -> Option<f64> {
        match self.get(key) {
            Some(JVal::Num(n)) => n.as_f64(),
            _ => None,
        }
    }

    /// Mutate `key` in place, keeping its position — the Rust spelling of
    /// `row.fact.status = "superseded"` on a parsed object.
    pub fn set(&mut self, key: &str, value: JVal) {
        if let JVal::Obj(entries) = self {
            match entries.iter_mut().find(|(k, _)| k == key) {
                Some(slot) => slot.1 = value,
                None => entries.push((key.to_string(), value)),
            }
        }
    }

    pub fn to_json(&self) -> String {
        let mut out = String::new();
        self.write(&mut out);
        out
    }

    fn write(&self, out: &mut String) {
        match self {
            JVal::Null => out.push_str("null"),
            JVal::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
            JVal::Num(n) => out.push_str(&n.to_string()),
            JVal::Str(s) => write_js_string(s, out),
            JVal::Arr(items) => {
                out.push('[');
                for (i, v) in items.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    v.write(out);
                }
                out.push(']');
            }
            JVal::Obj(entries) => {
                out.push('{');
                for (i, (k, v)) in entries.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    write_js_string(k, out);
                    out.push(':');
                    v.write(out);
                }
                out.push('}');
            }
        }
    }
}

/// serde_json's string escaping is byte-identical to JSON.stringify's for
/// valid UTF-8 (short escapes for \b \t \n \f \r, \u00XX for other controls,
/// nothing else touched), so strings go through it rather than a second
/// escaper that could drift.
pub fn write_js_string(s: &str, out: &mut String) {
    out.push_str(&serde_json::to_string(s).expect("a string always encodes"));
}

/// JS number formatting: an integral value prints with no fraction part
/// (JSON.stringify(2.0) === "2"), everything else prints shortest-round-trip,
/// which is what both V8 and ryu produce.
pub fn js_num(v: f64) -> Number {
    if v.fract() == 0.0 && v.abs() <= 9_007_199_254_740_991.0 {
        Number::from(v as i64)
    } else {
        Number::from_f64(v).unwrap_or_else(|| Number::from(0))
    }
}
