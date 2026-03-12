"""
gRPC servicer: maps MailService (business) to proto messages. Transport only.
"""
from __future__ import annotations

from rpc.proto import mail_pb2, mail_pb2_grpc
from models.email import Email
from services.mail_service import MailService


def _email_to_proto(email: Email) -> mail_pb2.Email:
    return mail_pb2.Email(
        id=email.id,
        sender=email.sender,
        subject=email.subject,
        snippet=email.snippet,
        body=email.body,
        date=email.date,
        is_unread=email.is_unread,
    )


class MailServicer(mail_pb2_grpc.MailServiceServicer):
    """Exposes MailService over gRPC. MailService injected; no global state."""

    def __init__(self, mail_service: MailService) -> None:
        self._mail = mail_service

    def GetInbox(self, request, context):
        emails, next_token = self._mail.get_inbox(
            max_results=request.max_results or 100,
            page_token=request.page_token or None,
        )
        return mail_pb2.GetInboxResponse(
            emails=[_email_to_proto(e) for e in emails],
            next_page_token=next_token or "",
        )

    def GetSent(self, request, context):
        emails, next_token = self._mail.get_sent(
            max_results=request.max_results or 100,
            page_token=request.page_token or None,
        )
        return mail_pb2.GetSentResponse(
            emails=[_email_to_proto(e) for e in emails],
            next_page_token=next_token or "",
        )

    def GetEmailById(self, request, context):
        email = self._mail.get_email_by_id(request.email_id)
        if not email:
            return mail_pb2.GetEmailByIdResponse(found=False)
        return mail_pb2.GetEmailByIdResponse(
            email=_email_to_proto(email),
            found=True,
        )

    def SendEmail(self, request, context):
        result = self._mail.send_email(
            to=request.to,
            subject=request.subject,
            body=request.body,
        )
        return mail_pb2.SendEmailResponse(
            id=(result.get("id") or ""),
            thread_id=(result.get("threadId") or ""),
        )

    def SearchEmails(self, request, context):
        emails, next_token = self._mail.search_emails(
            query=request.query,
            max_results=request.max_results or 100,
            page_token=request.page_token or None,
        )
        return mail_pb2.SearchEmailsResponse(
            emails=[_email_to_proto(e) for e in emails],
            next_page_token=next_token or "",
        )
