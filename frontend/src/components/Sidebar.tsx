import {
  Check,
  Inbox,
  PenSquare,
  Send,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface SidebarProps {
  composeOpen: boolean;
  mailView?: "inbox" | "sent";
  onOpenCompose?: () => void;
  onCloseCompose?: () => void;
  onNavigateView?: (view: "inbox" | "sent") => void;
  inboxUnreadCount?: number;
  userProfile?: { email_address: string } | null;
  profileLoading?: boolean;
  profileError?: boolean;
}

const menuItems = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "compose", label: "Compose", icon: PenSquare },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "spam", label: "Spam", icon: AlertTriangle },
];

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/\./g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim() || "User";
}

function initialsFromEmail(email: string): string {
  const name = displayNameFromEmail(email);
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export function Sidebar({
  composeOpen,
  mailView = "inbox",
  onOpenCompose,
  onCloseCompose,
  onNavigateView,
  inboxUnreadCount = 0,
  userProfile = null,
  profileLoading = false,
  profileError = false,
}: SidebarProps) {
  const displayName = userProfile?.email_address
    ? displayNameFromEmail(userProfile.email_address)
    : "User";
  const initials = userProfile?.email_address
    ? initialsFromEmail(userProfile.email_address)
    : "?";
  const emailAddress = profileLoading
    ? "Loading…"
    : profileError
      ? "Profile unavailable"
      : userProfile?.email_address ?? "—";

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col border-r border-[#E5E7EB] bg-[#F8FAFC]"
      style={{ minHeight: "100vh" }}
    >
      <div className="p-4 flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white">
          <Check className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[#111827] text-base">YouMail</span>
      </div>

      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isCompose = item.id === "compose";
          const isInbox = item.id === "inbox";
          const isSent = item.id === "sent";
          const active =
            isCompose
              ? composeOpen
              : isInbox
                ? !composeOpen && mailView === "inbox"
                : isSent
                  ? mailView === "sent"
                  : false;
          const showBadge = isInbox && !composeOpen && mailView === "inbox" && inboxUnreadCount > 0;
          const handleClick =
            isInbox && composeOpen
              ? onCloseCompose
              : isInbox && !composeOpen
                ? () => onNavigateView?.("inbox")
                : isSent
                  ? () => onNavigateView?.("sent")
                  : isCompose && !composeOpen
                    ? onOpenCompose
                    : undefined;
          return (
            <button
              key={item.id}
              type="button"
              onClick={handleClick}
              className={`
                flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors
                ${active
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#6B7280] hover:bg-[#F3F4F6]"
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className="w-5 h-5 shrink-0"
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="font-medium text-sm truncate">{item.label}</span>
              </div>
              {showBadge && (
                <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#2563EB] text-white text-xs font-medium flex items-center justify-center">
                  {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-[#111827] font-semibold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#111827] text-sm truncate">
              {displayName}
            </p>
            <p className="text-xs text-[#6B7280] truncate" title={emailAddress}>
              {emailAddress}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
