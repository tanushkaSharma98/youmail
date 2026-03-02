# YouMail

A mail app with an **AI assistant** that turns natural language into UI actions: inbox, sent, compose, search, open email, reply, navigate. Backend is Python (Gmail API, FastAPI, gRPC); the assistant uses the Hugging Face Inference Providers API to map user messages to structured actions (e.g. “compose an email to X” → `compose_email` with to/subject/body).

---

## How to set it up and run it locally

### Prerequisites

- **Python 3.11+** (Poetry recommended)
- A **Google account** (for Gmail OAuth)
- A **Hugging Face account** (for the assistant; optional — backend runs without it but assistant will be disabled)

### 1. Clone and install

```bash
cd youmail
cd backend
poetry install
```

### 2. Environment variables

Copy the example env file and edit it:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at least:

- **Gmail (required for mail):**  
  `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` from [Google Cloud Console](https://console.cloud.google.com/) → your project → APIs & Services → Credentials → OAuth 2.0 Client ID (Desktop app).  
  See **backend/GMAIL_OAUTH_SETUP.md** for step-by-step (create project, enable Gmail API, OAuth consent screen, **add your Gmail as a test user**, create Desktop OAuth client, copy ID and secret).

- **Assistant (optional):**  
  `HF_API_TOKEN` — create a token at [Hugging Face → Settings → Access Tokens](https://huggingface.co/settings/tokens) with **Fine-grained** type and **“Make calls to Inference Providers”** enabled.  
  See **backend/ASSISTANT_SETUP.md** for details.

### 3. First run (Gmail OAuth)

```bash
cd backend
poetry run python main.py
```

On first run you’ll need to authorize Gmail: open the URL printed in the terminal in your browser, sign in with the Gmail you added as a test user, allow access. The token is stored in `backend/token.json` (gitignored).

### 4. Run the backend

```bash
cd backend
poetry run python main.py
```

- **REST API (Swagger):** http://localhost:8000/docs  
- **gRPC:** localhost:50051  

### 5. Try the assistant

In Swagger (http://localhost:8000/docs):

- Open **POST /assistant**.
- Body example:
  ```json
  {
    "message": "Compose an email to tanushka@gmail.com with subject Hello and body Hi there!",
    "current_view": null,
    "current_email_id": null
  }
  ```
- Execute. You should get **200** and a JSON action, e.g. `{"action": "compose_email", "to": "tanushka@gmail.com", "subject": "Hello", "body": "Hi there!"}`.

Other examples: “Show my inbox”, “Search for emails from john”, “Open the email with id xyz”, “Reply with Thanks!”.

---

## Real-Time Mail Sync

Real-time updates are implemented using **periodic polling (5 minutes)**. When the user is on the Inbox view, the app automatically refreshes emails.

In production, this can be upgraded to **Gmail Push Notifications** (watch API + Pub/Sub) for true event-driven updates.

---

## Architecture decisions and trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **REST + gRPC** | REST for Swagger and easy frontend/curl; gRPC for typed, efficient RPC if needed by other services. | Two surfaces to maintain; we share the same service layer under both. |
| **Env-based config only** | No `client_secret.json`; all secrets in `.env` (and token path for Gmail). Simpler and repo-safe. | Rotating secrets means editing `.env` and restarting. |
| **Hugging Face instead of OpenAI** | Avoids billing and quota issues on new accounts; HF Inference Providers offer a single token for many models. | Model quality and response shape vary; we had to adapt to router API (e.g. `output_text`, content as list) and token permissions. |
| **Structured actions (discriminated union)** | One LLM call returns a single, validated action (`compose_email`, `search`, `open_email`, `reply`, `navigate`). Pydantic with `extra="forbid"` keeps responses strict. | Single action per turn; no multi-step or chained actions without extra logic. |
| **No WebSockets / Kafka** | Scope kept to polling for “real-time” mail and request/response for assistant. | Real-time push (e.g. new mail badge) would require adding WebSockets or another channel later. |
| **Assistant optional at startup** | If `HF_API_TOKEN` is missing, backend still runs; `/assistant` returns 503 with a clear message. | No assistant until token is set and server restarted. |
| **Router API (router.huggingface.co)** | Old inference URL is deprecated (410); we use the Responses API and parse `output_text` (and list content parts). | We depend on HF’s response shape and permission model (“Make calls to Inference Providers”). |

---

## Screenshots / video demo (assistant controlling the UI)

*Add 1–2 screenshots or a short screen recording here. Suggested content:*

1. **Swagger:** **POST /assistant** with a natural language message (e.g. “Compose an email to …”) and the **200** response showing the structured action (e.g. `compose_email` with `to`, `subject`, `body`).
2. **Optional:** A simple frontend or script that calls **POST /assistant**, receives the action, and performs it (e.g. opens a compose view with the returned fields). A short Loom or similar video (< 1 min) is ideal.

**How to record a quick demo:** Use built-in screen recording (e.g. macOS QuickTime or Windows Xbox Game Bar) or [Loom](https://www.loom.com/). Show: (1) sending a message to `/assistant`, (2) the JSON response, (3) if you have a UI, the UI updating from that action.

*Placeholder: replace this paragraph with your screenshot(s) or link to video.*

---

## What we’d improve with more time

- **Frontend:** A React + Tailwind UI that uses the REST API for mail (inbox, sent, search, send, open email) and calls **POST /assistant**, then applies the returned action (compose modal, search results, open email, reply, navigation). Right now the backend is ready; no frontend exists.
- **Real-time mail updates:** Add polling (e.g. periodic inbox check) or WebSockets so the UI can show new mail or unread counts without full refresh.
- **Assistant:** Richer prompts and optional retries when the model returns invalid JSON; support for multiple or chained actions in one turn; optional streaming for long replies.
- **Observability:** Structured logging, request IDs, and optional metrics (e.g. assistant latency, error rates) for production.
- **Deployment:** Dockerfile and docker-compose, env-based config for staging/prod, and a short “run in production” section in the README.
- **Tests:** Unit tests for assistant parsing and LLM response handling; integration tests for mail and assistant endpoints against real or mocked Gmail/HF.

---

## Repo layout

```
youmail/
├── README.md                 # This file
└── backend/
    ├── main.py               # Entrypoint: config → wire → run HTTP + gRPC
    ├── core/                 # Config, exceptions, logging
    ├── clients/              # Gmail API, Hugging Face LLM
    ├── services/             # Mail, assistant
    ├── models/               # Email, assistant actions (Pydantic)
    ├── rpc/                  # gRPC protos and servicers
    ├── api/                  # FastAPI app and routes
    ├── scripts/              # e.g. generate_grpc.py
    ├── GMAIL_OAUTH_SETUP.md  # Gmail OAuth steps
    └── ASSISTANT_SETUP.md    # Hugging Face token for assistant
```

For more detail on the backend layout and gRPC codegen, see **backend/README.md**.
