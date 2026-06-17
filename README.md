# EcoQuest 🌱

A gamified web app that helps people reduce their carbon footprint. Users complete a lifestyle survey, get AI-generated personalized "missions," log eco-friendly actions, scan grocery receipts for carbon analysis, and watch a virtual plant grow as they earn XP and level up.

Built for a hackathon. Stack: **FastAPI + Supabase + LangGraph + Gemini** on the backend, **Next.js (App Router) + Tailwind** on the frontend.

---

## Features

- **Onboarding survey** — ~18 questions across transportation, diet, shopping, energy, and habits.
- **AI mission generation** — a LangGraph workflow estimates the user's CO₂ baseline (Climatiq API with a fallback estimator), classifies them as Beginner/Intermediate/Expert, identifies the highest-impact categories, and asks Gemini to produce 8–12 personalized, actionable missions.
- **Freeform activity logging** — type what you did ("took the bus to work"); Gemini parses and categorizes it, CO₂ savings are estimated, and XP is awarded.
- **Receipt scanner** — upload or photograph a grocery receipt; Gemini Vision extracts items, Climatiq estimates each item's footprint, and Gemini suggests lower-carbon alternatives you can commit to.
- **AI shopping assistant** — a streaming ReAct-style agent that builds a sustainable shopping list from your history, commitments, and seasonal produce.
- **Gamification** — XP, levels, streaks, and a 7-stage plant that grows from Seed to Forest Guardian.
- **Future Impact** — projects current vs. best-case CO₂ savings over 1 month / 6 months / 1 year, with a category breakdown and a shareable milestone card.

---

## Tech Stack

**Backend**
- FastAPI (Python 3.11)
- Supabase (Postgres) for data, Supabase Auth (JWT) for users
- LangGraph + LangChain for the mission-generation workflow and shopping agent
- Google Gemini (`gemini-2.5-flash` and `gemini-2.0-flash-lite`) for generation, parsing, and vision
- Climatiq API for carbon estimates
- `uv` for dependency management

**Frontend**
- Next.js (App Router, TypeScript)
- Tailwind CSS
- Recharts for impact charts, `html-to-image` for the shareable card
- Supabase JS client for auth

---

## Project Structure

```
backend/
  app/
    main.py                  # FastAPI app + router registration
    config.py                # Pydantic settings (env vars)
    database.py              # Supabase client
    game_mechanics.py        # XP, levels, plant-stage logic
    langgraph_workflow.py    # Mission generation graph
    routers/                 # survey, missions, activities, receipts, shopping, impact
    services/                # Climatiq, Gemini receipt parser, alternatives, shopping agent
frontend/
  app/                       # login, signup, survey, dashboard, missions,
                             # receipt-scanner, shopping-assistant, impact, profile
  lib/supabase.ts            # Supabase client + auth helpers
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project, a Google AI (Gemini) API key, and a Climatiq API key

### Backend

```bash
cd backend

# create your env file
cp .env.example .env
# then fill in the values (see below)

# install deps with uv
uv sync

# run the API (defaults to http://localhost:8000)
uv run uvicorn app.main:app --reload
```

`backend/.env` needs:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GOOGLE_API_KEY=your_gemini_api_key
CLIMATIQ_API_KEY=your_climatiq_api_key
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

`frontend/.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

The frontend currently calls the backend at `http://localhost:8000` (hardcoded), so start the backend first.

---

## API Overview

All authenticated routes expect an `Authorization: Bearer <supabase_jwt>` header.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/survey/` | Save survey responses |
| GET  | `/survey/` | Fetch the user's survey |
| POST | `/missions/generate` | Run the LangGraph workflow and create missions |
| GET  | `/missions/` | List the user's missions |
| GET  | `/missions/stats` | XP, level, plant, streaks, and impact equivalents |
| POST | `/activities/freeform` | Log a freeform eco action |
| POST | `/activities/complete-mission` | Mark a mission complete |
| GET  | `/activities/feed` | Recent activity feed |
| POST | `/receipts/scan-and-analyze` | Scan + analyze a receipt |
| POST | `/receipts/commitments` | Save alternative commitments |
| POST | `/shopping/generate-list` | Stream a generated shopping list |
| GET  | `/impact/projections` | Impact projections and breakdown |

---

## How It Works

### Mission generation
`survey → /missions/generate → LangGraph workflow`:
1. **Calculate CO₂** — Climatiq (with estimator fallback).
2. **Classify profile** — Beginner / Intermediate / Expert.
3. **Identify opportunities** — top 3 impact categories.
4. **Generate missions** — Gemini returns 8–12 missions; each is validated and sanitized before being stored.

### XP and plant stages
`game_mechanics.py` is the source of truth. XP scales with CO₂ saved and category; levels follow a `level × 60` threshold curve; plant stage is derived from level (Stage 1 ≤ L2, up to Stage 7 at L21+). Stats are recomputed from `total_xp` on read to stay consistent.

---

## Notes & Caveats

This was built under hackathon time pressure, so a few things are worth knowing:

- **Auth is not production-ready.** JWTs are decoded with `verify_signature=False`, and tokens are stored in `localStorage`. Fine for a demo, not for real users.
- **The backend URL is hardcoded** to `localhost:8000` across the frontend. Move it to an env var before deploying.

---
