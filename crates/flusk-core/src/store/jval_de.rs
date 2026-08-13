//! Deserialize for JVal. serde_json's MapAccess yields keys in document
//! order — this visitor is where insertion order survives the parse, so a
//! fact re-encoded by the sweeper keeps the byte layout it arrived with.

use super::jval::{js_num, JVal};
use serde::de::{Deserialize, Deserializer, Error, MapAccess, SeqAccess, Visitor};
use serde_json::Number;
use std::fmt;

struct JValVisitor;

impl<'de> Visitor<'de> for JValVisitor {
    type Value = JVal;

    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("any JSON value")
    }

    fn visit_bool<E: Error>(self, v: bool) -> Result<JVal, E> {
        Ok(JVal::Bool(v))
    }

    fn visit_i64<E: Error>(self, v: i64) -> Result<JVal, E> {
        Ok(JVal::Num(Number::from(v)))
    }

    fn visit_u64<E: Error>(self, v: u64) -> Result<JVal, E> {
        Ok(JVal::Num(Number::from(v)))
    }

    /// Integral floats normalize to integers here ("1e3" → 1000), matching
    /// what JSON.parse → JSON.stringify would print for the same input.
    fn visit_f64<E: Error>(self, v: f64) -> Result<JVal, E> {
        Ok(JVal::Num(js_num(v)))
    }

    fn visit_str<E: Error>(self, v: &str) -> Result<JVal, E> {
        Ok(JVal::Str(v.to_owned()))
    }

    fn visit_string<E: Error>(self, v: String) -> Result<JVal, E> {
        Ok(JVal::Str(v))
    }

    fn visit_unit<E: Error>(self) -> Result<JVal, E> {
        Ok(JVal::Null)
    }

    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<JVal, A::Error> {
        let mut items = Vec::new();
        while let Some(v) = seq.next_element::<JVal>()? {
            items.push(v);
        }
        Ok(JVal::Arr(items))
    }

    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<JVal, A::Error> {
        let mut entries = Vec::new();
        while let Some((k, v)) = map.next_entry::<String, JVal>()? {
            entries.push((k, v));
        }
        Ok(JVal::Obj(entries))
    }
}

impl<'de> Deserialize<'de> for JVal {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<JVal, D::Error> {
        d.deserialize_any(JValVisitor)
    }
}
