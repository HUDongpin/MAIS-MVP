# S17 Reward Economy Balance Report

- Date: 2026-05-15
- Session ID: S17
- Scope: Gamification core MVP for MAIS-MVP

## Economy Model

MAIS now uses two balances:

- Growth XP: non-spendable progress toward levels. XP is never reduced by gift redemption.
- Reward points: spendable points used for teacher-approved gift requests.

Default economy version: `gamification-core-v1`.

## Earning Rules

| Signal | XP | Reward points | Notes |
| --- | ---: | ---: | --- |
| Complete a lesson | 90 | 40 | Awarded once per lesson source key. |
| Strong practice accuracy | 70 | 30 | Existing MVP threshold remains: 5 same-day topic attempts with at least 80% correct. |
| Learning streak | 60 | 25 | Existing MVP trigger remains: first three-day streak. |
| Visualization complete | 45 | 20 | Awarded once per visualization module. |
| Mistake review | 35 | 15 | Awarded once per reviewed mistake source key. |
| Teacher award | 2 XP per point | Teacher-selected amount | Subject to daily teacher manual cap. |
| Daily quest | 35-60 | 10-15 | Quest progress is shown in the student Motivation Hub. |

## Balance Targets

| Target | Setting |
| --- | --- |
| Expected steady learner weekly points | 120-180 |
| Daily XP cap | 420 |
| Daily reward point cap | 160 |
| Teacher manual daily point cap | 120 |
| Basic stationery affordability | 1-2 steady weeks |
| Premium reward affordability | 6-8 steady weeks |

## Anti-Abuse Rules

- Source-key idempotency prevents duplicate awards for the same lesson, visualization, mistake review, or practice milestone.
- Daily XP and reward-point caps limit repeated high-volume behavior.
- Teacher manual awards are capped per student per day.
- Capped or flagged events are written to the gamification ledger for teacher visibility.
- Class leaderboard uses weekly XP, not spendable balance, so redeeming gifts does not punish ranking.

## Product Defaults

- Leaderboards are class-only and weekly-only for the MVP.
- Rank order uses weekly XP, then streak days, then badge count, then student name.
- Parent reports emphasize celebration and the next calm action, not rank pressure.
- Reward campaigns start active by default and use the standard daily quest set unless the teacher config is expanded later.

## Owner Decisions Needed Later

- Whether physical reward costs should stay fixed or become teacher-configurable by class.
- Whether daily quests should be claim-based or automatically awarded when complete.
- Whether parent reports should hide leaderboard context entirely for younger primary grades.
