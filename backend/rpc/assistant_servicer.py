"""
gRPC servicer for AssistantService. Transport only: calls AssistantService, returns action_json.
Error mapping: LLMError → UNAVAILABLE, AssistantParsingError → INVALID_ARGUMENT, other → INTERNAL.
"""
from __future__ import annotations

import logging

import grpc

from core.exceptions import AssistantParsingError, LLMError
from rpc.proto import assistant_pb2, assistant_pb2_grpc
from services.assistant_service import AssistantService

logger = logging.getLogger(__name__)


class AssistantServicer(assistant_pb2_grpc.AssistantServiceServicer):
    """Exposes AssistantService over gRPC. AssistantService injected; no global state."""

    def __init__(self, assistant_service: AssistantService) -> None:
        self._assistant = assistant_service

    def ProcessMessage(self, request, context):
        """Call assistant service; return serialized action JSON. Map errors to gRPC status."""
        try:
            action = self._assistant.process_message(
                message=request.message or "",
                current_view=request.current_view or None,
                current_email_id=request.current_email_id or None,
            )
            return assistant_pb2.AssistantResponse(
                action_json=action.model_dump_json()
            )
        except LLMError as e:
            context.abort(grpc.StatusCode.UNAVAILABLE, str(e))
            return None
        except AssistantParsingError as e:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(e))
            return None
        except Exception:
            logger.exception("Unexpected error in ProcessMessage")
            context.abort(grpc.StatusCode.INTERNAL, "Internal server error")
            return None
