/**
 * The one place every subcommand's shape is written down. Split out of
 * main.ts so adding a command costs a line here rather than pushing the
 * dispatcher past the file-size standard.
 */
export const USAGE = `Usage:
  ah run <task> [--model <provider/id>] [--kind <plan|code|review|summarize>]
                 [--max-cost <usd>] [--for <2h|30m>] [--max-turns <n>] [--repo <path>]
                 [--dry] [--no-isolation] [--allow-dirty] [--no-verify] [--quiet]
                 [--fake <script.json>]
  ah resume <path-or-id> [--steer <msg>] [--fake <script.json>] [--no-verify] [--quiet]
  ah goal <text> [--repo <path>] [--dry] [--fake <script.json>] [--no-verify] [--quiet]
  ah goal --list [--repo <path>]
  ah search <query> [--project <name>] [--kind <commit|session|journal|doc|skill>]
                    [--limit <n>] [--json] [--refresh]
  ah find <query> [--project <name>] [--glob <g>] [--regex] [--case] [--limit <n>]
  ah prompt <task> [--repo <path> | --all] [--budget <n>] [--json] [--copy] [--refresh]
  ah feedback <good|bad>
  ah workspace <init|show|path> [--project]
  ah index [--repo <path>] [--json]  what this repo is, and what would help
  ah runs [-n <count>]
  ah watch [--repo <path>] [--once]
  ah ui [--port <n>] [--no-open]
`;
