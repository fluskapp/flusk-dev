# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Active support  |
| < 0.1   | ❌ Not supported   |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Email **adir@flusk.app** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Impact assessment (what an attacker could achieve)
4. Any suggested fix or mitigation

### Response Timeline

| Stage              | Target          |
|--------------------|-----------------|
| Initial response   | Within 48 hours |
| Triage & severity  | Within 5 days   |
| Fix for critical   | Within 7 days   |
| Fix for non-critical | Within 30 days |

We will keep you informed throughout the process and credit reporters (unless anonymity is requested).

## Responsible Disclosure Policy

- Please allow us reasonable time to fix the issue before public disclosure.
- We will not take legal action against researchers who follow this policy.
- If you are unsure whether a bug qualifies as a security issue, err on the side of reporting it privately.

## Scope

The following components are in scope:

- Flusk server (`packages/execution/`)
- OTel package (`packages/otel/`)
- SDK (`packages/sdk/`)
- Docker images and compose files
- CLI (`packages/cli/`) — particularly code generation and file writes

Out of scope:

- Third-party dependencies (report upstream)
- The documentation website

## Security Measures in Place

- **HMAC authentication** — API requests are authenticated using HMAC signatures
- **Rate limiting** — All endpoints are rate-limited to prevent abuse
- **Parameterized queries** — All database queries use parameterized statements to prevent SQL injection
- **Helmet** — HTTP security headers are set via `@fastify/helmet`
- **Input validation** — All request payloads are validated against TypeBox schemas
- **No secrets in generated code** — Generated files never contain credentials or API keys
