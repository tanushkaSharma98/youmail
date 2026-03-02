"""
Structured logging. Level and format driven by env; no print() in production paths.
"""
from __future__ import annotations

import logging
import os
import sys


LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.environ.get(
    "LOG_FORMAT",
    "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)


def setup_logging(
    level: str | None = None,
    format_string: str | None = None,
) -> None:
    """
    Configure root logger. Call once at application startup.
    """
    level = level or LOG_LEVEL
    format_string = format_string or LOG_FORMAT
    numeric = getattr(logging, level, None)
    if not isinstance(numeric, int):
        numeric = logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(format_string))

    root = logging.getLogger()
    root.setLevel(numeric)
    root.handlers.clear()
    root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a logger for the given module/component."""
    return logging.getLogger(name)
