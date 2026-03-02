import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "./layout/MainLayout";
import { ComposeModal } from "./components/ComposeModal";
import { ReplyModal } from "./components/ReplyModal";
import { getInbox, getSent, getEmailById, sendEmail, getProfile, searchEmails } from "./api/mail";
import { postAssistant } from "./api/assistant";
import type { AssistantAction, AssistantMessage } from "./api/assistant";
import { inboxEmailToItem, inboxEmailToDetail } from "./api/mapEmail";
import type { EmailItem } from "./components/EmailList";
import type { EmailDetailData } from "./components/EmailDetail";

function formatAssistantReply(action: AssistantAction): string {
  switch (action.action) {
    case "compose_email":
      return `I'll compose an email to ${action.to}: "${action.subject}".`;
    case "search":
      return `I'll search for: ${action.query}.`;
    case "open_email":
      return `I'll open that email.`;
    case "reply":
      return !action.email_id ? action.body : `I'll reply to that email.`;
    case "forward":
      return !action.email_id ? action.body : `I'll forward that email.`;
    case "navigate":
      return `I'll go to ${action.view}.`;
    case "show_message":
      return action.content;
    case "confirm":
      return action.message;
    default:
      return "Done.";
  }
}

function App() {
  const [inboxEmails, setInboxEmails] = useState<EmailItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<EmailDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [mailView, setMailView] = useState<"inbox" | "sent">("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composePrefill, setComposePrefill] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<EmailItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchLoadingRef = useRef(false);

  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentError, setSentError] = useState<string | null>(null);

  const [aiThreads, setAiThreads] = useState<Record<string, AssistantMessage[]>>({});
  const [currentThreadId] = useState<string>(() => crypto.randomUUID());
  const [fullBodyEnabled, setFullBodyEnabled] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);

  const [userProfile, setUserProfile] = useState<{ email_address: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const assistantInputRef = useRef<HTMLInputElement>(null);
  const inboxLoadingRef = useRef(inboxLoading);

  const fetchInbox = useCallback(async (setFirstAsSelected = false) => {
    setInboxLoading(true);
    setInboxError(null);
    try {
      const res = await getInbox({ max_results: 100 });
      const items = res.emails.map(inboxEmailToItem);
      setInboxEmails(items);
      if (setFirstAsSelected && items.length > 0) {
        setSelectedEmailId(items[0].id);
      }
    } catch (e) {
      setInboxError(e instanceof Error ? e.message : "Failed to load inbox");
      setInboxEmails([]);
    } finally {
      setInboxLoading(false);
    }
  }, []);

  const fetchSent = useCallback(async (setFirstAsSelected = false) => {
    setSentLoading(true);
    setSentError(null);
    try {
      const res = await getSent({ max_results: 100 });
      const items = res.emails.map(inboxEmailToItem);
      setSentEmails(items);
      if (setFirstAsSelected && items.length > 0) {
        setSelectedEmailId(items[0].id);
      }
    } catch (e) {
      setSentError(e instanceof Error ? e.message : "Failed to load sent");
      setSentEmails([]);
    } finally {
      setSentLoading(false);
    }
  }, []);

  const runSearchFromBackend = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    if (searchLoadingRef.current) return;
    searchLoadingRef.current = true;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await searchEmails(q, { max_results: 100 });
      setSearchResults(res.emails.map(inboxEmailToItem));
      setSearchError(null);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
      searchLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchInbox(true);
  }, [fetchInbox]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    const t = setTimeout(() => runSearchFromBackend(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery, runSearchFromBackend]);

  inboxLoadingRef.current = inboxLoading;

  useEffect(() => {
    if (mailView !== "inbox") return;
    const id = setInterval(() => {
      if (!inboxLoadingRef.current) fetchInbox(false);
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(id);
  }, [mailView, fetchInbox]);

  useEffect(() => {
    setProfileLoading(true);
    setProfileError(false);
    getProfile()
      .then((p) => {
        setUserProfile(p);
        setProfileError(false);
      })
      .catch(() => {
        setUserProfile(null);
        setProfileError(true);
      })
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEmailId) {
      setSelectedEmailDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    getEmailById(selectedEmailId)
      .then((res) => {
        if (cancelled) return;
        if (res.found && res.email) {
          setSelectedEmailDetail(inboxEmailToDetail(res.email));
        } else {
          setSelectedEmailDetail(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDetailError(e instanceof Error ? e.message : "Failed to load email");
          setSelectedEmailDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEmailId]);

  /** Parse Gmail-style search so "from:email" filters by sender, not literal "from:email". */
  const filterEmailsBySearch = useCallback(
    (emails: EmailItem[], query: string): EmailItem[] => {
      const raw = query.trim();
      if (!raw) return emails;
      const q = raw.toLowerCase();

      const fromMatch = q.match(/^from:\s*(.+)$/);
      if (fromMatch) {
        const value = fromMatch[1]!.trim().toLowerCase();
        return emails.filter((e) => e.sender.toLowerCase().includes(value));
      }

      const subjectMatch = q.match(/^subject:\s*(.+)$/);
      if (subjectMatch) {
        const value = subjectMatch[1]!.trim().toLowerCase();
        return emails.filter((e) => e.subject.toLowerCase().includes(value));
      }

      if (q === "is:unread") {
        return emails.filter((e) => e.isUnread);
      }

      return emails.filter(
        (e) =>
          e.sender.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.snippet.toLowerCase().includes(q)
      );
    },
    []
  );

  const filteredInboxEmails = useMemo(
    () => filterEmailsBySearch(inboxEmails, searchQuery),
    [inboxEmails, searchQuery, filterEmailsBySearch]
  );

  const filteredSentEmails = useMemo(
    () => filterEmailsBySearch(sentEmails, searchQuery),
    [sentEmails, searchQuery, filterEmailsBySearch]
  );

  const displayedEmails =
    searchResults !== null
      ? searchResults
      : mailView === "inbox"
        ? filteredInboxEmails
        : filteredSentEmails;

  const listLoading =
    searchResults !== null ? searchLoading : mailView === "inbox" ? inboxLoading : sentLoading;
  const listError =
    searchResults !== null ? searchError : mailView === "inbox" ? inboxError : sentError;
  const listLabel =
    searchResults !== null ? "Search results" : mailView === "inbox" ? "Inbox" : "Sent";

  const inboxUnreadCount = useMemo(
    () => inboxEmails.filter((e) => e.isUnread).length,
    [inboxEmails]
  );

  useEffect(() => {
    const ids = new Set(displayedEmails.map((e) => e.id));
    if (selectedEmailId && !ids.has(selectedEmailId)) {
      setSelectedEmailId(displayedEmails[0]?.id ?? null);
    }
  }, [displayedEmails, selectedEmailId]);

  useEffect(() => {
    if (mailView === "sent") fetchSent(true);
  }, [mailView, fetchSent]);

  useEffect(() => {
    const open = composeOpen || replyOpen;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [composeOpen, replyOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        assistantInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleComposeSend = useCallback(
    async (to: string, subject: string, body: string) => {
      await sendEmail({ to, subject, body });
      setComposeOpen(false);
      await fetchInbox(false);
      setToast("Email sent successfully");
    },
    [fetchInbox]
  );

  const currentView = composeOpen ? "compose" : mailView;

  /** Build "Re: " subject without duplicating Re: */
  const replySubject = useCallback((subject: string) => {
    return "Re: " + subject.replace(/^Re:\s*/i, "").trim();
  }, []);

  /** Build "Fwd: " subject without duplicating Fwd: */
  const fwdSubject = useCallback((subject: string) => {
    return "Fwd: " + subject.replace(/^Fwd:\s*/i, "").trim();
  }, []);

  /** Apply assistant action in the UI only. Returns error message to show in thread if something went wrong (e.g. email not found). */
  const applyAssistantAction = useCallback(
    (action: AssistantAction): string | null => {
      if (action.action === "compose_email") {
        setComposePrefill({ to: action.to, subject: action.subject, body: action.body });
        setComposeOpen(true);
        setToast("Draft ready in compose");
      } else if (action.action === "search") {
        setSearchQuery(action.query);
      } else if (action.action === "open_email") {
        const found = displayedEmails.some((e) => e.id === action.email_id);
        if (found) {
          setSelectedEmailId(action.email_id);
        } else {
          return "That email couldn't be found in the current list.";
        }
      } else if (action.action === "reply") {
        if (!action.email_id) {
          return null;
        }
        const email = inboxEmails.find((e) => e.id === action.email_id);
        if (!email) {
          return "That email couldn't be found. It may be from another folder.";
        }
        let body = action.body;
        if (selectedEmailDetail?.id === action.email_id) {
          body +=
            "\n\n--- Original Message ---\n" +
            `From: ${selectedEmailDetail.sender}\n` +
            `Date: ${selectedEmailDetail.date} ${selectedEmailDetail.time}\n` +
            `Subject: ${selectedEmailDetail.subject}\n\n` +
            selectedEmailDetail.body;
        }
        setComposePrefill({
          to: email.sender,
          subject: replySubject(email.subject),
          body,
        });
        setComposeOpen(true);
        setToast("Draft ready in compose");
      } else if (action.action === "navigate") {
        if (action.view === "inbox") setMailView("inbox");
        else if (action.view === "sent") setMailView("sent");
        else if (action.view === "compose") {
          setComposePrefill(null);
          setComposeOpen(true);
        }
      } else if (action.action === "forward") {
        // Forward is handled async in handleAssistantSend (may need to fetch email by ID).
      } else if (action.action === "show_message") {
        // Content already shown in the assistant message; no UI action.
      } else if (action.action === "confirm") {
        setToast("Are you sure? Check the message above.");
      }
      return null;
    },
    [inboxEmails, selectedEmailDetail, replySubject, displayedEmails]
  );

  const handleAssistantSend = useCallback(
    async (text: string) => {
      const threadId = currentThreadId;
      const messages = aiThreads[threadId] ?? [];
      const userMsg: AssistantMessage = { role: "user", content: text };
      setAiThreads((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), userMsg],
      }));
      setAssistantLoading(true);
      try {
        const action = await postAssistant({
          message: text,
          threadId,
          metadata: {
            current_view: currentView,
            current_email_id: selectedEmailId ?? null,
            current_email_sender: selectedEmailDetail?.sender ?? null,
            current_email_subject: selectedEmailDetail?.subject ?? null,
            current_email_date: selectedEmailDetail ? `${selectedEmailDetail.date} ${selectedEmailDetail.time}`.trim() : null,
          },
          fullBody: fullBodyEnabled && selectedEmailDetail ? selectedEmailDetail.body : null,
          chatHistory: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        });
        const assistantContent = formatAssistantReply(action);
        const actionError = applyAssistantAction(action);
        const content = actionError ?? assistantContent;
        const assistantMsg: AssistantMessage = { role: "assistant", content, action: actionError ? undefined : action };
        setAiThreads((prev) => ({
          ...prev,
          [threadId]: [...(prev[threadId] ?? []), assistantMsg],
        }));
        if (action.action === "search") runSearchFromBackend(action.query);
        if (action.action === "forward" && action.email_id) {
          let emailDetail: EmailDetailData | null =
            selectedEmailDetail?.id === action.email_id ? selectedEmailDetail : null;
          if (!emailDetail) {
            try {
              const res = await getEmailById(action.email_id);
              if (res.found && res.email) emailDetail = inboxEmailToDetail(res.email);
            } catch {
              /* ignore */
            }
          }
          if (emailDetail) {
            const quoted =
              "\n\n--- Forwarded Message ---\n" +
              `From: ${emailDetail.sender}\n` +
              `Date: ${emailDetail.date} ${emailDetail.time}\n` +
              `Subject: ${emailDetail.subject}\n\n` +
              emailDetail.body;
            const body = action.body.trim() ? action.body + quoted : quoted.trim();
            setComposePrefill({
              to: "",
              subject: fwdSubject(emailDetail.subject),
              body,
            });
            setComposeOpen(true);
            setToast("Draft ready in compose");
          } else {
            setAiThreads((prev) => {
              const thread = prev[threadId] ?? [];
              const last = thread[thread.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return {
                ...prev,
                [threadId]: [...thread.slice(0, -1), { ...last, content: "That email couldn't be found." }],
              };
            });
          }
        }
      } catch (e) {
        const rawMsg = e instanceof Error ? e.message : "Assistant request failed";
        const friendlyMsg =
          rawMsg.toLowerCase().includes("no email") || rawMsg.includes("currently open")
            ? "No email is currently selected."
            : rawMsg.toLowerCase().includes("502") || rawMsg.toLowerCase().includes("503")
              ? "Service temporarily unavailable. Please try again."
              : "Something went wrong. Please try again.";
        const assistantMsg: AssistantMessage = {
          role: "assistant",
          content: friendlyMsg,
        };
        setAiThreads((prev) => ({
          ...prev,
          [threadId]: [...(prev[threadId] ?? []), assistantMsg],
        }));
      } finally {
        setAssistantLoading(false);
      }
    },
    [
      currentThreadId,
      aiThreads,
      fullBodyEnabled,
      selectedEmailDetail,
      selectedEmailId,
      currentView,
      applyAssistantAction,
      runSearchFromBackend,
      fwdSubject,
    ]
  );

  return (
    <>
      <MainLayout
        emails={displayedEmails}
        selectedEmailId={selectedEmailId}
        selectedEmailDetail={detailLoading ? null : selectedEmailDetail}
        onSelectEmail={setSelectedEmailId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCompose={() => { setComposePrefill(null); setComposeOpen(true); }}
        onOpenReply={() => setReplyOpen(true)}
        composeOpen={composeOpen}
        onCloseCompose={() => setComposeOpen(false)}
        mailView={mailView}
        onNavigateView={setMailView}
        inboxUnreadCount={inboxUnreadCount}
        userProfile={userProfile}
        profileLoading={profileLoading}
        profileError={profileError}
        listLoading={listLoading}
        listError={listError}
        listLabel={listLabel}
        inboxLoading={inboxLoading}
        inboxError={inboxError}
        sentLoading={sentLoading}
        sentError={sentError}
        detailLoading={detailLoading}
        detailError={detailError}
        assistantMessages={aiThreads[currentThreadId] ?? []}
        onAssistantSend={handleAssistantSend}
        assistantLoading={assistantLoading}
        fullBodyEnabled={fullBodyEnabled}
        onFullBodyChange={setFullBodyEnabled}
        assistantInputRef={assistantInputRef}
      />

      {composeOpen && (
        <ComposeModal
          key={composePrefill ? `prefill-${composePrefill.to}-${composePrefill.subject}` : "compose"}
          initialTo={composePrefill?.to ?? ""}
          initialSubject={composePrefill?.subject ?? ""}
          initialBody={composePrefill?.body ?? ""}
          onClose={() => { setComposeOpen(false); setComposePrefill(null); }}
          onSend={handleComposeSend}
        />
      )}
      {replyOpen && selectedEmailDetail && (
        <ReplyModal
          key={selectedEmailDetail.id}
          email={selectedEmailDetail}
          onClose={() => setReplyOpen(false)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl bg-[#111827] text-white text-sm shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </>
  );
}

export default App;
