import { Search, PenSquare } from "lucide-react";

export interface EmailItem {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  time: string;
  isUnread?: boolean;
}

interface EmailListProps {
  emails: EmailItem[];
  selectedId: string | null;
  onSelectEmail: (id: string) => void;
  onOpenCompose?: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  error?: string | null;
  listLabel?: string;
}

/**
 * Base layout panel. Search filters list (state in parent). No compose state.
 */
export function EmailList({
  emails,
  selectedId,
  onSelectEmail,
  onOpenCompose,
  searchQuery,
  onSearchChange,
  loading = false,
  error = null,
  listLabel = "Inbox",
}: EmailListProps) {
  return (
    <section className="w-[360px] shrink-0 flex flex-col min-h-0 border-r border-[#E5E7EB] bg-white">
      <div className="shrink-0 p-4 border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-[#111827] text-base">{listLabel}</h2>
          <button
            type="button"
            className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenCompose}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[#111827] text-sm font-medium hover:bg-[#F3F4F6] transition-colors"
        >
          <PenSquare className="w-4 h-4" />
          Compose
        </button>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-full border border-[#E5E7EB] bg-white text-[#111827] text-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-12 text-[#6B7280] text-sm">
            Loading {listLabel.toLowerCase()}…
          </div>
        )}
        {error && !loading && (
          <div className="p-4 text-red-600 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && emails.map((email) => {
          const isSelected = selectedId === email.id;
          return (
            <button
              key={email.id}
              type="button"
              onClick={() => onSelectEmail(email.id)}
              className={
                "w-full text-left px-4 py-4 border-b border-[#E5E7EB] transition-colors " +
                (isSelected
                  ? "bg-[#EFF6FF] border-l-4 border-l-[#2563EB] pl-[calc(1rem-4px)] rounded-r-lg"
                  : "hover:bg-[#F3F4F6] border-l-4 border-l-transparent")
              }
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm truncate flex-1 min-w-0 font-semibold text-[#111827]">
                  {email.sender}
                </span>
                <span className="text-xs text-[#6B7280] shrink-0">{email.time}</span>
              </div>
              <p className="mt-0.5 text-sm truncate font-medium text-[#111827]">
                {email.subject}
              </p>
              <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">{email.snippet}</p>
            </button>
          );
        })}
        {!loading && !error && emails.length === 0 && (
          <div className="flex items-center justify-center py-12 text-[#6B7280] text-sm">
            {listLabel === "Search results" ? "No emails found" : "No emails"}
          </div>
        )}
      </div>
    </section>
  );
}
