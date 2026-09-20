# Advanced Overlay Systems

## Overview

The platform now has two advanced overlay systems in addition to the reserved News and Marketing treatments. The first is a flexible **Advanced Knowledge Overlay** for trends, technology, gyan, educational facts, quotes, shayeries, general explainers, and motivation. The second is a dedicated **Sports Overlay** for cricket, football, basketball, tennis, and related sports content.

The overlays are not simple recolors of the old newsroom design. They use different hierarchy, motion, metadata, and caption relationships.

| Overlay | Primary categories | Visual identity | Best use |
|---|---|---|---|
| Advanced Knowledge | Tech, Education, Science, Motivation, General, Finance, Health, Food, Travel, Entertainment, Gaming, Beauty, Parenting | Glass knowledge card, accent rail, progress rail, short category label, calm motion | Facts, trends, explainers, quotes, shayeries, gyan, motivation |
| Sports | Sports and sport-specific subcategories | Sport label, event context chip, play-by-play progress, energetic entrance, score-safe metadata slots | Cricket, football, basketball, tennis, match analysis, highlights, training |

## Advanced Knowledge Overlay

The Knowledge overlay keeps the visual focus on the idea rather than presenting a newsroom headline. It supports short facts, technology insights, educational explanations, trend summaries, motivational copy, and quote-like lines. The profile changes its label and tone according to the category, but the composition remains consistent enough for the audience to recognize the platform.

It uses a small category marker in the upper rail, an accent progress rail, a vertical accent bar, a translucent knowledge card, and a restrained lower-third. Captions remain sentence case by default and are not forced into an all-caps ticker style. Motivation and General content receive a quote-oriented label, while Tech, Education, and Science receive an insight/explainer label.

## Sports Overlay

The Sports overlay is intentionally separate. It detects common sport context from the scene subcategory and headline, including cricket, IPL, wickets, football, soccer, goals, basketball, NBA, hoops, and tennis. It shows a sport label, scene progress, event-context chip, headline, and play-by-play marker.

Scores, player names, teams, dates, standings, and match results must come from scene metadata supplied by the content pipeline. The overlay contains no generated score or fabricated player data. If those fields are absent, the overlay remains a clean highlight or analysis card rather than inventing match information.

## Routing rules

`News` is the only category routed to `NewsOverlay`. `Marketing` and `Business` use the brand presentation path. `Sports` uses `SportsOverlay`. All other non-news categories use `AdvancedKnowledgeOverlay`, with their own category profile controlling color, music mood, media vocabulary, pacing intent, CTA style, and prohibited terms.

The queue persists the canonical category and resolved `contentTemplate`. Explicit per-job template overrides remain supported, but a missing template no longer causes a silent News fallback.

## Safety and quality rules

The Knowledge overlay must not turn an unsupported claim into a visual guarantee. Finance, Health, Beauty, and Fitness content must preserve the relevant cautionary language. Marketing content must use only approved factual claims and must never fabricate testimonials, ratings, or customer outcomes.

Sports content must remain evidence-based. A visual highlight can be energetic, but the system must not add a score, result, athlete identity, tournament status, or breaking-news label unless the source data explicitly provides it.

## Implementation

The overlay components are located at `src/components/videos/AdvancedKnowledgeOverlay.tsx` and `src/components/videos/SportsOverlay.tsx`. Category routing is defined in `src/components/videos/CategoryPipelineProfiles.ts` and selected by `src/components/videos/PortraitVideo.tsx`. The old `NewsOverlay` remains available only for the News profile.

## Validation status

TypeScript validation passes. The focused category and template suites pass with 15 tests. Representative rendered samples for knowledge, sports, and marketing content remain the final visual validation gate before enabling automated releases for those profiles.
