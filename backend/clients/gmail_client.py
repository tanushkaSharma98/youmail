"""
Gmail API client. Only transport: HTTP calls to Gmail API. No business logic.
"""
from __future__ import annotations

import base64
import logging
from email.mime.text import MIMEText
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from core.config import GmailConfig
from core.exceptions import GmailAPIError

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]

OAUTH_INSTALLED = {
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "redirect_uris": ["http://localhost"],
}


def _build_oauth_config(config: GmailConfig) -> dict[str, Any]:
    return {
        "installed": {
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            **OAUTH_INSTALLED,
        }
    }


def _load_or_refresh_credentials(config: GmailConfig) -> Credentials:
    creds: Credentials | None = None
    if config.token_path.exists():
        creds = Credentials.from_authorized_user_file(str(config.token_path), SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception as e:
            logger.warning("Token refresh failed, re-running OAuth flow: %s", e)
            creds = None

    if not creds:
        flow = InstalledAppFlow.from_client_config(
            _build_oauth_config(config), SCOPES
        )
        creds = flow.run_local_server(port=0)
        config.token_path.parent.mkdir(parents=True, exist_ok=True)
        with open(config.token_path, "w") as f:
            f.write(creds.to_json())
        logger.info("OAuth token saved to %s", config.token_path)

    return creds


class GmailClient:
    """
    Thin wrapper over Gmail API. Single responsibility: execute API calls.
    All config via GmailConfig; failures wrapped in GmailAPIError.
    """

    def __init__(self, config: GmailConfig) -> None:
        self._config = config
        self._creds = _load_or_refresh_credentials(config)
        self._service = build("gmail", "v1", credentials=self._creds)

    def get_profile(self) -> dict[str, Any]:
        """Get the authenticated user's profile (emailAddress, etc.)."""
        try:
            return self._service.users().getProfile(userId="me").execute()
        except Exception as e:
            raise GmailAPIError("get_profile failed", cause=e) from e

    def get_inbox(
        self,
        max_results: int = 100,
        page_token: str | None = None,
    ) -> dict[str, Any]:
        """List messages in INBOX. Returns raw list response."""
        try:
            params: dict[str, Any] = {
                "userId": "me",
                "labelIds": ["INBOX"],
                "maxResults": max_results,
            }
            if page_token:
                params["pageToken"] = page_token
            return self._service.users().messages().list(**params).execute()
        except Exception as e:
            raise GmailAPIError("get_inbox failed", cause=e) from e

    def get_sent(
        self,
        max_results: int = 100,
        page_token: str | None = None,
    ) -> dict[str, Any]:
        """List messages in SENT. Returns raw list response."""
        try:
            params = {
                "userId": "me",
                "labelIds": ["SENT"],
                "maxResults": max_results,
            }
            if page_token:
                params["pageToken"] = page_token
            return self._service.users().messages().list(**params).execute()
        except Exception as e:
            raise GmailAPIError("get_sent failed", cause=e) from e

    def get_message_by_id(self, message_id: str) -> dict[str, Any]:
        """Fetch a single message by ID. Returns raw message object."""
        try:
            return (
                self._service.users()
                .messages()
                .get(userId="me", id=message_id, format="full")
                .execute()
            )
        except Exception as e:
            raise GmailAPIError("get_message_by_id failed", cause=e) from e

    def send_email(self, to: str, subject: str, body: str) -> dict[str, Any]:
        """Send a message. Returns raw send response."""
        try:
            message = MIMEText(body)
            message["to"] = to
            message["subject"] = subject
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
            return (
                self._service.users()
                .messages()
                .send(userId="me", body={"raw": raw})
                .execute()
            )
        except Exception as e:
            raise GmailAPIError("send_email failed", cause=e) from e

    def search_messages(
        self,
        query: str,
        max_results: int = 100,
        page_token: str | None = None,
    ) -> dict[str, Any]:
        """Search with Gmail query (e.g. from:x is:unread). Returns raw list response."""
        try:
            params = {
                "userId": "me",
                "q": query,
                "maxResults": max_results,
            }
            if page_token:
                params["pageToken"] = page_token
            return self._service.users().messages().list(**params).execute()
        except Exception as e:
            raise GmailAPIError("search_messages failed", cause=e) from e
