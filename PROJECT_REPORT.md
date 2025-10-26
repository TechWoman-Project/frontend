# TechWoman Frontend — Project Report

This report summarizes the implemented features, architecture decisions, and improvements across the TechWoman frontend (Next.js + Supabase). The birthday cake page is intentionally excluded from this report.

## Overview

- Framework: Next.js (App Router) with TypeScript
- Styling: CSS Modules and utility styles
- Backend: Supabase (PostgreSQL + Realtime)
- Hosting: Netlify config present
- Linting/Build: ESLint, Turbopack dev, Next build

Key user experiences:

- Quiz gameplay with scoring and timing
- Opinion voting (separate from quizzes)
- Live vote results with smooth animations
- Administration to manage quizzes/opinions and options
- Leaderboard with score and time-based tie-breaks

## Application Structure

- `src/app` — App Router routes
  - `/` — Landing page
  - `/quiz` — Quiz gameplay (dynamic from Supabase)
  - `/vote` — Opinion voting (anonymous)
  - `/vote-result` — Live opinion results
  - `/dashboard/[id]` — Dashboard client route
  - `/admin` — Admin tools for creating and managing quizzes/opinions
  - `/leaderboard` — Scores ranking (top 3 podium UI)
- `src/components` — Reusable UI: `Logo`, `Footer`, `HomeLanding`, realtime helpers
- `src/lib` — Supabase client setup (`supabase.ts`, browser/server wrappers)
- `public/assets` — Images (logo, timer, bravo, etc.)
- Config: `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `netlify.toml`
- Docs: `REALTIME_SETUP.md`, `REALTIME_TESTING.md`, `SMOOTH_ANIMATIONS.md`, `DEPLOYMENT.md`, `MIGRATION_GUIDE.md`

## Data Model (Supabase)

Core tables leveraged:

- `quizzes`: Holds both quizzes and opinions via `kind` column (`quiz` | `opinion`), plus `status` and metadata
- `options`: Possible answers/options for each quiz/opinion; includes `order_index` and `is_correct` (for quizzes)
- `votes`: Records a user’s selection (by `quiz_id`, `option_id`, `user_name`/anon id)
- `scores`: Aggregated per-user points for quizzes (used in leaderboard)

Realtime publication is enabled on relevant tables (see `enable-realtime.sql`).

## Feature Details

### 1) Quiz Gameplay (`/quiz`)

- Dynamic fetching of active questions and options from Supabase.
- Correct-answer scoring standardized at 10 points per question.
- Per-question timing with a visible progress bar.
- Name prompt validation improved (no double prompt; enforces first+last name).
- Vote record insertion for each answered question to `votes` table.
- Final score upserted in `scores` with a session key.
- Realtime-aware refresh preserves progress: if quizzes/options change while playing, the current question, selection (if still valid), and remaining timer are preserved.
- Completion persistence: once finished, a local completion flag shows the finish screen immediately on return (no refetch).
- Accessibility: keyboard selection (Enter/Space), ARIA roles, and pressed state.

### 2) Opinion Voting (`/vote`)

- Lists active opinions (quizzes with `kind='opinion'`).
- Anonymous participant id stored in `localStorage` (no prompt).
- Realtime sync for quiz and options changes.
- Important fix: after a realtime refresh, the page no longer jumps back to the first opinion. The current index and state are preserved.
- Smooth navigation: after a choice, advances to the next opinion and shows a thank-you screen at the end.

### 3) Live Vote Results (`/vote-result`)

- Realtime updates driven purely by Supabase (polling removed).
- Incremental updates: only changed options/quizzes are updated in state (no full re-fetch per event).
- Smooth animated bars for results; optimized to avoid re-render flashes.
- Connection gating: the page only renders the results once the realtime channel is `SUBSCRIBED` (prevents flicker/stale state).
- Optional debug/status components available (`RealtimeStatus`, `RealtimeTest`).

### 4) Admin Panel (`/admin`)

- Create and manage both standard quizzes and opinions via a `kind` selector.
- Conditional UI: correct answer inputs only for real quizzes; opinions skip correctness.
- Supports option ordering and labeling.

### 5) Leaderboard (`/leaderboard`)

- Aggregates `scores` by `user_name`.
- Ranking logic:
  1. Higher total score first
  2. If scores tie: earlier completion wins (based on earliest available timestamp)
  3. Stable fallback order if timestamps are missing
- Performance: realtime subscription removed; the page fetches once per visit.
- UI simplified to an enlarged, animated podium-only view for the top 3.

## Realtime Integration

- Supabase realtime channels created for `quizzes`, `options`, and `votes` as needed.
- Event filters are applied where possible to reduce noise (e.g., only `kind='opinion'`).
- Gating: certain screens render only after realtime connection to avoid hydration or flicker.
- Publication configuration is captured in `enable-realtime.sql` and documented in `REALTIME_SETUP.md`.

## UX and Performance Improvements

- Eliminated unnecessary polling in favor of realtime.
- Preserved progress across data refreshes (both in `/vote` and `/quiz`).
- Added animated visual feedback (progress bars, podium animations).
- Reduced rerenders via incremental update patterns and state scoping.
- Removed realtime from leaderboard to keep the page fast and quiet.

## Accessibility

- Buttons and selectable options use proper roles and keyboard handlers.
- ARIA attributes for progress and pressed states.
- Text alternatives on images and icons where practical.

## Configuration & Scripts

- `.env.local` for Supabase keys/configs (not committed).
- Netlify deploy config in `netlify.toml`.
- ESLint configured via `eslint.config.mjs`.
- Next.js configuration tuned (`next.config.ts`).

## Known Limitations / Considerations

- The leaderboard relies on timestamps present in `scores` for time-based tie-breaks; if absent for all users, a stable fallback (insertion order for this session) is used.
- Images use `<img>` tags in some routes; Next’s `<Image />` could optimize LCP, at the cost of config and potential external hosts.
- Debug components (RealtimeTest) should be hidden for production as needed.

## Possible Next Steps

- Add a manual refresh button on leaderboard or a periodic, low-frequency refresh.
- Migrate images to Next `<Image>` for better performance.
- Expand admin capabilities: bulk import, reordering, and draft/publish workflows.
- Add unit/UI tests for critical flows (quiz progression, vote updates, leaderboard ranking).
- Add server-side guards/row-level security checks in Supabase as required.

## File Pointers

- Quiz: `src/app/quiz/quizPage.tsx`
- Opinion voting: `src/app/vote/page.tsx`
- Vote results (live): `src/app/vote-result/page.tsx`
- Admin: `src/app/admin/page.tsx`
- Leaderboard: `src/app/leaderboard/page.tsx`, `leaderboard.module.css`
- Supabase client: `src/lib/supabase.ts`
- Realtime helpers: `src/components/RealtimeStatus.tsx`, `src/components/RealtimeTest.tsx`

---

This report covers the primary features and changes implemented in the TechWoman frontend app, excluding the birthday cake demo page.
