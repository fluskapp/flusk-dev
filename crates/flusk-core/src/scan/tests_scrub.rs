//! redact() parity spot-checks, mirroring the reference's own guarantees:
//! keys and passwords go, the two public digest shapes stay, identifiers are
//! not mistaken for entropy, and scrubbing is idempotent.

use super::scrub::redact;

#[test]
fn assignments_lose_their_values_but_keep_their_keys() {
    assert_eq!(redact("leaked password=hunter2 here"), "leaked password=[redacted: password] here");
    assert_eq!(redact("DB_PASSWORD: s3cret"), "DB_PASSWORD=[redacted: password]");
    assert_eq!(redact("\"api_key\": \"abc\""), "\"api_key=[redacted: api key]");
    assert_eq!(redact("auth_token='tok'"), "auth_token=[redacted: token]");
}

#[test]
fn corpus_words_are_not_credentials() {
    assert_eq!(redact("max_tokens=4096"), "max_tokens=4096");
    assert_eq!(redact("tokenizer: bpe"), "tokenizer: bpe");
    assert_eq!(redact("xpassword=1"), "xpassword=1"); // key must END at the keyword
}

#[test]
fn public_digests_stay_verbatim() {
    let sha = "0123456789abcdef0123456789abcdef01234567";
    assert_eq!(redact(sha), sha);
    let integrity = "sha512-Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv";
    assert_eq!(redact(integrity), integrity);
}

#[test]
fn high_entropy_and_hex_runs_are_marked() {
    assert_eq!(redact("0123456789ABCDEF0123456789ABCDEF"), "[redacted: hash]");
    assert_eq!(redact("blob Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv"), "blob [redacted: secret]");
    // A real identifier has no proportional digit/case mix.
    let ident = "AccountSecurityPanelContainer2ExtraLong";
    assert_eq!(redact(ident), ident);
}

#[test]
fn provider_shapes_are_named() {
    assert_eq!(redact("t ghp_ABCDEFGHIJKLMNOP1234 t"), "t [redacted: github token] t");
    assert_eq!(redact("aws AKIAABCDEFGHIJKLMNOP"), "aws [redacted: aws key]");
    assert_eq!(redact("key sk-ant-abcdefgh12345678"), "key [redacted: anthropic key]");
    assert_eq!(redact("Bearer  abcdef123456789"), "Bearer [redacted: bearer token]");
    assert_eq!(
        redact("db postgres://user:pass@db.example.com/x"),
        "db postgres://[redacted: url credentials]@db.example.com/x"
    );
    assert_eq!(
        redact("-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----"),
        "[redacted: private key]"
    );
}

#[test]
fn redact_is_idempotent() {
    let dirty = "password=hunter2 ghp_ABCDEFGHIJKLMNOP1234 0123456789ABCDEF0123456789ABCDEF";
    let once = redact(dirty);
    assert_eq!(redact(&once), once);
}

#[test]
fn paths_survive_because_slash_breaks_the_run() {
    let path = "base44/functions/handleUserThing/index.ts";
    assert_eq!(redact(path), path);
}
