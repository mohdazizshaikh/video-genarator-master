# Human Engine and Editorial Quality Control

The Human Engine is the human-in-the-loop quality authority for generated content. It does not attempt to conceal AI origin or bypass platform detection. Its purpose is to turn automated drafts into factual, original, category-fit, reviewable content and to prevent an automated check from becoming an unauthorized publishing decision.

## Decision model

| Decision | Meaning | Next action |
|---|---|---|
| `blocked` | Moderation or critical safety failure | Stop processing and require revision |
| `needs_revision` | Missing source evidence, duplicate signals, repeated media/captions, or production quality issue | Revise and run review again |
| `ready_for_human_review` | Automated checks are clear enough for a human review | Submit to approval queue; do not publish automatically |

The editorial review combines moderation, category-sensitive source requirements, title/script similarity, repeated caption-line detection, repeated media-ID detection, audio presence, short/long duration bounds, and optional visual/audio quality scores. It returns a deterministic review object containing the decision, score, reasons, suggestions, and a reviewer checklist.

## Approval safety

Automated checks are advisory only. Even when all automated checklist items pass, the approval item remains `pending` until an authorized human explicitly approves it. The review endpoint requires `release:approve`, `workspace:admin`, or `admin` permission, and all records remain workspace-scoped. Human approval also requires the mandatory approval checklist to be explicitly passed.

The explicit release gate remains separate and authoritative: a release must be approved before a verified connector target can be queued. The Telegram publisher therefore cannot be reached from a generated draft or an automated editorial pass alone.

## API

`POST /api/approval/editorial-review` accepts an authenticated workspace request with `category`, `title`, and `script`, plus optional `sources`, `mediaAssetIds`, `captionLines`, `hasAudio`, `durationSeconds`, `videoType`, `visualQualityScore`, and `audioQualityScore`. The server injects the authenticated workspace identity and returns the editorial review result.

## Category responsibilities

News, finance, health, science, marketing, and IT-service content require an HTTP source URL before reaching human review. Every category still requires a human to verify the material claims, category/overlay fit, captions, narration, safe areas, media reuse, and the absence of fabricated testimonials, ratings, outcomes, scores, or personal experiences.

## Scope boundary

The existing `HumanMimicryEngine` is not treated as an editorial-quality system. Schedule jitter, hashtag ordering, or posting-time variation cannot prove originality or human authorship. Editorial originality means source-grounded wording, a distinct angle, varied structure, non-repeated media, and reviewer-confirmed quality. AI-assisted origin must not be concealed where disclosure is required.

## Validation status

The Human Engine unit tests cover source requirements, review readiness, repeated media/captions, automated approval prevention, mandatory checklist enforcement, and successful authorized approval. TypeScript and the full repository suite pass. Scheduler-driven source intake and automatic creation of review-ready content remain a separate integration milestone; the scheduler must stop at the approval gate and must not auto-publish.
