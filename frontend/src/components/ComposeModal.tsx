import { useEffect, useState } from "react";
import { MoreVertical } from "lucide-react";

interface ComposeModalProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => Promise<void>;
}

/**
 * Compose overlay modal. Rendered only when composeOpen === true.
 * Prefill via initialTo/initialSubject/initialBody (e.g. from assistant); user confirms before send.
 */
export function ComposeModal({
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  onClose,
  onSend,
}: ComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  const handleSend = async () => {
    setSendError(null);
    setSending(true);
    try {
      await onSend(to.trim(), subject.trim(), body.trim());
      onClose();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

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
        aria-labelledby="compose-modal-title"
      >
        <div
          className="pointer-events-auto w-full max-w-[560px] max-h-[90vh] flex flex-col bg-white rounded-xl shadow-lg border border-[#E5E7EB] animate-compose-in"
          role="dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <span id="compose-modal-title" className="text-sm font-medium text-[#111827]">
              New message
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
            {sendError && (
              <div className="text-red-600 text-sm">{sendError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">To:</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipient"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Body</label>
              <textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Your message..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-[#111827] text-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-y min-h-[160px]"
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2.5 rounded-xl bg-[#F3F4F6] text-[#111827] text-sm font-medium hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1d4ed8] transition-colors shadow-sm disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
