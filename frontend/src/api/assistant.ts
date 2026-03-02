/**
 * Assistant API client. POST /assistant with threadId, metadata, fullBody, chatHistory.
 * Returns a single structured action; UI decides what to do (no auto takeover).
 */

const BASE =
  (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  "http://localhost:8000";

export interface AssistantMetadata {
  current_view?: string | null;
  current_email_id?: string | null;
  current_email_sender?: string | null;
  current_email_subject?: string | null;
  current_email_date?: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantRequestPayload {
  message: string;
  threadId: string;
  metadata: AssistantMetadata;
  fullBody?: string | null;
  chatHistory: ChatMessage[];
}

/** Single structured action returned by the backend (e.g. compose_email, search). */
export type AssistantAction =
  | { action: "compose_email"; to: string; subject: string; body: string }
  | { action: "search"; query: string }
  | { action: "open_email"; email_id: string }
  | { action: "reply"; email_id: string; body: string }
  | { action: "forward"; email_id: string; body: string }
  | { action: "navigate"; view: "inbox" | "sent" | "compose" }
  | { action: "show_message"; content: string }
  | { action: "confirm"; message: string; payload: Record<string, unknown> };

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  action?: AssistantAction;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function postAssistant(
  payload: AssistantRequestPayload
): Promise<AssistantAction> {
  const body = {
    message: payload.message,
    thread_id: payload.threadId,
    metadata: {
      current_view: payload.metadata.current_view ?? null,
      current_email_id: payload.metadata.current_email_id ?? null,
      current_email_sender: payload.metadata.current_email_sender ?? null,
      current_email_subject: payload.metadata.current_email_subject ?? null,
      current_email_date: payload.metadata.current_email_date ?? null,
    },
    full_body: payload.fullBody ?? null,
    chat_history: payload.chatHistory,
  };
  return fetchJson<AssistantAction>(`${BASE}/assistant`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
