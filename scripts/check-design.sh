#!/usr/bin/env bash
# Design-token drift gate, run in CI as `npm run design`.
#
# Rule 1: every colour comes from a token. A hex, rgb()/hsl() or a bare colour
#         keyword in any src/ui/styles-*.ts other than the token module is a
#         defect, and so is reaching past the semantic layer into the raw
#         IntelliJ ramps (--ij-gray-1 and friends).
# Rule 2: every spacing, radius, font size and box metric comes from a token. A
#         literal px on padding/margin/gap/border-radius/font-size/font, on any
#         of height/width (and their min-/max- forms), on the inset properties
#         top/right/bottom/left, or on outline-offset is a defect.
#
# src/ui/styles-tokens.ts is where those values are allowed to live, so it is
# the one file this gate skips. A genuine one-off elsewhere may carry an
# inline `design-exempt: <why>` comment ON THE SAME LINE; the count of those
# is printed on every run so they cannot quietly accumulate.
set -euo pipefail

cd "$(dirname "$0")/.."

files=$(find src/ui -name 'styles-*.ts' -type f ! -name 'styles-tokens.ts' | sort)
[ -n "$files" ] || { echo "design: no style modules found" >&2; exit 1; }

# shellcheck disable=SC2086
report=$(awk '
FNR == 1 { inblk = 0 }
{
	raw = $0
	isex = (raw ~ /design-exempt:[[:space:]]*[^[:space:]]/)
	line = raw
	if (inblk) { p = index(line, "*/"); if (p == 0) next; line = substr(line, p + 2); inblk = 0 }
	while (match(line, /\/\*.*\*\//)) line = substr(line, 1, RSTART - 1) " " substr(line, RSTART + RLENGTH)
	p = index(line, "/*"); if (p > 0) { line = substr(line, 1, p - 1); inblk = 1 }
	sub(/(^|[[:space:];{])\/\/.*/, "", line)
	if (isex) { exempt++; next }

	if (line ~ /--ij-(gray|blue|green|red|yellow|orange|purple|teal)-[0-9]/)
		flag("raw palette ramp (use a semantic token)")
	gsub(/var\([^)]*\)/, "VAR", line)
	if (line ~ /#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]/) flag("raw hex colour")
	if (line ~ /(rgba?|hsla?)[[:space:]]*\(/) flag("raw rgb()/hsl() colour")
	pad = " " line " "
	if (pad ~ /[^-A-Za-z](white|black|red|green|blue|yellow|orange|purple|gray|grey|silver|teal|navy|olive|maroon|aqua|fuchsia|lime|pink|brown|cyan|magenta|gold|violet|indigo|crimson|coral|salmon|khaki|turquoise|lavender|beige|ivory|plum|orchid|tomato|azure|snow|wheat)[^-A-Za-z]/)
		flag("bare colour keyword")

	n = split("padding margin gap row-gap column-gap font-size border-radius padding-top padding-right padding-bottom padding-left margin-top margin-right margin-bottom margin-left border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius font height width min-height max-height min-width max-width top right bottom left outline-offset", props, " ")
	for (i = 1; i <= n; i++)
		if (line ~ ("(^|[^-A-Za-z])" props[i] "[[:space:]]*:[^;}]*[0-9]px")) {
			flag("literal px on " props[i]); break
		}
}
function flag(why) { printf "  %s:%d  %s\n", FILENAME, FNR, why; bad++ }
END { printf "@%d %d\n", bad + 0, exempt + 0 }
' $files)

summary=$(printf '%s\n' "$report" | sed -n 's/^@//p')
bad=${summary%% *}
exempt=${summary##* }
printf '%s\n' "$report" | grep -v '^@' || true

echo "design: ${exempt} inline exemption(s) (design-exempt:)"
if [ "$bad" -gt 0 ]; then
	echo "FAIL: ${bad} raw value(s) outside src/ui/styles-tokens.ts"
	exit 1
fi
echo "design: OK"
