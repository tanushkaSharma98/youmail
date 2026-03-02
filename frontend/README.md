# YouMail Frontend

React + Tailwind + Lucide icons. 4-column layout: Sidebar, Email list, Email detail, AI Assistant. Inbox, email detail, and compose send use the backend API (Phase 2A).

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (or the URL Vite prints). Ensure the backend is running (e.g. `cd backend && poetry run python main.py`). API base URL defaults to `http://localhost:8000`; override with `VITE_API_URL` in a `.env` file (e.g. `VITE_API_URL=http://localhost:8000`).

## Build

```bash
npm run build
```

Output in `dist/`.

## Structure

```
frontend/
├── src/
│   ├── components/   # Sidebar, EmailList, EmailDetail, ComposePanel, AssistantPanel
│   ├── layout/       # MainLayout
│   ├── data/         # dummyEmails (static data)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
└── package.json
```
