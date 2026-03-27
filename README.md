# Solar Studio

A web-based interactive experience for exploring the solar system. Solar Studio combines a 2D visibility map with real-time weather data, a 3D solar system view with NASA JPL Horizons positions, and user-submitted observation reports.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet, React Three Fiber, Zustand

**Backend:** Python 3.12, FastAPI, Supabase (PostgreSQL + Auth), Astropy, Astroquery

**Deployment:** Vercel (frontend), Heroku (backend)

## Project Structure

```
solar-studio/
├── src/                    # Frontend source
│   ├── components/
│   │   ├── map/            # 2D Leaflet map, visibility overlays, Yallop layer
│   │   ├── scene/          # 3D solar system (React Three Fiber)
│   │   ├── nav/            # Navigation and sidebar
│   │   ├── ui/             # Shared UI components
│   │   ├── reports/        # Observation report submission
│   │   ├── logbook/        # Community observation log
│   │   ├── auth/           # Authentication forms
│   │   └── account/        # User account management
│   ├── services/           # API clients, interaction logger
│   ├── store/              # Zustand state management
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Visibility scoring, coordinate transforms
│   ├── __tests__/          # Frontend unit tests (Vitest)
│   └── types/              # TypeScript type definitions
├── backend/
│   ├── app/
│   │   ├── routers/        # FastAPI route handlers
│   │   ├── models/         # Pydantic models
│   │   ├── core/           # Config, dependencies
│   │   ├── refresh_*.py    # Scheduled data refresh scripts (planets, moons, events, forecast)
│   │   ├── etl.py          # JPL Horizons data pipeline
│   │   └── main.py         # FastAPI app entry point
│   ├── migrations/         # Supabase SQL migrations
│   └── tests/              # Backend unit tests (pytest)
├── scripts/                # Analysis and utility scripts
└── public/                 # Static assets, PWA manifest
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.12
- A Supabase project (free tier works)
- Weather data is fetched from Open-Meteo (no API key required)

### Frontend

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Start the dev server:

```bash
npm run dev
```

### Backend

1. Set up a Python virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Create `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=development
API_PREFIX=/api
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

3. Run database migrations against your Supabase project (via the Supabase dashboard SQL editor or CLI).

4. Start the backend:

```bash
uvicorn app.main:app --reload
```

### Database

The backend expects a Supabase project with tables created by the SQL migrations in `backend/migrations/`. Run these in order (001, 002, ...) through the Supabase SQL editor or the Supabase CLI.

## Scripts

```bash
npm run dev              # Start frontend dev server
npm run build            # Type-check and build for production
npm run test             # Run frontend tests (Vitest)
npm run test:watch       # Run frontend tests in watch mode
npm run lint             # Run ESLint
```

Backend:

```bash
cd backend
pytest                   # Run backend tests
uvicorn app.main:app     # Start API server
```

## Testing

- **Frontend:** 68 unit tests covering visibility scoring, Yallop crescent calculation, and coordinate transforms. Run with `npm test`.
- **Backend:** 77 unit tests covering API endpoints, data validation, event parsing, and cache behaviour. Run with `pytest` from the `backend/` directory.
