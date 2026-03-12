import { io, Socket } from "socket.io-client";
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
    withCredentials: true,
    auth: { token: getAuthToken() || "" },
  });

  socket.on("connect", () => {
    const token = getAuthToken();
    if (!token) return;

    (socket as any).auth = { token };

    socket?.emit("auth", { token }, () => {
      // ack ignored
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
    (socket as any).auth = { token };

    if (socket.connected && token) {
      socket.emit("auth", { token });
      return;
    }

    // Cookie-backed auth needs a fresh handshake after login/logout.
    if (socket.connected && !token) {
      socket.disconnect();
      socket.connect();
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
