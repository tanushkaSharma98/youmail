"""
gRPC server lifecycle. Registers MailServicer and optionally AssistantServicer.
Dependencies injected; server does not instantiate clients or read env.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import TYPE_CHECKING

import grpc

from core.config import ServerConfig
from rpc.proto import assistant_pb2_grpc, mail_pb2_grpc
from rpc.servicer import MailServicer
from services.mail_service import MailService

if TYPE_CHECKING:
    from services.assistant_service import AssistantService

logger = logging.getLogger(__name__)


def create_and_start_grpc_server(
    mail_service: MailService,
    config: ServerConfig,
    assistant_service: AssistantService | None = None,
) -> grpc.Server:
    """
    Build server, register MailServicer, optionally register AssistantServicer.
    Caller must wait_for_termination. No LLM or env access here.
    """
    server = grpc.server(ThreadPoolExecutor(max_workers=4))
    mail_pb2_grpc.add_MailServiceServicer_to_server(
        MailServicer(mail_service), server
    )
    if assistant_service is not None:
        from rpc.assistant_servicer import AssistantServicer
        assistant_pb2_grpc.add_AssistantServiceServicer_to_server(
            AssistantServicer(assistant_service), server
        )
    server.add_insecure_port(f"{config.host}:{config.port_grpc}")
    server.start()
    logger.info("gRPC server listening on %s:%s", config.host, config.port_grpc)
    return server
