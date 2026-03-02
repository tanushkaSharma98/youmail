import { useState, useRef, useEffect } from "react";
import { X, Send, Circle, Bot, Loader2 } from "lucide-react";
import type { AssistantMessage } from "../api/assistant";

interface AssistantPanelProps {
  messages: AssistantMessage[];
  onSend?: (text: string) => void;
  loading?: boolean;
  fullBodyEnabled?: boolean;
  onFullBodyChange?: (enabled: boolean) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Assistant chat panel. Renders thread messages and input.
 * Assistant returns structured actions; UI only displays them (no auto takeover).
 */
export function AssistantPanel({
  messages,
  onSend,
  loading = false,
  fullBodyEnabled = false,
  onFullBodyChange,
  inputRef: externalInputRef,
}: AssistantPanelProps) {
  const [input, setInput] = useState("");
  const internalInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !onSend || loading) return;
    onSend(text);
    setInput("");
  };

  return (
    <section className="w-[360px] shrink-0 flex flex-col min-h-0 border-l border-[#E5E7EB] bg-[#EFF6FF]">
      <div className="shrink-0 flex items-center justify-between gap-2 p-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-5 h-5 text-[#111827] shrink-0" />
          <div>
            <h2 className="font-bold text-[#111827] text-base truncate leading-tight">
              AI Assistant
            </h2>
            <span className="text-xs text-[#6B7280]">Always active</span>
          </div>
          <div className="flex items-center shrink-0 ml-1">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
          </div>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-sm text-[#6B7280]">Send a message to get started.</p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl rounded-tl-md px-4 py-3 bg-[#F3F4F6] text-[#6B7280] text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Assistant is thinking…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 p-4 border-t border-[#E5E7EB]">
        {onFullBodyChange && (
          <label className="flex items-center gap-2 mb-2 text-xs text-[#6B7280]">
            <input
              type="checkbox"
              checked={fullBodyEnabled}
              onChange={(e) => onFullBodyChange(e.target.checked)}
              className="rounded border-[#D1D5DB]"
            />
            Include full email body in context
          </label>
        )}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            id="assistant-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to draft, search or reply..."
            className="w-full pl-4 pr-12 py-2.5 rounded-full border border-[#E5E7EB] bg-white text-[#111827] text-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:opacity-70 disabled:cursor-not-allowed transition-opacity"
            disabled={loading}
            aria-busy={loading}
            aria-label="AI message input (⌘K to focus, ⌘↵ to send)"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                const t = input.trim();
                if (t && onSend && !loading) {
                  onSend(t);
                  setInput("");
                }
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-1 p-1.5 rounded-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:pointer-events-none transition-colors"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="mt-2 text-xs text-[#6B7280] text-center">
          AI can make mistakes. Check important info.
        </p>
        <p className="mt-1 text-xs text-[#9CA3AF] text-center">
          ⌘K focus · ⌘↵ send · Esc close compose
        </p>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "rounded-tr-md bg-[#2563EB] text-white"
            : "rounded-tl-md bg-[#F3F4F6] text-[#111827]"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.action && !isUser && (
          <div className="mt-2 pt-2 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
            Action: {message.action.action}
          </div>
        )}
      </div>
    </div>
  );
}
