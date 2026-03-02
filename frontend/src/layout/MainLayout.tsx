import { Sidebar } from "../components/Sidebar";
import { EmailList } from "../components/EmailList";
import { EmailDetail } from "../components/EmailDetail";
import { AssistantPanel } from "../components/AssistantPanel";
import type { EmailItem } from "../components/EmailList";
import type { EmailDetailData } from "../components/EmailDetail";
import type { AssistantMessage } from "../api/assistant";

interface MainLayoutProps {
  emails: EmailItem[];
  selectedEmailId: string | null;
  selectedEmailDetail: EmailDetailData | null;
  onSelectEmail: (id: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenCompose: () => void;
  onOpenReply: () => void;
  composeOpen: boolean;
  onCloseCompose: () => void;
  mailView?: "inbox" | "sent";
  onNavigateView?: (view: "inbox" | "sent") => void;
  inboxUnreadCount?: number;
  userProfile?: { email_address: string } | null;
  profileLoading?: boolean;
  profileError?: boolean;
  listLoading?: boolean;
  listError?: string | null;
  listLabel?: string;
  inboxLoading?: boolean;
  inboxError?: string | null;
  sentLoading?: boolean;
  sentError?: string | null;
  detailLoading?: boolean;
  detailError?: string | null;
  assistantMessages?: AssistantMessage[];
  onAssistantSend?: (text: string) => void;
  assistantLoading?: boolean;
  fullBodyEnabled?: boolean;
  onFullBodyChange?: (enabled: boolean) => void;
  assistantInputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Base layout only. Sidebar, EmailList, EmailDetail, AssistantPanel.
 * Compose and Reply are NOT rendered here; they are overlays in App.
 */
export function MainLayout({
  emails,
  selectedEmailId,
  selectedEmailDetail,
  onSelectEmail,
  searchQuery,
  onSearchChange,
  onOpenCompose,
  onOpenReply,
  composeOpen,
  onCloseCompose,
  mailView = "inbox",
  onNavigateView,
  inboxUnreadCount = 0,
  userProfile = null,
  profileLoading = false,
  profileError = false,
  listLoading,
  listError,
  listLabel,
  inboxLoading = false,
  inboxError = null,
  sentLoading = false,
  sentError = null,
  detailLoading = false,
  detailError = null,
  assistantMessages = [],
  onAssistantSend,
  assistantLoading = false,
  fullBodyEnabled = false,
  onFullBodyChange,
  assistantInputRef,
}: MainLayoutProps) {
  const listLoadingResolved = listLoading ?? (mailView === "inbox" ? inboxLoading : sentLoading);
  const listErrorResolved = listError ?? (mailView === "inbox" ? inboxError : sentError);
  const listLabelResolved = listLabel ?? (mailView === "inbox" ? "Inbox" : "Sent");

  return (
    <div className="h-screen flex w-full overflow-hidden bg-white transition-colors duration-200">
      <Sidebar
        composeOpen={composeOpen}
        mailView={mailView}
        onOpenCompose={onOpenCompose}
        onCloseCompose={onCloseCompose}
        onNavigateView={onNavigateView}
        inboxUnreadCount={inboxUnreadCount}
        userProfile={userProfile}
        profileLoading={profileLoading}
        profileError={profileError}
      />
      <EmailList
        emails={emails}
        selectedId={selectedEmailId}
        onSelectEmail={onSelectEmail}
        onOpenCompose={onOpenCompose}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        loading={listLoadingResolved}
        error={listErrorResolved}
        listLabel={listLabelResolved}
      />
      <EmailDetail
        email={selectedEmailDetail}
        onOpenReply={onOpenReply}
        loading={detailLoading}
        error={detailError}
      />
      <AssistantPanel
        messages={assistantMessages}
        onSend={onAssistantSend}
        loading={assistantLoading}
        fullBodyEnabled={fullBodyEnabled}
        onFullBodyChange={onFullBodyChange}
        inputRef={assistantInputRef}
      />
    </div>
  );
}
