//! Path noise filters — NOISE_DIR / NOISE_FILE / NOISE_EXT from
//! source-git.repository.ts. Generated or vendored trees: churn with no
//! reusable precedent in it. The regexes reduce to segment and suffix tests:
//! a noise DIRECTORY is any non-final path segment (case-sensitive), a noise
//! FILE is the final segment (case-sensitive), a noise EXTENSION is a
//! case-insensitive suffix.

const DIRS: [&str; 14] = [
    "node_modules", "dist", "build", "out", "target", "coverage", "vendor",
    "third_party", ".next", ".nuxt", ".venv", "venv", "__pycache__", "__snapshots__",
];

const FILES: [&str; 13] = [
    "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml",
    "bun.lockb", "Cargo.lock", "poetry.lock", "Pipfile.lock", "uv.lock",
    "Gemfile.lock", "composer.lock", "go.sum", "flake.lock",
];

const EXTS: [&str; 30] = [
    ".min.js", ".min.css", ".bundle.js", ".map", ".png", ".jpg", ".jpeg", ".gif",
    ".webp", ".ico", ".svg", ".pdf", ".zip", ".gz", ".tgz", ".woff", ".woff2",
    ".ttf", ".eot", ".mp4", ".mov", ".wasm", ".so", ".dylib", ".dll", ".exe",
    ".jar", ".class", ".pyc", ".snap",
];

/// MAX_PATH_LEN, counted like JS `.length` (UTF-16 units).
const MAX_PATH_LEN: usize = 200;

pub(crate) fn is_noise(p: &str) -> bool {
    if p.encode_utf16().count() > MAX_PATH_LEN {
        return true;
    }
    let segments: Vec<&str> = p.split('/').collect();
    // NOISE_DIR: `(^|/)(name)/` — every segment but the last has a '/' after.
    if segments[..segments.len().saturating_sub(1)]
        .iter()
        .any(|s| DIRS.contains(s))
    {
        return true;
    }
    // NOISE_FILE: `(^|/)(name)$` — the last segment exactly.
    if segments.last().is_some_and(|s| FILES.contains(s)) {
        return true;
    }
    // NOISE_EXT: `\.(…)$/i`.
    let lower = p.to_ascii_lowercase();
    EXTS.iter().any(|e| lower.ends_with(e))
}
