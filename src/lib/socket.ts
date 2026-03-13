import { io, Socket } from "socket.io-client";
import { ensureRequestId } from "@/lib/correlation";
import { emitSecurityEvent } from "@/lib/securityTelemetry";
import { getAuthToken } from "@/lib/tokenStore";

let socket: Socket | null = null;

type SocketConfig = {
  path: string;
  url: string;
};

function resolveSocketConfig(): SocketConfig {
  const envUrl = String((import.meta as any).env?.VITE_SOCKET_URL ?? "").trim();
  const envPath = String((import.meta as any).env?.VITE_SOCKET_PATH ?? "").trim();

  const url = envUrl || "http://localhost:3001";
  const path = envPath || "/socket.io";

  return { url, path };
}

/**
 * Web socket client for the realtime server (socket.io).
 * - Sends token in handshake auth.token
 * - Also emits "auth" on connect for backward compatibility
 */
export function getSocket() {
  if (socket) return socket;

  const { url, path } = resolveSocketConfig();

  socket = io(url, {
    autoConnect: true,
    path,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 10_000,
    transports: ["websocket", "polling"],
    auth: {
      token: getAuthToken() || "",
      rid: ensureRequestId(""),
    },
  });

  socket.on("connect", () => {
    const token = getAuthToken();
    if (!token) return;

    const rid = ensureRequestId("");
    (socket as any).auth = { token, rid };

    socket?.emit("auth", { token, rid }, () => {
      // ack ignored
    });
  });

  socket.on("connect_error", (err: any) => {
    emitSecurityEvent({
      rid: ensureRequestId(""),
      code: "socket_connect_error",
      source: "socket",
      detail: String(err?.message ?? "socket connection error"),
    });
  });

  return socket;
}

/**
 * Keep socket auth token in sync after login/token refresh.
 * Does not create a socket if none exists yet.
 */
export function syncSocketAuth() {
  try {
    if (!socket) return;

    const token = getAuthToken() || "";
    const rid = ensureRequestId("");
    (socket as any).auth = { token, rid };

    if (socket.connected && token) {
      socket.emit("auth", { token, rid });
    }
  } catch {
    // ignore socket sync failures
  }
}

/**
 * Hard reset socket instance (use on logout / account switch).
 */
export function resetSocket() {
  try {
    if (!socket) return;

    try {
      socket.removeAllListeners();
    } catch {
      // ignore
    }

    try {
      socket.disconnect();
    } catch {
      // ignore
    }

    socket = null;
  } catch {
    // ignore reset failures
  }
}
