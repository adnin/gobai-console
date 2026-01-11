export const LS_TOKEN = "dispatch_web_token";

export function getAuthToken(): string {
  try {
    return localStorage.getItem(LS_TOKEN) || "";
  } catch {
    return "";
  }
}
