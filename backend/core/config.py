"""
Configuration loaded from environment. Validated at startup; no hardcoded defaults for secrets.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from core.exceptions import InvalidConfigError


@dataclass(frozen=True)
class GmailConfig:
    """Gmail OAuth and token paths. All from env."""

    client_id: str
    client_secret: str
    token_path: Path

    @classmethod
    def from_env(cls) -> GmailConfig:
        client_id = (os.environ.get("GMAIL_CLIENT_ID") or "").strip()
        client_secret = (os.environ.get("GMAIL_CLIENT_SECRET") or "").strip()
        if not client_id or not client_secret:
            raise InvalidConfigError(
                "GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env. "
                "Get them from Google Cloud Console → Credentials → OAuth 2.0 Client ID."
            )
        token_path_str = (os.environ.get("GMAIL_TOKEN_PATH") or "").strip()
        if token_path_str:
            token_path = Path(token_path_str)
        else:
            token_path = Path(__file__).resolve().parent.parent / "token.json"
        return cls(client_id=client_id, client_secret=client_secret, token_path=token_path)


@dataclass(frozen=True)
class ServerConfig:
    """HTTP and gRPC server bindings."""

    host: str
    port_http: int
    port_grpc: int

    @classmethod
    def from_env(cls) -> ServerConfig:
        host = os.environ.get("HOST", "0.0.0.0")
        try:
            port_http = int(os.environ.get("PORT_HTTP", "8000"))
            port_grpc = int(os.environ.get("PORT_GRPC", "50051"))
        except ValueError as e:
            raise InvalidConfigError(f"Invalid port in env: {e}") from e
        return cls(host=host, port_http=port_http, port_grpc=port_grpc)


@dataclass(frozen=True)
class LLMConfig:
    """Hugging Face token and model. From env; required for assistant."""

    token: str
    model_id: str
    timeout_sec: float

    @classmethod
    def from_env(cls) -> LLMConfig:
        token = (os.environ.get("HF_API_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN") or "").strip()
        if not token:
            raise InvalidConfigError(
                "HF_API_TOKEN must be set in .env for the assistant. "
                "Get a free token at https://huggingface.co/settings/tokens"
            )
        model_id = (os.environ.get("HF_MODEL_ID") or "meta-llama/Llama-3.2-3B-Instruct").strip()
        timeout_sec = 60.0
        try:
            if t := os.environ.get("LLM_TIMEOUT_SEC"):
                timeout_sec = float(t)
        except ValueError:
            pass
        return cls(token=token, model_id=model_id, timeout_sec=timeout_sec)
