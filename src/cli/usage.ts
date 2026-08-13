/**
 * The one place every subcommand's shape is written down. Split out of
 * main.ts so adding a command costs a line here rather than pushing the
 * dispatcher past the file-size standard.
 */
export const USAGE = `Usage:
  flusk run <task> [--model <provider/id>] [--kind <plan|code|review|summarize>]
                 [--max-cost <usd>] [--for <2h|30m>] [--max-turns <n>] [--repo <path>]
                 [--dry] [--no-isolation] [--allow-dirty] [--no-verify] [--quiet]
                 [--no-extensions] [--fake <script.json>]
  flusk resume <path-or-id> [--steer <msg>] [--fake <script.json>] [--no-verify]
                            [--no-extensions] [--quiet]
  flusk goal <text> [--repo <path>] [--dry] [--fake <script.json>] [--no-verify]
                    [--no-extensions] [--quiet]
  flusk goal --list [--repo <path>]
  flusk flow run <task> [--flow <name>] [--project <p>] [--max-cost <usd>] [--dry] [--json]
                    [--no-isolation] [--allow-dirty]
  flusk flow list [--json]
  flusk flow resume <runId>
  flusk search <query> [--project <name>] [--kind <commit|session|journal|doc|skill>]
                    [--limit <n>] [--json] [--refresh]
  flusk find <query> [--project <name>] [--glob <g>] [--regex] [--case] [--limit <n>]
  flusk prompt <task> [--repo <path> | --all] [--budget <n>] [--json] [--copy] [--refresh]
  flusk context <task> [--repo <path>] [--budget <n>] [--json]
                    what a run would be told before its first turn, and what was dropped
  flusk feedback <good|bad>
  flusk workspace <init|show|path> [--project]
  flusk index [--repo <path>] [--json]  what this repo is, and what would help
  flusk runs [-n <count>]
  flusk watch [--repo <path>] [--once]
  flusk ui [--server] [--port <n>] [--no-open]
`;
