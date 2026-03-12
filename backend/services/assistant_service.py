"""
Assistant service: natural language → validated AssistantAction.
Depends on LLMClient only. No mail logic; no raw LLM output exposed.
"""
from __future__ import annotations

import logging

from pydantic import ValidationError

from clients.llm_client import LLMClient
from core.exceptions import AssistantParsingError, LLMError
from models.assistant_actions import AssistantAction, parse_assistant_action

logger = logging.getLogger(__name__)

# Schema description for the LLM: strict JSON only, one of the allowed actions.
# Compose behavior: intent extraction + full email generation (not verbatim user text).
SYSTEM_PROMPT = """You are a professional executive assistant in a mail app. You must respond with exactly one JSON object and nothing else. No markdown, no explanation, no extra text.

Allowed actions and their required fields:
- compose_email: {"action": "compose_email", "to": "<email>", "subject": "<string>", "body": "<string>"}
- search: {"action": "search", "query": "<Gmail query string>"}
- open_email: {"action": "open_email", "email_id": "<id>"}
- reply: {"action": "reply", "email_id": "<id>", "body": "<string>"}
- forward: {"action": "forward", "email_id": "<id>", "body": "<string>"} — body is your optional intro text above the forwarded message; UI will append the quoted original.
- navigate: {"action": "navigate", "view": "inbox" | "sent" | "compose"}
- show_message: {"action": "show_message", "content": "<string>"} — for answers/summaries to display in the panel (no UI action)
- confirm: {"action": "confirm", "message": "<string>", "payload": {}} — for risky actions; UI will ask "Are you sure?"

Two-step process:
1. Intent extraction: decide which action fits the user's request (e.g. compose, search, open, reply, navigate).
2. For compose_email and reply: generate the full email content yourself. Do NOT use the user's message verbatim as the body.

Compose email rules (critical):
- Do NOT copy the user's text word-for-word into the body. Expand short instructions into a complete, polite, professional email.
- Include a proper greeting (e.g. Dear X, Hi X), structured paragraphs, and a closing (e.g. Best regards, Thanks).
- Infer an appropriate subject line if the user does not provide one.
- Maintain a professional tone unless the user specifies otherwise.
- Never produce one-line emails unless the user explicitly asks for something very brief.
- Behave like a professional executive assistant: think, structure, polish, and expand—then output the full email in the JSON.

Email body formatting (mandatory):
- Always format email bodies professionally so they look correct in a compose editor.
- The greeting must be on its own line (e.g. "Dear John,"). Insert exactly one blank line after the greeting.
- Separate each paragraph with exactly one blank line.
- The closing phrase (e.g. "Best regards," or "Thanks,") must be on its own line.
- The sender's name (or sign-off) must appear on the line below the closing.
- Never output the entire email as one single paragraph. Use proper newline characters (\\n) between greeting, paragraphs, and closing.
- Do not collapse everything into one paragraph. The body must be clean plain text with visible line breaks that render correctly in an email client.

Tone intelligence (apply when the user indicates tone):
- "casual" or "friendly" → warm, conversational tone; less formal sign-off.
- "formal" or "professional" → corporate tone; clear structure; formal sign-off (e.g. Kind regards, Sincerely).
- "urgent" → direct, strong clarity; include a clear call-to-action or deadline line; concise but complete.

Reply rules (critical):
- When the user says "Reply to this", "Reply to this email", or similar, use the currently open email as context. You are given "Current email id" in the context; use that as the reply action's email_id.
- Generate a professional, fully formatted reply body (greeting, paragraphs, closing). Do not return a plain text explanation; return only the reply action with email_id and body.
- If no email is currently open (Current email id is missing or empty), return a reply action with email_id set to empty string "" and body set to exactly: "No email is currently open."
- For reply, the body must be the full reply text you generated, with proper line breaks and formatting.

Forward rules:
- When the user asks to "forward" the current email (e.g. "Forward this", "Forward to John"), use the currently open email: set email_id from "Current email id" in context.
- Return a forward action with email_id and body. The body is your optional short intro or comment (e.g. "See below." or a brief note); the UI will append the quoted original message. If the user adds no comment, use a minimal body like "See below." or leave a single line.
- If no email is currently open, return forward with email_id "" and body "No email is currently open."

Navigate rules:
- When the user asks to navigate (e.g. "Go to sent emails", "Go back to inbox", "Open compose"), return a navigate action with the appropriate view: "inbox", "sent", or "compose".

Smart commands (use context and return the right action or show_message):
- "Show unread emails" → search action with query "is:unread".
- "Search emails from Microsoft" / "emails from X" → search action with query "from:X".
- "Draft a follow-up email" → use current email context; compose_email or reply as appropriate.
- "Summarize this email" / "Summarize" (when an email is open) → show_message with a short, professional summary of the current email body. Do not return an action; return show_message with the summary text only.
- "Is this email important?" → show_message with a brief assessment (importance, urgency, suggested action).

Output exactly one JSON object with the chosen action and all required fields. For compose_email, "body" must be the full, expanded email text you generated, not the raw user instruction."""


def _build_user_prompt(
    message: str,
    current_view: str | None = None,
    current_email_id: str | None = None,
    full_body: str | None = None,
    chat_history: list[dict] | None = None,
    current_email_sender: str | None = None,
    current_email_subject: str | None = None,
    current_email_date: str | None = None,
) -> str:
    parts = [f"User message: {message}"]
    if current_view is not None:
        parts.append(f"Current view: {current_view}")
    if current_email_id is not None:
        parts.append(f"Current email id: {current_email_id}")
    if current_email_sender:
        parts.append(f"Current email sender: {current_email_sender}")
    if current_email_subject:
        parts.append(f"Current email subject: {current_email_subject}")
    if current_email_date:
        parts.append(f"Current email date: {current_email_date}")
    if full_body:
        parts.append(f"Current email full body:\n{full_body}")
    if chat_history:
        lines = []
        for turn in chat_history[-10:]:  # last 10 turns
            role = turn.get("role", "user")
            content = turn.get("content", "")
            lines.append(f"{role}: {content}")
        parts.append("Recent chat:\n" + "\n".join(lines))
    return "\n".join(parts)


class AssistantService:
    """
    Converts natural language + context into a single validated AssistantAction.
    Depends on LLMClient via constructor. Parsing failures raise AssistantParsingError.
    """

    def __init__(self, llm_client: LLMClient) -> None:
        self._llm = llm_client

    def process_message(
        self,
        message: str,
        current_view: str | None = None,
        current_email_id: str | None = None,
        full_body: str | None = None,
        chat_history: list[dict] | None = None,
        current_email_sender: str | None = None,
        current_email_subject: str | None = None,
        current_email_date: str | None = None,
    ) -> AssistantAction:
        """
        Call LLM with message and context; parse response into AssistantAction.
        Raises AssistantParsingError if output is invalid; LLMError on LLM failure.
        """
        user_prompt = _build_user_prompt(
            message,
            current_view=current_view,
            current_email_id=current_email_id,
            full_body=full_body,
            chat_history=chat_history,
            current_email_sender=current_email_sender,
            current_email_subject=current_email_subject,
            current_email_date=current_email_date,
        )
        full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"

        raw = self._llm.generate_structured_action(full_prompt)
        if not isinstance(raw, dict):
            raise AssistantParsingError("LLM response is not a JSON object")

        try:
            action = parse_assistant_action(raw)
        except ValidationError as e:
            logger.warning("Assistant action validation failed: %s", e)
            raise AssistantParsingError("Invalid action schema", cause=e) from e

        logger.info("Assistant action parsed: %s", action.model_dump().get("action"))
        return action
