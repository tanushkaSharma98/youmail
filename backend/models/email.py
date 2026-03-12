"""
Domain model for email. No transport or API details.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    """Normalized email representation. No Gmail-specific fields."""

    id: str
    sender: str
    subject: str
    snippet: str
    body: str
    date: str
    is_unread: bool
