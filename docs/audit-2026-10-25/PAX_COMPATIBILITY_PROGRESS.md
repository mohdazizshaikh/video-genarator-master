# Bounded PAX compatibility — nineteenth increment

The shared full-archive reader now accepts a restricted per-entry PAX (`x`) header in addition to USTAR. PAX records use byte-counted framing, including the final newline, as specified by the [POSIX draft pax format](https://www.open-std.org/jtc1/sc22/open/n4217.pdf). Per-entry metadata applies to exactly one following payload or directory; dangling/chained headers and duplicate attribute keys are rejected. Effective paths and sizes go through the existing containment, identity, payload-boundary, checksum and exact-inventory gates.

## Supported scope

- UTF-8 path overrides, capped at 4096 bytes, and decimal size overrides inside the overall 100 GiB archive bound. Valid USTAR envelope fields remain required.
- Selected standard timestamps, owner/group names and identifiers are parsed but never applied to restored files. Existing 0600 file permissions remain.
- Known LIBARCHIVE/SCHILY extended-attribute and ACL metadata is framed and discarded without decoding binary values or applying attributes. The libarchive writer's [implementation](https://raw.githubusercontent.com/libarchive/libarchive/master/libarchive/archive_write_set_format_pax.c) is a primary reference for these vendor encodings. No attribute can change file type, destination, permissions or content.
- Each local metadata payload is capped at 1 MiB and 256 records. Attribute names are bounded and validated; UTF-8 text fields and decimal overrides are checked. All archive headers now share the 100,000-header limit.

Full backup creation now requests PAX explicitly, enabling long UTF-8 paths, and sets COPYFILE_DISABLE for tar so macOS AppleDouble payload files are not introduced outside the manifest. This variable is ignored by platforms that do not use that macOS mechanism. The independently generated system-tar test also exercises real PAX output instead of relying only on the hand-built fixtures.

## Retained restrictions and limits

Global PAX headers, GNU long-name/link records, sparse instructions, binary filename charsets, unknown attributes, duplicate keys, chained local headers and non-octal USTAR numeric envelopes remain rejected. This is not complete PAX/TAR format coverage. Large-file representation variants still require independent acceptance tests; a size override test is not an 8+ GiB recovery rehearsal. Control characters in effective paths are now rejected for USTAR and PAX alike.

Unlisted AppleDouble files in older macOS archives still fail exact inventory checks. They are not silently discarded because their names alone do not prove they are metadata. Recovery of those legacy archives requires a separately reviewed compatibility path. Unknown metadata or legitimate archives exceeding the declared bounds may also fail closed. Restored extended attributes, ACLs, ownership, execution bits and timestamps are intentionally outside this data-file recovery contract.

The existing CBC format still lacks authenticated encryption, sidecars/manifests remain unsigned, and off-host recovery, original-source completeness, trusted frozen directories, cross-process race resistance, fsync durability and deployed RPO/RTO acceptance remain open. No actual project-data backup, restore, migration, container pause or external provider action occurred; all recovery fixtures are temporary. No phase is complete.

## Verification

- Production verification passed backend typecheck, **650 tests across 119 files**, production build and AST/build consistency for **351 registrations across 46 routers**.
- Final focused recovery regressions: **74 passed**, including 32 added cases covering byte-counted UTF-8 records, effective size/path overrides, one-entry scope, duplicates, malformed lengths/boundaries, binary vendor metadata, unknown/sparse/global attributes, limits, long-name creation/recovery and independent system-tar PAX output.
- Changed scripts/test ESLint and scoped whitespace checks passed. The focused suite was rerun after replacing control-character regular expressions with equivalent character-code predicates to meet ESLint. Full-repository lint remains an open baseline.
- Saved logs and source hashes are under `implementation-evidence/pax-compatibility-*`. Initial independent tests exposed macOS binary provenance metadata and AppleDouble extras; final tests preserve the exact-inventory gate, suppress extras during new creation and explicitly reject unlisted legacy extras.
