# Tech Debt

## Known Issues
- [ ] 2 integration tests fail without running DB (pre-existing)
- [ ] `scripts/seed.sh` references old API endpoints
- [ ] `uuid_generate_v4()` in migrations requires uuid-ossp extension
      (could use `gen_random_uuid()` which is built-in since PG 13)
- [ ] Generator gaps documented in CLAUDE.md (repo template, route
      template, barrel updater)

## Debt from Pivot
- [ ] Postgres repositories and SQLite repositories share no interface
      yet — need abstract Storage layer
- [ ] `--require` still referenced in some places (should be `--import`)

## Cleanup Done
- [x] Removed .fluskrc.json (Feb 13)
- [x] Removed .claude/ snapshots (Feb 13)
- [x] Removed outdated scripts (Feb 13)
- [x] Replaced console.log with @flusk/logger (Feb 13)
- [x] Full docs rewrite (Feb 13)
