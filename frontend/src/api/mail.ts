/**
 * Mail API client. Base URL from VITE_API_URL (default http://localhost:8000).
 */

const BASE = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "http://localhost:8000";

export interface InboxEmail {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  is_unread: boolean;
}

export interface InboxResponse {
  emails: InboxEmail[];
  next_page_token: string | null;
}

export interface EmailByIdResponse {
  email: InboxEmail | null;
  found: boolean;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResponse {
  id: string;
  thread_id: string;
}

export interface ProfileResponse {
  email_address: string;
}

export async function getProfile(): Promise<ProfileResponse> {
  return fetchJson<ProfileResponse>(`${BASE}/profile`);
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

export async function getInbox(params?: { max_results?: number; page_token?: string }): Promise<InboxResponse> {
  const sp = new URLSearchParams();
  if (params?.max_results != null) sp.set("max_results", String(params.max_results));
  if (params?.page_token) sp.set("page_token", params.page_token);
  const q = sp.toString();
  return fetchJson<InboxResponse>(`${BASE}/inbox${q ? `?${q}` : ""}`);
}

export type SentResponse = InboxResponse;

export async function getSent(params?: { max_results?: number; page_token?: string }): Promise<SentResponse> {
  const sp = new URLSearchParams();
  if (params?.max_results != null) sp.set("max_results", String(params.max_results));
  if (params?.page_token) sp.set("page_token", params.page_token);
  const q = sp.toString();
  return fetchJson<SentResponse>(`${BASE}/sent${q ? `?${q}` : ""}`);
}

export async function getEmailById(emailId: string): Promise<EmailByIdResponse> {
  return fetchJson<EmailByIdResponse>(`${BASE}/emails/${encodeURIComponent(emailId)}`);
}

export async function sendEmail(body: SendEmailRequest): Promise<SendEmailResponse> {
  return fetchJson<SendEmailResponse>(`${BASE}/send`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type SearchEmailsResponse = InboxResponse;

export async function searchEmails(
  query: string,
  params?: { max_results?: number; page_token?: string }
): Promise<SearchEmailsResponse> {
  const sp = new URLSearchParams({ query: query.trim() });
  if (params?.max_results != null) sp.set("max_results", String(params.max_results));
  if (params?.page_token) sp.set("page_token", params.page_token);
  return fetchJson<SearchEmailsResponse>(`${BASE}/search?${sp.toString()}`);
}
