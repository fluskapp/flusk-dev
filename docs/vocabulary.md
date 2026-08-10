# Predicate vocabulary

The controlled vocabulary for facts hit writes to abagraph. `memory_remember`
and the digestion prompt validate against this table; unknown predicates are
rejected with this list as the error message. Confidence conventions:
1.0 harness-observed · 0.9 verification-confirmed · 0.7 LLM-extracted ·
≤0.5 speculative (lands as Candidate, never supersedes settled knowledge).

| Namespace | Subject | Predicate | Object | Cardinality | Written by |
| --- | --- | --- | --- | --- | --- |
| repo | `Repo:<slug>` | `uses` | `Tool:<name>` | coexist | digestion |
| repo | `Repo:<slug>` | `verify_cmd` | literal command | coexist | verify/detect |
| repo | `Repo:<slug>` | `convention` | literal | coexist | digestion, agent |
| repo | `Goal:<id>` | `title` | literal | functional | goals |
| repo | `Goal:<id>` | `status` | planned\|active\|done\|abandoned | functional | goals |
| repo | `Goal:<id>` | `has_task` | `Task:<id>` | coexist | goals |
| repo | `Task:<id>` | `description` | literal | functional | goals |
| repo | `Task:<id>` | `status` | pending\|running\|done\|failed\|blocked | functional | goals |
| repo | `Task:<id>` | `depends_on` | `Task:<id>` | coexist | goals |
| repo | `Task:<id>` | `attempted_by` | `Run:<id>` | coexist | goals |
| repo | `Run:<id>` | `outcome` | literal | functional | harness |
| repo | `Run:<id>` | `touched` | `File:<path>` | coexist | harness |
| repo | `Run:<id>` | `verified_by` | literal command | coexist | harness |
| repo | `Run:<id>` | `failed_because` | literal | coexist | harness |
| repo | `Session:<id>` | `ended_at` | timestamp literal | functional | harness |
| lessons | `ErrorClass:<slug>` | `fixed_by` | literal approach | functional | promotion |
| lessons | `ErrorClass:<slug>` | `seen_in` | `Repo:<slug>` | coexist | promotion |
| lessons | `Tool:<name>` | `gotcha` | literal | coexist | promotion |
| lessons | `Approach:<slug>` | `worked_for` | literal situation | coexist | promotion |
| lessons | `Approach:<slug>` | `failed_for` | literal situation | coexist | promotion |
| hit | `Item:<key>` | `attempted_at` | timestamp literal | functional | watch |
| hit | `Item:<key>` | `outcome` | literal | functional | watch |
| hit | `Item:<key>` | `cooldown_until` | timestamp literal (transient/TTL) | functional | watch |
| hit | `Night:<date>` | `runs_count` | literal number | functional | watch |

Namespaces: `repo:<slug>` (slug = repo basename + short path hash), `lessons`
(cross-repo, durable), `hit` (harness ops, mostly transient). The harness
stamps the namespace on every write; the agent never chooses one.
