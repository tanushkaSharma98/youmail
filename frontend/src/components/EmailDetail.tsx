import { Mail, Trash2, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";

/** Renders email body with line breaks and styled quoted block. */
function EmailBody({ body }: { body: string }) {
  const quotedMarker = "--- Original Message ---";
  const idx = body.indexOf(quotedMarker);
  const main = idx >= 0 ? body.slice(0, idx).trim() : body;
  const quoted = idx >= 0 ? body.slice(idx) : "";

  return (
    <div className="text-[#111827] text-sm leading-relaxed space-y-4">
      <div className="whitespace-pre-wrap break-words">{main}</div>
      {quoted && (
        <div
          className="pl-4 border-l-2 border-[#E5E7EB] text-[#6B7280] text-sm whitespace-pre-wrap break-words"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {quoted}
        </div>
      )}
    </div>
  );
}

export interface EmailDetailData {
  id: string;
  sender: string;
  senderEmail: string;
  to: string;
  toEmail: string;
  subject: string;
  date: string;
  time: string;
  body: string;
}

interface EmailDetailProps {
  email: EmailDetailData | null;
  onOpenReply?: () => void;
  loading?: boolean;
  error?: string | null;
}

export function EmailDetail({ email, onOpenReply, loading = false, error = null }: EmailDetailProps) {
  if (loading) {
    return (
      <section className="flex-1 flex flex-col min-w-0 bg-white border-r border-[#E5E7EB]">
        <div className="flex-1 flex items-center justify-center text-[#6B7280] text-sm">
          Loading…
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="flex-1 flex flex-col min-w-0 bg-white border-r border-[#E5E7EB]">
        <div className="flex-1 flex items-center justify-center p-4 text-red-600 text-sm">
          {error}
        </div>
      </section>
    );
  }
  if (!email) {
    return (
      <section className="flex-1 flex flex-col min-w-0 bg-white border-r border-[#E5E7EB]">
        <div className="flex-1 flex items-center justify-center text-[#6B7280] text-sm">
          Select an email
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col min-w-0 bg-white border-r border-[#E5E7EB] overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
            aria-label="Previous"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
            aria-label="Trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
            aria-label="More"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-sm text-[#6B7280]">
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            aria-label="Previous email"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>1 of 1,248</span>
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            aria-label="Next email"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-xl font-bold text-[#111827]">
            {email.subject}
          </h1>
        </div>

        <div className="px-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-[#111827] font-semibold text-sm shrink-0">
              {email.sender
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#111827] text-sm">
                {email.sender}
              </p>
              <p className="text-xs text-[#6B7280]">&lt;{email.senderEmail}&gt;</p>
              <p className="text-xs text-[#111827] mt-1">
                To: {email.to} &lt;{email.toEmail}&gt;
              </p>
            </div>
          </div>
          <div className="text-xs text-[#6B7280] shrink-0">
            {email.date} {email.time}
          </div>
        </div>

        <div className="px-6 py-6 max-w-[700px]">
          <EmailBody body={email.body} />
        </div>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onOpenReply}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors shadow-sm"
          >
            Reply
          </button>
        </div>
      </div>
    </section>
  );
}
