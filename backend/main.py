"""
Application entrypoint: load config, wire dependencies, start HTTP and gRPC servers.
"""
from __future__ import annotations

import sys
import threading
from pathlib import Path

# Ensure backend root is on path for imports
BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Load .env before importing config
try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_ROOT / ".env")
except ImportError:
    pass

from api.app import create_app
from clients.gmail_client import GmailClient
from clients.llm_client import LLMClient
from core.config import GmailConfig, LLMConfig, ServerConfig
from core.exceptions import InvalidConfigError
from core.logging_config import get_logger, setup_logging
from rpc.server import create_and_start_grpc_server
from services.assistant_service import AssistantService
from services.mail_service import MailService

logger = get_logger(__name__)


def _run_http(app, config: ServerConfig) -> None:
    import uvicorn
    uvicorn.run(
        app,
        host=config.host,
        port=config.port_http,
        log_level="info",
    )


def main() -> int:
    """Validate config, build dependencies, start FastAPI and gRPC."""
    setup_logging()

    try:
        gmail_config = GmailConfig.from_env()
        server_config = ServerConfig.from_env()
    except InvalidConfigError as e:
        logger.error("Invalid config: %s", e)
        return 1

    client = GmailClient(gmail_config)
    mail_service = MailService(client)

    assistant_service = None
    try:
        llm_config = LLMConfig.from_env()
        llm_client = LLMClient(
            token=llm_config.token,
            model_id=llm_config.model_id,
            timeout_sec=llm_config.timeout_sec,
        )
        assistant_service = AssistantService(llm_client)
    except InvalidConfigError as e:
        logger.warning("Assistant disabled: %s", e)

    app = create_app(mail_service, assistant_service=assistant_service)
    grpc_server = create_and_start_grpc_server(
        mail_service, server_config, assistant_service=assistant_service
    )

    logger.info(
        "FastAPI (Swagger): http://%s:%s/docs",
        server_config.host,
        server_config.port_http,
    )
    logger.info("gRPC: %s:%s", server_config.host, server_config.port_grpc)

    http_thread = threading.Thread(
        target=_run_http,
        args=(app, server_config),
        daemon=True,
    )
    http_thread.start()

    try:
        grpc_server.wait_for_termination()
    except KeyboardInterrupt:
        grpc_server.stop(0)
    return 0


if __name__ == "__main__":
    sys.exit(main())
