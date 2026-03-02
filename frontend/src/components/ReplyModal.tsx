import { useEffect } from "react";
import { MoreVertical } from "lucide-react";
import type { EmailDetailData } from "./EmailDetail";

interface ReplyModalProps {
  email: EmailDetailData;
  onClose: () => void;
}

/** Normalize subject to exactly one "Re: " prefix (no Re: Re: Re:) */
function replySubject(subject: string): string {
  return "Re: " + subject.replace(/^Re:\s*/i, "").trim();
}

/**
 * Reply overlay modal. To prefilled from email sender, subject prefixed with Re:, body empty.
 * Rendered only when replyOpen === true.
 */
export function ReplyModal({ email, onClose }: ReplyModalProps) {
  const toPrefilled = `${email.sender} <${email.senderEmail}>`;
  const subjectPrefixed = replySubject(email.subject);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
        aria-modal
        aria-labelledby="reply-modal-title"
      >
        <div
          className="pointer-events-auto w-full max-w-[560px] max-h-[90vh] flex flex-col bg-white rounded-xl shadow-lg border border-[#E5E7EB] animate-compose-in"
          role="dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <span id="reply-modal-title" className="text-sm font-medium text-[#111827]">
              Reply
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">To:</label>
              <input
                type="text"
                defaultValue={toPrefilled}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-[#111827] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Subject:</label>
              <input
                type="text"
                defaultValue={subjectPrefixed}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Body</label>
              <textarea
                rows={10}
                placeholder="Your reply..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-[#111827] text-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-y min-h-[160px]"
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#F3F4F6] text-[#111827] text-sm font-medium hover:bg-[#E5E7EB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1d4ed8] transition-colors shadow-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
