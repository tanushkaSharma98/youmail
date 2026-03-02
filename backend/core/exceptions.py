"""
Domain and infrastructure exceptions. External API failures are wrapped here.
"""


class YouMailError(Exception):
    """Base for all application errors."""

    pass


class InvalidConfigError(YouMailError):
    """Raised when required configuration is missing or invalid."""

    pass


class GmailAPIError(YouMailError):
    """Raised when Gmail API call fails (auth, network, quota, etc.)."""

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


class LLMError(YouMailError):
    """Raised when LLM API call fails (timeout, API error, etc.)."""

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


class AssistantParsingError(YouMailError):
    """Raised when LLM output cannot be parsed into a valid AssistantAction."""

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause
