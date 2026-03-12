"""
Domain models for assistant actions. Strict Pydantic v2 schemas; no LLM or transport details.
All actions use a discriminated union on field "action". Unknown/extra fields fail validation.
"""
from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


# ---------------------------------------------------------------------------
# Individual action models. Required fields only; extra fields forbidden.
# ---------------------------------------------------------------------------


class ComposeEmailAction(BaseModel):
    """User intent: compose a new email."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["compose_email"] = "compose_email"
    to: str
    subject: str
    body: str


class SearchAction(BaseModel):
    """User intent: search or filter emails (Gmail query)."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["search"] = "search"
    query: str


class OpenEmailAction(BaseModel):
    """User intent: open a specific email by id."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["open_email"] = "open_email"
    email_id: str


class ReplyAction(BaseModel):
    """User intent: reply to an email."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["reply"] = "reply"
    email_id: str
    body: str


class ForwardAction(BaseModel):
    """User intent: forward an email with optional intro text."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["forward"] = "forward"
    email_id: str
    body: str


class NavigateAction(BaseModel):
    """User intent: switch view (inbox, sent, compose)."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["navigate"] = "navigate"
    view: Literal["inbox", "sent", "compose"]


class ShowMessageAction(BaseModel):
    """Return plain text to display in the assistant panel (e.g. summary, answer)."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["show_message"] = "show_message"
    content: str


class ConfirmAction(BaseModel):
    """Request user confirmation before a risky action (e.g. delete, mark spam)."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["confirm"] = "confirm"
    message: str
    payload: dict


# ---------------------------------------------------------------------------
# Discriminated union. Exactly one of the above; unknown action fails.
# ---------------------------------------------------------------------------

AssistantAction = Annotated[
    ComposeEmailAction
    | SearchAction
    | OpenEmailAction
    | ReplyAction
    | ForwardAction
    | NavigateAction
    | ShowMessageAction
    | ConfirmAction,
    Field(discriminator="action"),
]

_assistant_action_adapter: TypeAdapter[AssistantAction] = TypeAdapter(AssistantAction)


def parse_assistant_action(data: dict) -> AssistantAction:
    """
    Parse a dict into a validated AssistantAction. Raises ValidationError
    if action is unknown, required fields are missing, or extra fields present.
    """
    return _assistant_action_adapter.validate_python(data)
