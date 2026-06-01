const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export function getDocsRedirectUrl(topic: "sdk" | "gateway") {
  return `${API_BASE_URL}/docs/${topic}`;
}
