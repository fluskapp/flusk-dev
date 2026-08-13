//! Port of src/features/history/edit-distance.ts: bounded Damerau-Levenshtein.
//! The transposition rule is the point — "retyr" for "retry" must cost one
//! edit, or no five-letter typo is ever correctable.

pub fn edit_distance(a: &str, b: &str, max: usize) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    if a.len().abs_diff(b.len()) > max {
        return max + 1;
    }
    let inf = max + 1;
    let mut two_back: Vec<usize> = Vec::new();
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    for i in 1..=a.len() {
        let mut row = vec![i];
        let mut best = i;
        for j in 1..=b.len() {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            let mut value = (prev.get(j).copied().unwrap_or(inf) + 1)
                .min(row[j - 1] + 1)
                .min(prev.get(j - 1).copied().unwrap_or(inf) + cost);
            if i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1] {
                value = value.min(two_back.get(j - 2).copied().unwrap_or(inf) + 1);
            }
            row.push(value);
            if value < best {
                best = value;
            }
        }
        if best > max {
            return max + 1;
        }
        two_back = prev;
        prev = row;
    }
    prev.get(b.len()).copied().unwrap_or(inf)
}
