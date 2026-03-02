# YouMail Backend

Production-style backend: Gmail API, gRPC, FastAPI (Swagger), optional AI assistant (Hugging Face). Clean layout and dependency injection.

**Setup and run:** See the main [README](../README.md) at the repo root for full local setup, Gmail OAuth, and Hugging Face assistant token.

## Layout

```
backend/
├── core/           # config, logging, domain exceptions
├── clients/        # Gmail API client, LLM client (Hugging Face router)
├── services/       # mail business logic, assistant service
├── models/         # domain models (Email, assistant actions)
├── rpc/            # gRPC proto + servicer + server
├── api/            # FastAPI app and routes
├── scripts/        # e.g. generate_grpc.py
└── main.py         # entrypoint: config → wire → run HTTP + gRPC
```

## Quick run

```bash
cd backend && poetry install
cp .env.example .env   # then set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, optional HF_API_TOKEN
poetry run python main.py
```

- Swagger: http://localhost:8000/docs  
- gRPC: localhost:50051  

## Regenerate gRPC code

After editing `rpc/proto/*.proto`:

```bash
poetry run python scripts/generate_grpc.py
```
