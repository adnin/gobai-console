let runtimeAuthToken = "";

export function setAuthToken(token: string | null | undefined) {
  runtimeAuthToken = token ? String(token) : "";
}

export function getAuthToken(): string {
  return runtimeAuthToken;
}
