# Outbound security implementation increment

Implemented 2026-10-25, findings A07, A08 and A30. These findings remain `implemented_unverified` until their full acceptance criteria are met.

- Webhook create, update and every dispatch resolve and reject unsafe addresses. Every DNS answer must be public and its declared family must match the address. IPv6 transition and non-global ranges are rejected conservatively.
- Native HTTPS connects to the validated IP with the original Host and TLS servername. Default certificate verification remains enabled; no proxy or redirect support is enabled. Provider webhook host/path constraints apply. User-controlled routing headers are rejected. Dispatch has a 10-second deadline and 1 MiB request/response bounds.
- Webhook updates allowlist editable fields, preserving ownership, identity and server counters. A selected test bypasses subscription/enabled filtering only for that webhook; configuration is never temporarily enabled. Unsupported channels fail explicitly.
- Webhook configuration is encrypted at rest using existing AES-256-GCM CryptoService and TENANT_KEYS_SECRET. Writes use unique temporary files, mode 0600 and rename. Missing keys, corrupt stores and decryption failures throw instead of resetting data. Existing plaintext arrays are read for compatibility and encrypted on the next successful save. API masking is retained and provider errors are sanitized before logs/results.
- RSS validation and subsequent fetches share a public-IP policy and pinned transport. HTTP remains supported for existing public feed sources. Redirects and compressed responses are rejected, total request deadline is 10 seconds, XML input is limited to 2 MiB. XML parsing uses fetched text rather than an unvalidated parser URL request.

## Operational compatibility

Retain the same TENANT_KEYS_SECRET across restarts and backups. Once the encrypted file is written, older application versions that expect a JSON array cannot read it. Roll back using a matching application version or decrypt with the retained key through a reviewed migration; do not delete an unreadable store. This increment has not changed any real deployment data or run a production migration.

Feed servers requiring redirects or compressed-only responses now fail explicitly; source compatibility needs browser/provider acceptance. Provider DNS resolution is also required when creating or editing hooks. No notification was sent to a live destination during these checks.

## Acceptance still open

Browser create/edit/test/error workflows; provider compatibility; key rotation/export/rollback tooling; production key migration/export/rollback rehearsal; isolated legacy encryption and corrupt-store tests were added in the third increment; multi-process store consistency and config/log transactional writes; cancellation integration and broader transport fault injection. Deadline and oversized response regression coverage was added in the third increment. Legacy plaintext remains until the next save and needs an explicit operational migration before claiming encryption coverage of existing deployments. Historical logs are not rewritten by this increment. Typed validation errors now return HTTP 400 and webhook UI requests check non-success responses; browser acceptance remains open.

## Evidence

See implementation-evidence/outbound-targeted-tests.log, outbound-production-verification.log and outbound-lint.log. Targeted tests cover pinned Host/SNI, mixed/private DNS, family mismatch, IPv6/NAT64, provider spoofing, redirects, protected headers, redaction, create/update rejection without disk mutation, encrypted reload, wrong-key preservation, immutable ownership, selected disabled hook dispatch and RSS private/redirect rejection.


See [SCHEDULER_AND_WEBHOOK_PROGRESS.md](SCHEDULER_AND_WEBHOOK_PROGRESS.md) for the subsequent implementation and evidence.
