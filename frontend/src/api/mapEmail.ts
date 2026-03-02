import type { InboxEmail } from "./mail";
import type { EmailItem } from "../components/EmailList";
import type { EmailDetailData } from "../components/EmailDetail";

/** Extract email from "Name <email@x.com>" or return sender as-is */
function senderEmail(sender: string): string {
  const m = sender.match(/<([^>]+)>/);
  return m ? m[1].trim() : sender;
}

/** Use backend date as display; optionally split date/time (Gmail often sends "Mon, 24 Oct 2023 10:30:00 +0000") */
function dateAndTime(dateStr: string): { date: string; time: string } {
  const s = dateStr.trim();
  const comma = s.indexOf(",");
  if (comma >= 0) {
    const datePart = s.slice(0, comma).trim();
    const rest = s.slice(comma + 1).trim();
    const space = rest.indexOf(" ");
    const timePart = space >= 0 ? rest.slice(0, space) : rest;
    return { date: datePart || s, time: timePart || "" };
  }
  return { date: s, time: "" };
}

export function inboxEmailToItem(e: InboxEmail): EmailItem {
  const { time } = dateAndTime(e.date);
  return {
    id: e.id,
    sender: e.sender,
    subject: e.subject,
    snippet: e.snippet,
    time: time || e.date,
    isUnread: e.is_unread,
  };
}

export function inboxEmailToDetail(e: InboxEmail): EmailDetailData {
  const { date, time } = dateAndTime(e.date);
  return {
    id: e.id,
    sender: e.sender,
    senderEmail: senderEmail(e.sender),
    to: "Me",
    toEmail: "",
    subject: e.subject,
    date,
    time,
    body: e.body,
  };
}
