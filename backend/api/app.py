"""
FastAPI application: REST mail endpoints and Swagger. MailService injected via app state.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.exceptions import AssistantParsingError, GmailAPIError, LLMError
from models.email import Email
from services.assistant_service import AssistantService
from services.mail_service import MailService

# Pydantic models at module level so OpenAPI schema can resolve them (no ForwardRef)
class EmailModel(BaseModel):
    id: str
    sender: str
    subject: str
    snippet: str
    body: str
    date: str
    is_unread: bool


class GetInboxResponse(BaseModel):
    emails: list[EmailModel]
    next_page_token: str | None


class GetSentResponse(BaseModel):
    emails: list[EmailModel]
    next_page_token: str | None


class GetEmailByIdResponse(BaseModel):
    email: EmailModel | None
    found: bool


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


class SendEmailResponse(BaseModel):
    id: str
    thread_id: str


class SearchEmailsResponse(BaseModel):
    emails: list[EmailModel]
    next_page_token: str | None


class ProfileResponse(BaseModel):
    email_address: str


class AssistantMetadata(BaseModel):
    current_view: str | None = None
    current_email_id: str | None = None
    current_email_sender: str | None = None
    current_email_subject: str | None = None
    current_email_date: str | None = None


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AssistantRequest(BaseModel):
    message: str
    thread_id: str | None = None
    metadata: AssistantMetadata | None = None
    full_body: str | None = None
    chat_history: list[ChatMessage] | None = None
    # Legacy; prefer metadata
    current_view: str | None = None
    current_email_id: str | None = None


def create_app(
    mail_service: MailService,
    assistant_service: AssistantService | None = None,
) -> FastAPI:
    """Build FastAPI app with MailService and optional AssistantService. No global state."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield

    app = FastAPI(
        title="YouMail API",
        description="REST mail API and optional Assistant (natural language → action).",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.mail_service = mail_service
    app.state.assistant_service = assistant_service

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def _to_model(email: Email) -> EmailModel:
        return EmailModel(
            id=email.id,
            sender=email.sender,
            subject=email.subject,
            snippet=email.snippet,
            body=email.body,
            date=email.date,
            is_unread=email.is_unread,
        )

    async def _get_mail_service(request: Request) -> MailService:
        return request.app.state.mail_service

    # --- Routes ---
    @app.get("/profile", response_model=ProfileResponse)
    async def get_profile(request: Request):
        """Get the authenticated user's profile (email address)."""
        mail = await _get_mail_service(request)
        try:
            profile = mail.get_profile()
        except GmailAPIError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        return ProfileResponse(
            email_address=profile.get("emailAddress") or "",
        )

    @app.get("/inbox", response_model=GetInboxResponse)
    async def get_inbox(
        request: Request,
        max_results: int = 100,
        page_token: str | None = None,
    ):
        """List inbox emails."""
        mail = await _get_mail_service(request)
        emails, next_token = mail.get_inbox(
            max_results=max_results, page_token=page_token
        )
        return GetInboxResponse(
            emails=[_to_model(e) for e in emails],
            next_page_token=next_token,
        )

    @app.get("/sent", response_model=GetSentResponse)
    async def get_sent(
        request: Request,
        max_results: int = 100,
        page_token: str | None = None,
    ):
        """List sent emails."""
        mail = await _get_mail_service(request)
        emails, next_token = mail.get_sent(
            max_results=max_results, page_token=page_token
        )
        return GetSentResponse(
            emails=[_to_model(e) for e in emails],
            next_page_token=next_token,
        )

    @app.get("/emails/{email_id}", response_model=GetEmailByIdResponse)
    async def get_email_by_id(request: Request, email_id: str):
        """Get a single email by ID."""
        mail = await _get_mail_service(request)
        email = mail.get_email_by_id(email_id)
        if not email:
            return GetEmailByIdResponse(email=None, found=False)
        return GetEmailByIdResponse(email=_to_model(email), found=True)

    @app.post("/send", response_model=SendEmailResponse)
    async def send_email(request: Request, body: SendEmailRequest):
        """Send an email."""
        mail = await _get_mail_service(request)
        try:
            result = mail.send_email(
                to=body.to, subject=body.subject, body=body.body
            )
            return SendEmailResponse(
                id=result.get("id") or "",
                thread_id=result.get("threadId") or "",
            )
        except GmailAPIError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e

    @app.get("/search", response_model=SearchEmailsResponse)
    async def search_emails(
        request: Request,
        query: str,
        max_results: int = 100,
        page_token: str | None = None,
    ):
        """Search emails (Gmail query: from:x is:unread newer_than:7d)."""
        mail = await _get_mail_service(request)
        emails, next_token = mail.search_emails(
            query=query,
            max_results=max_results,
            page_token=page_token,
        )
        return SearchEmailsResponse(
            emails=[_to_model(e) for e in emails],
            next_page_token=next_token,
        )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.post("/assistant")
    async def assistant_process(request: Request, body: AssistantRequest):
        """
        Send a natural language message; returns one structured action (e.g. compose_email, search).
        Same as gRPC ProcessMessage. Requires OPENAI_API_KEY in .env.
        """
        assistant = request.app.state.assistant_service
        if assistant is None:
            raise HTTPException(
                status_code=503,
                detail="Assistant is disabled. Set HF_API_TOKEN in .env.",
            )
        try:
            meta = body.metadata
            current_view = meta.current_view if meta else body.current_view
            current_email_id = meta.current_email_id if meta else body.current_email_id
            current_email_sender = meta.current_email_sender if meta else None
            current_email_subject = meta.current_email_subject if meta else None
            current_email_date = meta.current_email_date if meta else None
            chat_history = [m.model_dump() for m in body.chat_history] if body.chat_history else None
            action = assistant.process_message(
                message=body.message,
                current_view=current_view,
                current_email_id=current_email_id,
                full_body=body.full_body,
                chat_history=chat_history,
                current_email_sender=current_email_sender,
                current_email_subject=current_email_subject,
                current_email_date=current_email_date,
            )
            return action.model_dump()
        except LLMError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        except AssistantParsingError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    return app
