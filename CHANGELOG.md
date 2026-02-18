# Changelog

## v0.3.0 (Unreleased)

### Features
- `flusk explain` — AI-powered cost optimization advisor with code suggestions
- GitHub Action for automated PR cost comments
- Azure OpenAI provider (8 models)
- Cohere provider (7 models)
- 3 new generators: command, prompt, action
- Updated OpenAI pricing (gpt-4.1 family, o1-pro, o3)

### Bug Fixes
- Python __init__.py exports fixed
- Analyze command OTel shutdown fix (was reporting 0 calls)
- CI lint errors in generators resolved
- 32 repository files regenerated with proper markers

### Stats
- 24 generators
- 5 providers (OpenAI, Anthropic, Google, Azure OpenAI, Cohere)
- 17 entities with full TS + Python parity
- 385+ tests passing
- 165+ enforced generated files
