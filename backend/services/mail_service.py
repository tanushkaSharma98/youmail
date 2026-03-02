"""
Mail business logic: map Gmail raw responses to domain Email. No transport or API details.
"""
from __future__ import annotations

import base64
import logging
from typing import Any

from clients.gmail_client import GmailClient
from core.exceptions import GmailAPIError
from models.email import Email

logger = logging.getLogger(__name__)


def _header(msg: dict[str, Any], name: str) -> str:
    headers = msg.get("payload", {}).get("headers", [])
    for h in headers:
        if (h.get("name") or "").lower() == name.lower():
            return (h.get("value") or "").strip()
    return ""


def _plain_body(payload: dict[str, Any]) -> str:
    if payload.get("body", {}).get("data"):
        data = payload["body"]["data"]
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    for part in payload.get("parts", []):
        if part.get("mimeType") == "text/plain" and (part.get("body") or {}).get("data"):
            data = part["body"]["data"]
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    return ""


def _raw_to_email(msg: dict[str, Any]) -> Email:
    payload = msg.get("payload", {})
    label_ids = msg.get("labelIds", [])
    return Email(
        id=msg.get("id", ""),
        sender=_header(msg, "From"),
        subject=_header(msg, "Subject"),
        snippet=msg.get("snippet", ""),
        body=_plain_body(payload),
        date=_header(msg, "Date"),
        is_unread="UNREAD" in label_ids,
    )


def _resolve_list(
    client: GmailClient,
    list_response: dict[str, Any],
) -> list[Email]:
    messages = list_response.get("messages", [])
    result: list[Email] = []
    for m in messages:
        mid = m.get("id")
        if not mid:
            continue
        try:
            full = client.get_message_by_id(mid)
            result.append(_raw_to_email(full))
        except GmailAPIError:
            logger.warning("Skip message %s after API error", mid)
    return result


class MailService:
    """
    Mail use cases: inbox, sent, get-by-id, send, search.
    Depends on GmailClient; returns domain Email or structured results.
    """

    def __init__(self, client: GmailClient) -> None:
        self._client = client

    def get_profile(self) -> dict[str, Any]:
        """Return the authenticated user's profile (emailAddress, messagesTotal, etc.)."""
        return self._client.get_profile()

    def get_inbox(
        self,
        max_results: int = 100,
        page_token: str | None = None,
    ) -> tuple[list[Email], str | None]:
        """Return (emails, next_page_token)."""
        resp = self._client.get_inbox(max_results=max_results, page_token=page_token)
        emails = _resolve_list(self._client, resp)
        return emails, resp.get("nextPageToken")

    def get_sent(
        self,
        max_results: int = 100,
        page_token: str | None = None,
    ) -> tuple[list[Email], str | None]:
        """Return (emails, next_page_token)."""
        resp = self._client.get_sent(max_results=max_results, page_token=page_token)
        emails = _resolve_list(self._client, resp)
        return emails, resp.get("nextPageToken")

    def get_email_by_id(self, email_id: str) -> Email | None:
        """Return Email if found, else None. Logs and returns None on API error."""
        try:
            msg = self._client.get_message_by_id(email_id)
            return _raw_to_email(msg)
        except GmailAPIError as e:
            logger.warning("get_email_by_id %s failed: %s", email_id, e)
            return None

    def send_email(self, to: str, subject: str, body: str) -> dict[str, Any]:
        """Send email. Returns dict with id and threadId. Raises GmailAPIError on failure."""
        resp = self._client.send_email(to=to, subject=subject, body=body)
        return {"id": resp.get("id"), "threadId": resp.get("threadId")}

    def search_emails(
        self,
        query: str,
        max_results: int = 100,
        page_token: str | None = None,
    ) -> tuple[list[Email], str | None]:
        """Return (emails, next_page_token)."""
        resp = self._client.search_messages(
            query=query, max_results=max_results, page_token=page_token
        )
        emails = _resolve_list(self._client, resp)
        return emails, resp.get("nextPageToken")
